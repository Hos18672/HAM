import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ALLOWED_UPLOAD_MIME, MAX_UPLOAD_BYTES } from './validation/content';

/**
 * Media storage on Supabase — the same account as the database, so uploads add
 * no extra service, no extra bill and no extra processor to disclose.
 */

let client: SupabaseClient | null = null;

function storage(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — uploads are unavailable.',
    );
  }
  // The service-role key bypasses row level security, so this client must
  // never be constructed anywhere the bundle can reach the browser.
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export function isStorageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export interface UploadResult {
  url: string;
  key: string;
  mime: string;
  size: number;
}

export interface UploadError {
  error: 'too-large' | 'bad-type' | 'not-configured' | 'failed';
}

const bucket = () => process.env.SUPABASE_STORAGE_BUCKET ?? 'media';

/** Slug-safe object key: a date prefix keeps the bucket browsable by hand. */
function objectKey(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? 'bin';
  const stem = filename
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const date = new Date().toISOString().slice(0, 10);
  return `${date}/${stem || 'bild'}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
}

export async function uploadImage(file: File): Promise<UploadResult | UploadError> {
  if (!isStorageConfigured()) return { error: 'not-configured' };

  // Both checks run again here even though the client checked them: a client
  // check is a courtesy, and this is the boundary.
  if (file.size > MAX_UPLOAD_BYTES) return { error: 'too-large' };
  if (!(ALLOWED_UPLOAD_MIME as readonly string[]).includes(file.type)) return { error: 'bad-type' };

  const key = objectKey(file.name || 'bild');

  try {
    const bytes = await file.arrayBuffer();
    const { error } = await storage()
      .storage.from(bucket())
      .upload(key, bytes, { contentType: file.type, upsert: false, cacheControl: '31536000' });

    if (error) {
      console.error('[storage] upload failed', error);
      return { error: 'failed' };
    }

    const { data } = storage().storage.from(bucket()).getPublicUrl(key);
    return { url: data.publicUrl, key, mime: file.type, size: file.size };
  } catch (error) {
    console.error('[storage] upload threw', error);
    return { error: 'failed' };
  }
}

export async function deleteImage(key: string): Promise<boolean> {
  if (!isStorageConfigured()) return false;
  const { error } = await storage().storage.from(bucket()).remove([key]);
  if (error) console.error('[storage] delete failed', error);
  return !error;
}

/**
 * Read an image's pixel dimensions from its header bytes.
 *
 * Parsing the few bytes that carry the size avoids pulling in an image library
 * for a value `next/image` only needs to reserve the right box. Unknown
 * formats return zeros, which the renderer treats as "size unknown".
 */
export function readImageSize(buffer: Buffer): { width: number; height: number } {
  // PNG: IHDR is always the first chunk.
  if (buffer.length > 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  // GIF: logical screen descriptor, little-endian.
  if (buffer.length > 10 && buffer.toString('ascii', 0, 3) === 'GIF') {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }

  // JPEG: walk the segment chain to the first SOF marker.
  if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1]!;
      // SOF0–SOF15, excluding the non-frame markers in that range.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      offset += 2 + buffer.readUInt16BE(offset + 2);
    }
  }

  // WebP: the VP8X / VP8L / VP8 chunk carries the size three different ways.
  if (buffer.length > 30 && buffer.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buffer.toString('ascii', 12, 16);
    if (chunk === 'VP8X') {
      return {
        width: 1 + buffer.readUIntLE(24, 3),
        height: 1 + buffer.readUIntLE(27, 3),
      };
    }
    if (chunk === 'VP8 ') {
      return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === 'VP8L') {
      const bits = buffer.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }

  return { width: 0, height: 0 };
}
