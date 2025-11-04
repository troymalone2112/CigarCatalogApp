import { executeWithResilience, supabase } from './supabaseService';

export class ApiError extends Error {
  code?: string;
  hint?: string;
  status?: number;
  constructor(message: string, extra?: { code?: string; hint?: string; status?: number }) {
    super(message);
    this.name = 'ApiError';
    this.code = extra?.code;
    this.hint = extra?.hint;
    this.status = extra?.status;
  }
}

export namespace ApiTypes {
  export interface Humidor {
    id: string;
    user_id: string;
    name: string;
    description?: string | null;
    capacity?: number | null;
    created_at: string;
    updated_at: string;
  }

  export interface InventoryRecord {
    id: string;
    user_id: string;
    humidor_id: string;
    cigar_data: any;
    quantity: number;
    price_paid?: number | null;
    original_box_price?: number | null;
    sticks_per_box?: number | null;
    location?: string | null;
    notes?: string | null;
    created_at?: string;
    updated_at?: string;
  }

  export interface JournalRecord {
    id: string;
    user_id: string;
    cigar_data: any;
    smoking_date?: string | null;
    rating_overall?: number | null;
    rating_construction?: number | null;
    rating_draw?: number | null;
    rating_flavor?: number | null;
    rating_complexity?: number | null;
    notes?: string | null;
    setting?: string | null;
    pairing?: string | null;
    image_url?: string | null;
    photos?: string | null;
    selected_flavors?: string | null;
    created_at?: string;
    updated_at?: string;
  }
}

const withResilience = async <T>(opName: string, op: () => Promise<T>): Promise<T> => {
  return executeWithResilience(op, opName, { timeoutMs: 15000, maxRetries: 2 });
};

const normalizeError = (e: any): ApiError => {
  if (e instanceof ApiError) return e;
  const message = e?.message || 'Unknown API error';
  return new ApiError(message, { code: e?.code, hint: e?.hint, status: e?.status });
};

export const Api = {
  auth: {
    async getUserId(): Promise<string | null> {
      const { data } = await supabase.auth.getUser();
      return data.user?.id || null;
    },
  },

  humidors: {
    async list(userId: string): Promise<ApiTypes.Humidor[]> {
      try {
        const { data, error } = await withResilience('humidors.list', () =>
          supabase
            .from('humidors')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
        );
        if ((data as any)?.error || error) throw error || (data as any)?.error;
        return (data as any) || [];
      } catch (e: any) {
        throw normalizeError(e);
      }
    },
  },

  inventory: {
    async list(
      userId: string,
      humidorId?: string,
      options?: { limit?: number; offset?: number },
    ): Promise<ApiTypes.InventoryRecord[]> {
      try {
        let query = supabase.from('inventory').select('*').eq('user_id', userId);
        if (humidorId) query = query.eq('humidor_id', humidorId);
        if (options?.limit !== undefined) {
          const from = options.offset || 0;
          const to = from + options.limit - 1;
          query = query.range(from, to);
        }
        const { data, error } = await withResilience('inventory.list', () =>
          query.order('created_at', { ascending: false }),
        );
        if ((data as any)?.error || error) throw error || (data as any)?.error;
        return (data as any) || [];
      } catch (e: any) {
        throw normalizeError(e);
      }
    },

    async upsert(rec: ApiTypes.InventoryRecord): Promise<ApiTypes.InventoryRecord> {
      try {
        const { data, error } = await withResilience('inventory.upsert', () =>
          supabase.from('inventory').upsert(rec, { onConflict: 'id' }).select().single(),
        );
        if (error) throw error;
        return data as any;
      } catch (e: any) {
        throw normalizeError(e);
      }
    },

    async update(
      itemId: string,
      updates: Partial<ApiTypes.InventoryRecord>,
    ): Promise<ApiTypes.InventoryRecord> {
      try {
        const { data, error } = await withResilience('inventory.update', () =>
          supabase.from('inventory').update(updates).eq('id', itemId).select().single(),
        );
        if (error) throw error;
        return data as any;
      } catch (e: any) {
        throw normalizeError(e);
      }
    },

    async remove(itemId: string): Promise<void> {
      try {
        const { error } = await withResilience('inventory.remove', () =>
          supabase.from('inventory').delete().eq('id', itemId),
        );
        if (error) throw error;
      } catch (e: any) {
        throw normalizeError(e);
      }
    },
  },

  profiles: {
    async get(userId: string) {
      try {
        const { data, error } = await withResilience('profiles.get', () =>
          supabase.from('profiles').select('*').eq('id', userId).single(),
        );
        if (error) throw error;
        return data as any;
      } catch (e: any) {
        throw normalizeError(e);
      }
    },
    async update(userId: string, updates: any) {
      try {
        const { data, error } = await withResilience('profiles.update', () =>
          supabase.from('profiles').update(updates).eq('id', userId).select().single(),
        );
        if (error) throw error;
        return data as any;
      } catch (e: any) {
        throw normalizeError(e);
      }
    },
  },

  journal: {
    async list(userId: string) {
      try {
        const { data, error } = await withResilience('journal.list', () =>
          supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
        );
        if (error) throw error;
        return (data as any) || [];
      } catch (e: any) {
        throw normalizeError(e);
      }
    },
    async upsert(record: ApiTypes.JournalRecord) {
      try {
        const { data, error } = await withResilience('journal.upsert', () =>
          supabase.from('journal_entries').upsert(record, { onConflict: 'id' }).select().single(),
        );
        if (error) throw error;
        return data as any;
      } catch (e: any) {
        throw normalizeError(e);
      }
    },
    async remove(entryId: string) {
      try {
        const { error } = await withResilience('journal.remove', () =>
          supabase.from('journal_entries').delete().eq('id', entryId),
        );
        if (error) throw error;
      } catch (e: any) {
        throw normalizeError(e);
      }
    },
  },

  subscriptions: {
    async status(userId: string) {
      try {
        // Assuming a status view/table exists; adapt as needed
        const { data, error } = await withResilience('subscriptions.status', () =>
          supabase.from('subscription_status').select('*').eq('user_id', userId).single(),
        );
        if (error) throw error;
        return data as any;
      } catch (e: any) {
        throw normalizeError(e);
      }
    },
  },
};
