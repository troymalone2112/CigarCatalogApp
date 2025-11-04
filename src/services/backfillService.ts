import { supabase } from './supabaseService';
import { MediaUploadService } from './mediaUploadService';

function isLocalPath(uri?: string | null): boolean {
  if (!uri) return false;
  return uri.startsWith('file://') || uri.startsWith('content://');
}

export const BackfillService = {
  async getUserIdByEmail(email: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (error) return null;
    return data?.id || null;
  },

  async backfillJournalImages(userId: string): Promise<{ updated: number; errors: number }> {
    let updated = 0;
    let errors = 0;
    const { data, error } = await supabase
      .from('journal_entries')
      .select('id, image_url, photos')
      .eq('user_id', userId);
    if (error || !data) return { updated, errors: (error ? 1 : 0) };

    for (const row of data) {
      try {
        let changed = false;
        let image_url: string | null = row.image_url || null;
        let photos: string[] = [];
        try {
          photos = row.photos ? JSON.parse(row.photos) : [];
        } catch {
          photos = [];
        }

        if (isLocalPath(image_url)) {
          const url = await MediaUploadService.uploadImage(image_url!, {
            userId,
            scope: 'journal',
            id: row.id,
          });
          image_url = url;
          changed = true;
        }

        const newPhotos: string[] = [];
        for (const p of photos) {
          if (isLocalPath(p)) {
            try {
              const url = await MediaUploadService.uploadImage(p, {
                userId,
                scope: 'journal',
                id: row.id,
              });
              newPhotos.push(url);
              changed = true;
            } catch {
              // keep old path if upload fails
              newPhotos.push(p);
            }
          } else {
            newPhotos.push(p);
          }
        }

        if (changed) {
          const { error: upErr } = await supabase
            .from('journal_entries')
            .update({ image_url, photos: JSON.stringify(newPhotos) })
            .eq('id', row.id);
          if (upErr) errors++;
          else updated++;
        }
      } catch {
        errors++;
      }
    }

    return { updated, errors };
  },

  async backfillInventoryImages(userId: string): Promise<{ updated: number; errors: number }> {
    let updated = 0;
    let errors = 0;
    const { data, error } = await supabase
      .from('inventory')
      .select('id, cigar_data')
      .eq('user_id', userId);
    if (error || !data) return { updated, errors: (error ? 1 : 0) };

    for (const row of data as any[]) {
      try {
        const cigar = row.cigar_data || {};
        let changed = false;
        if (isLocalPath(cigar.imageUrl)) {
          try {
            const url = await MediaUploadService.uploadImage(cigar.imageUrl, {
              userId,
              scope: 'inventory',
              id: row.id,
            });
            cigar.imageUrl = url;
            changed = true;
          } catch {}
        }

        if (changed) {
          const { error: upErr } = await supabase
            .from('inventory')
            .update({ cigar_data: cigar })
            .eq('id', row.id);
          if (upErr) errors++;
          else updated++;
        }
      } catch {
        errors++;
      }
    }

    return { updated, errors };
  },

  async runForEmail(email: string): Promise<{ userId: string | null; journal: any; inventory: any }> {
    const userId = await this.getUserIdByEmail(email);
    if (!userId) return { userId: null, journal: { updated: 0, errors: 1 }, inventory: { updated: 0, errors: 1 } };
    const journal = await this.backfillJournalImages(userId);
    const inventory = await this.backfillInventoryImages(userId);
    return { userId, journal, inventory };
  },
};



