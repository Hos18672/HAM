import 'server-only';
import { Resend } from 'resend';

/**
 * Notification email via Resend.
 *
 * A failure here must never lose a submission: the row is written to the
 * database first, and the mail is a courtesy on top. So every function in this
 * file returns rather than throws, and logs what went wrong.
 */

let client: Resend | null = null;

function resend(): Resend | null {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  client = new Resend(key);
  return client;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.CONTACT_TO_EMAIL);
}

export interface SubmissionMail {
  kind: 'contact' | 'membership' | 'donation' | 'volunteer';
  name: string;
  email: string;
  phone?: string;
  topic?: string;
  message?: string;
  locale: string;
}

const KIND_LABEL: Record<SubmissionMail['kind'], string> = {
  contact: 'Kontaktanfrage',
  membership: 'Mitgliedschaftsanfrage',
  donation: 'Spendenanfrage',
  volunteer: 'Anfrage zur Mitarbeit',
};

/** Escape for the HTML body. The values are visitor input. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendSubmissionNotification(submission: SubmissionMail): Promise<boolean> {
  const to = process.env.CONTACT_TO_EMAIL;
  const service = resend();
  if (!service || !to) {
    console.info('[email] not configured — submission stored but no notification sent');
    return false;
  }

  const label = KIND_LABEL[submission.kind];
  const rows: [string, string][] = [
    ['Name', submission.name],
    ['E-Mail', submission.email],
    ...(submission.phone ? ([['Telefon', submission.phone]] as [string, string][]) : []),
    ...(submission.topic ? ([['Anliegen', submission.topic]] as [string, string][]) : []),
    ['Sprache', submission.locale === 'fa' ? 'فارسی' : 'Deutsch'],
  ];

  try {
    const { error } = await service.emails.send({
      // The site's own domain must be verified in Resend; until it is, Resend
      // only delivers to the account owner, which is fine for a first run.
      from: 'Haus aller Menschen <onboarding@resend.dev>',
      to: [to],
      // Replying goes straight to the person who wrote in.
      replyTo: submission.email,
      subject: `${label}: ${submission.name}`,
      html: `
        <h2 style="font-family:Georgia,serif">${escapeHtml(label)}</h2>
        <table style="font-family:Georgia,serif;border-collapse:collapse">
          ${rows
            .map(
              ([key, value]) =>
                `<tr><th align="left" style="padding:4px 12px 4px 0;vertical-align:top">${escapeHtml(
                  key,
                )}</th><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`,
            )
            .join('')}
        </table>
        ${
          submission.message
            ? `<p style="font-family:Georgia,serif;white-space:pre-wrap">${escapeHtml(
                submission.message,
              )}</p>`
            : ''
        }
      `,
    });

    if (error) {
      console.error('[email] send failed', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[email] send threw', error);
    return false;
  }
}
