// Use legacy API for broad compatibility (Expo SDK 54):
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabaseService';

function atobPolyfill(b64: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let buffer = 0;
  let bc = 0;
  let bs: number | string = '';
  let idx = 0;
  for (; (bs = b64.charAt(idx++)); ~(bs = chars.indexOf(bs as string)) && ((buffer = bc % 4 ? buffer * 64 + (bs as number) : (bs as number)), bc++ % 4)
    ? (output += String.fromCharCode(255 & (buffer >> ((-2 * bc) & 6))))
    : 0) {}
  return output;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const decoder = (global as any).atob ? (global as any).atob : atobPolyfill;
  const binaryString = decoder(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function guessExt(uri: string): { ext: string; contentType: string } {
  const m = uri.match(/\.(jpg|jpeg|png|heic)$/i);
  const ext = (m?.[1] || 'jpg').toLowerCase();
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    heic: 'image/heic',
  };
  return { ext, contentType: map[ext] || 'image/jpeg' };
}

export const MediaUploadService = {
  bucket: 'user-media',

  async ensureBucketExists(): Promise<void> {
    try {
      const { data: list } = await supabase.storage.listBuckets();
      const exists = (list || []).some((b: any) => b.name === this.bucket);
      if (!exists) {
        // Public bucket for images
        await supabase.storage.createBucket(this.bucket, { public: true });
        console.log('[Upload] Created storage bucket', this.bucket);
      }
    } catch (e) {
      // ignore; creation may not be allowed in anon context
    }
  },

  async uploadImage(localUri: string, opts: { userId: string; scope: 'journal' | 'inventory'; id: string }): Promise<string> {
    const { userId, scope, id } = opts;
    const { ext, contentType } = guessExt(localUri);

    await this.ensureBucketExists();

    // Use base64 → Uint8Array for maximum compatibility in RN/Expo Hermes
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: 'base64' as any,
    });
    const fileData = base64ToUint8Array(base64);

    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path = `${userId}/${scope}/${id}/${filename}`;
    console.log('[Upload] path', path);

    // Retry upload with simple backoff
    const maxAttempts = 3;
    let attempt = 0;
    let lastErr: any;
    while (attempt < maxAttempts) {
      const { error } = await supabase.storage.from(this.bucket).upload(path, fileData, {
        contentType,
        upsert: true,
      });
      if (!error) break;
      lastErr = error;
      attempt++;
      const delay = 400 * Math.pow(2, attempt - 1);
      console.log('[Upload] retry', attempt, 'in', delay, 'ms');
      await new Promise((r) => setTimeout(r, delay));
    }
    if (attempt === maxAttempts && lastErr) {
      console.log('[Upload] Supabase upload error', lastErr);
      throw lastErr;
    }

    const { data } = supabase.storage.from(this.bucket).getPublicUrl(path);
    console.log('[Upload] OK', data.publicUrl);
    return data.publicUrl;
  },

  async uploadMany(localUris: string[], opts: { userId: string; scope: 'journal' | 'inventory'; id: string }): Promise<string[]> {
    const urls: string[] = [];
    for (const uri of localUris) {
      if (!uri) continue;
      if (/^https?:\/\//i.test(uri)) {
        urls.push(uri);
      } else if (uri.startsWith('file://')) {
        try {
          const url = await this.uploadImage(uri, opts);
          urls.push(url);
        } catch {
          // skip failed
        }
      }
    }
    return urls;
  },
};


