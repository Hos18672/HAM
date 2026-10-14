import { ALLOWED_UPLOAD_MIME, MAX_UPLOAD_BYTES } from './validation/content';

/**
 * The browser side of an upload: shrink, send, and say what went wrong.
 *
 * A phone photo is often 4–12 MB and 4000+ pixels wide, while the host's
 * functions accept a request of about 6 MB and the site never shows an image
 * wider than about 2400 pixels. So a large JPEG, PNG or WebP is redrawn at
 * that size before it is sent. GIFs are sent as they are (redrawing one would
 * stop its animation), and so is anything already small.
 */

const MAX_EDGE = 2400;
const SHRINK_ABOVE = 1.5 * 1024 * 1024;
/** What the host will take in one request, with room for the form around it. */
const SEND_LIMIT = 5.5 * 1024 * 1024;

/**
 * Whether this browser hands back what was drawn. Brave, Firefox with
 * fingerprinting resistance and canvas-blocking extensions add noise to
 * every read of a canvas — a defence against tracking that turns a redrawn
 * photo into coloured static. A known pattern drawn and read back must come
 * out exactly; if it does not, photos are sent as they are.
 */
let canvasTrusted: boolean | null = null;
function canvasIsTrustworthy(): boolean {
  if (canvasTrusted !== null) return canvasTrusted;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return (canvasTrusted = false);
    context.fillStyle = 'rgb(10, 120, 200)';
    context.fillRect(0, 0, 16, 16);
    context.fillStyle = 'rgb(250, 240, 20)';
    context.fillRect(8, 0, 8, 16);
    const { data } = context.getImageData(0, 0, 16, 16);
    canvasTrusted = true;
    for (let i = 0; i < data.length; i += 4) {
      const right = (i / 4) % 16 >= 8;
      const [r, g, b] = right ? [250, 240, 20] : [10, 120, 200];
      if (data[i] !== r || data[i + 1] !== g || data[i + 2] !== b || data[i + 3] !== 255) {
        canvasTrusted = false;
        break;
      }
    }
  } catch {
    canvasTrusted = false;
  }
  return canvasTrusted;
}

export async function shrinkImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  if (!canvasIsTrustworthy()) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= SHRINK_ABOVE) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // A PNG keeps its transparency as WebP; a photo becomes a JPEG.
  const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  if (!blob || blob.size >= file.size) return file;
  const name = file.name.replace(/\.[^.]+$/, '') + (type === 'image/jpeg' ? '.jpg' : '.webp');
  return new File([blob], name, { type, lastModified: file.lastModified });
}

const REASONS: Record<string, string> = {
  'bad-type': 'Dieses Dateiformat wird nicht unterstützt (JPEG, PNG, WebP, AVIF oder GIF).',
  'too-large': 'Die Datei ist zu groß.',
  'not-configured':
    'Der Dateispeicher ist nicht eingerichtet: SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY fehlen.',
  'bad-key':
    'Der Dateispeicher lehnt den Schlüssel ab: SUPABASE_SERVICE_ROLE_KEY muss der „service_role“-Schlüssel sein.',
  unauthenticated: 'Sie sind nicht mehr angemeldet. Bitte melden Sie sich neu an.',
};

/** Why a file cannot be sent at all, before it is sent; null when it can. */
export function precheck(file: File): string | null {
  if (!(ALLOWED_UPLOAD_MIME as readonly string[]).includes(file.type)) return REASONS['bad-type']!;
  if (file.size > MAX_UPLOAD_BYTES * 2) return 'Die Datei ist größer als 16 MB.';
  return null;
}

export type UploadOutcome = { ok: true; id: string; url: string } | { ok: false; reason: string };

/** Shrink and send one image; on failure, a sentence an editor can act on. */
export async function sendImage(
  file: File,
  fields: Record<string, string> = {},
): Promise<UploadOutcome> {
  const blocked = precheck(file);
  if (blocked) return { ok: false, reason: blocked };

  const small = await shrinkImage(file);
  if (small.size > Math.min(SEND_LIMIT, MAX_UPLOAD_BYTES)) {
    return {
      ok: false,
      reason:
        small === file
          ? 'Die Datei ist größer als 5 MB, und dieser Browser lässt sie nicht verkleinern (Datenschutz-Einstellung). Bitte ein kleineres Bild wählen oder einen anderen Browser verwenden.'
          : 'Die Datei ist auch verkleinert noch größer als 5 MB.',
    };
  }

  const form = new FormData();
  form.set('file', small);
  for (const [key, value] of Object.entries(fields)) form.set(key, value);

  let response: Response;
  try {
    response = await fetch('/api/upload', { method: 'POST', body: form });
  } catch {
    return { ok: false, reason: 'Keine Verbindung zum Server.' };
  }
  const body = (await response.json().catch(() => null)) as {
    id?: string;
    url?: string;
    error?: string;
    detail?: string;
  } | null;

  if (response.ok && body?.id && body.url) return { ok: true, id: body.id, url: body.url };
  if (response.status === 413) return { ok: false, reason: REASONS['too-large']! };
  const code = body?.error ?? `HTTP ${response.status}`;
  const reason =
    REASONS[code] ??
    `Der Upload ist fehlgeschlagen (${code}${body?.detail ? `: ${body.detail}` : ''}).`;
  return { ok: false, reason };
}
