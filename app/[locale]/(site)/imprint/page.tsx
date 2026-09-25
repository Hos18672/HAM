import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireLocale } from '@/lib/i18n/locale-param';
import { getPageHeader, getSettings } from '@/lib/db/queries/content';
import { PageHead } from '@/components/site/page-head';
import { pageMetadata } from '@/lib/page-meta';
import { ASSOCIATION } from '@/lib/db/seed-data';
import { locales } from '@/lib/i18n/config';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { ...(await pageMetadata('imprint', locale, '/imprint')), robots: { index: false } };
}

/**
 * Impressum. Austria's Unternehmensgesetzbuch §14 and the E-Commerce-Gesetz §5
 * require a registered association to name itself, its ZVR number, its seat,
 * its representative body, a means of contact and the purpose of the site.
 */
export default async function ImprintPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const typed = requireLocale(locale);

  const [header, settings] = await Promise.all([getPageHeader('imprint', typed), getSettings()]);
  if (!header) notFound();

  const t = await getTranslations({ locale, namespace: 'footer' });
  const de = typed === 'de';

  const rows: [string, React.ReactNode][] = [
    [
      de ? 'Medieninhaber und Herausgeber' : 'صاحب امتیاز و ناشر',
      de ? ASSOCIATION.nameDe : ASSOCIATION.nameFa,
    ],
    [
      de ? 'Rechtsform' : 'شکل حقوقی',
      de
        ? 'Verein nach dem Vereinsgesetz 2002'
        : 'انجمن ثبت‌شده بر پایهٔ قانون انجمن‌های اتریش ۲۰۰۲',
    ],
    [
      t('zvr'),
      <span key="zvr" className="ltr-island">
        {ASSOCIATION.zvr}
      </span>,
    ],
    [
      de ? 'Sitz' : 'نشانی',
      <span key="seat" className="ltr-island">
        {settings.address || `${ASSOCIATION.street}, ${ASSOCIATION.postcode} ${ASSOCIATION.city}`}
      </span>,
    ],
    [
      de ? 'Vertretungsbefugtes Organ' : 'نمایندهٔ قانونی',
      de
        ? 'Der Vorstand, vertreten durch die Obfrau bzw. den Obmann'
        : 'هیئت مدیره، به نمایندگی رئیس انجمن',
    ],
    [
      de ? 'Kontakt' : 'تماس',
      <span key="contact" className="ltr-island">
        {settings.contactEmail}
        {settings.phone ? ` · ${settings.phone}` : ''}
      </span>,
    ],
    [
      de ? 'Vereinszweck' : 'هدف انجمن',
      de
        ? 'Gemeinnützige Kultur-, Bildungs-, Sport- und Sozialarbeit. Der Verein ist nicht auf Gewinn ausgerichtet.'
        : 'کار فرهنگی، آموزشی، ورزشی و اجتماعی غیرانتفاعی. انجمن هدف سودآوری ندارد.',
    ],
    [
      de ? 'Aufsichtsbehörde' : 'مرجع نظارتی',
      de
        ? 'Vereinsbehörde: Landespolizeidirektion Wien'
        : 'ادارهٔ انجمن‌ها: ادارهٔ کل پلیس ایالتی وین',
    ],
  ];

  return (
    <>
      <PageHead header={header} locale={typed} />
      <section className="section" data-rise>
        <div className="page">
          <dl
            style={{
              display: 'grid',
              gap: 'var(--space-4)',
              maxInlineSize: 'var(--measure)',
              margin: 0,
            }}
          >
            {rows.map(([label, value]) => (
              <div key={label} style={{ display: 'grid', gap: 'var(--space-1)' }}>
                <dt className="kicker">{label}</dt>
                <dd style={{ margin: 0, fontSize: 'var(--text-sm)' }}>{value}</dd>
              </div>
            ))}
          </dl>

          <div
            className="prose"
            style={{ marginBlockStart: 'var(--space-6)', maxInlineSize: 'var(--measure)' }}
          >
            <h2 style={{ fontSize: 'var(--text-xl)' }}>
              {de ? 'Online-Streitbeilegung' : 'حل اختلاف آنلاین'}
            </h2>
            <p>
              {de
                ? 'Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit. Wir sind weder verpflichtet noch bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.'
                : 'کمیسیون اروپا سامانه‌ای برای حل اختلاف آنلاین فراهم کرده است. ما نه موظف و نه مایل به شرکت در روند داوری نزد مرجع حل اختلاف مصرف‌کنندگان هستیم.'}
            </p>
            <p>
              <a
                href="https://ec.europa.eu/consumers/odr"
                target="_blank"
                rel="noopener noreferrer"
                className="ltr-island"
              >
                ec.europa.eu/consumers/odr
              </a>
            </p>

            <h2 style={{ fontSize: 'var(--text-xl)', marginBlockStart: 'var(--space-5)' }}>
              {de ? 'Haftung für Inhalte' : 'مسئولیت محتوا'}
            </h2>
            <p>
              {de
                ? 'Die Inhalte dieser Seiten werden mit Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität können wir keine Gewähr übernehmen. Für die Inhalte verlinkter externer Seiten sind deren Betreiber verantwortlich.'
                : 'محتوای این صفحات با دقت تهیه می‌شود. مسئولیتی در قبال درستی، کامل بودن و به‌روز بودن آن نمی‌پذیریم. مسئولیت محتوای پیوندهای بیرونی بر عهدهٔ گردانندگان آن‌هاست.'}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
