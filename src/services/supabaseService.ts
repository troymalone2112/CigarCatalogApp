import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'cigar-catalog-app',
    },
  },
  db: {
    schema: 'public',
  },
});

// Add connection health check
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection check failed:', error);
      return false;
    }
    
    console.log('✅ Supabase connection healthy');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection check error:', error);
    return false;
  }
};

// Auth Service
export const AuthService = {
  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  async updateProfile(updates: { full_name?: string; avatar_url?: string }) {
    const { error } = await supabase.auth.updateUser({
      data: updates,
    });
    if (error) throw error;
  },
};

// Database Service
export const DatabaseService = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // If no profile exists, create one
      if (error.code === 'PGRST116') {
        console.log('🔍 No profile found for user, creating one...');
        try {
          return await this.createProfile(userId, '', 'New User');
        } catch (createError: any) {
          // If creation fails due to duplicate key, try to fetch the existing profile
          if (createError.code === '23505') {
            console.log('🔍 Profile already exists, fetching it...');
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();
            return existingProfile;
          }
          throw createError;
        }
      }
      throw error;
    }
    return data;
  },

  async createProfile(userId: string, email: string, fullName: string) {
    console.log('🔍 Creating profile for user:', userId);
    
    // First check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      console.log('🔍 Profile already exists, returning existing profile');
      return existingProfile;
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          email: email || '',
          full_name: fullName || 'New User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
    
    console.log('✅ Profile created successfully:', data);
    return data;
  },

  async updateProfile(userId: string, updates: { full_name?: string; avatar_url?: string; onboarding_completed?: boolean }) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Humidor Management Functions
  async getHumidors(userId: string) {
    const { data, error } = await supabase
      .from('humidors')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data?.map(h => ({
      id: h.id,
      userId: h.user_id,
      name: h.name,
      description: h.description,
      capacity: h.capacity,
      createdAt: new Date(h.created_at),
      updatedAt: new Date(h.updated_at),
    })) || [];
  },

  async getHumidorStats(userId: string) {
    const { data, error } = await supabase
      .from('humidor_stats')
      .select('*')
      .eq('user_id', userId)
      .order('cigar_count', { ascending: false });

    if (error) throw error;
    return data?.map(h => ({
      humidorId: h.humidor_id,
      userId: h.user_id,
      humidorName: h.humidor_name,
      description: h.description,
      capacity: h.capacity,
      cigarCount: h.total_cigars,
      totalValue: h.total_value,
      avgCigarPrice: h.avg_cigar_price,
      createdAt: new Date(h.created_at),
      updatedAt: new Date(h.updated_at),
    })) || [];
  },

  async getUserHumidorAggregate(userId: string) {
    const { data, error } = await supabase
      .from('user_humidor_aggregate')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    if (!data) {
      return {
        userId,
        totalHumidors: 0,
        totalCigars: 0,
        totalCollectionValue: 0,
        avgCigarValue: 0,
        uniqueBrands: 0,
      };
    }

    return {
      userId: data.user_id,
      totalHumidors: data.total_humidors,
      totalCigars: data.total_cigars,
      totalCollectionValue: data.total_collection_value,
      avgCigarValue: data.avg_cigar_value,
      uniqueBrands: data.unique_brands,
    };
  },

  async createHumidor(userId: string, name: string, description?: string, capacity?: number) {
    const { data, error } = await supabase
      .from('humidors')
      .insert([
        {
          user_id: userId,
          name,
          description,
          capacity,
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      description: data.description,
      capacity: data.capacity,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  },

  async updateHumidor(humidorId: string, updates: { name?: string; description?: string; capacity?: number }) {
    const { data, error } = await supabase
      .from('humidors')
      .update(updates)
      .eq('id', humidorId)
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      description: data.description,
      capacity: data.capacity,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  },

  async deleteHumidor(humidorId: string) {
    const { error } = await supabase
      .from('humidors')
      .delete()
      .eq('id', humidorId);

    if (error) throw error;
  },

  // Inventory Management Functions
  async getInventory(userId: string, humidorId?: string) {
    let query = supabase
      .from('inventory')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (humidorId) {
      query = query.eq('humidor_id', humidorId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data?.map(item => ({
      id: item.id,
      cigar: {
        id: item.cigar_data.id,
        brand: item.cigar_data.brand,
        line: item.cigar_data.line,
        name: item.cigar_data.name,
        size: item.cigar_data.size,
        wrapper: item.cigar_data.wrapper,
        filler: item.cigar_data.filler,
        binder: item.cigar_data.binder,
        tobacco: item.cigar_data.tobacco,
        strength: item.cigar_data.strength,
        flavorProfile: item.cigar_data.flavorProfile,
        tobaccoOrigins: item.cigar_data.tobaccoOrigins,
        smokingExperience: item.cigar_data.smokingExperience,
        imageUrl: item.cigar_data.imageUrl,
        recognitionConfidence: item.cigar_data.recognitionConfidence,
        msrp: item.cigar_data.msrp,
        singleStickPrice: item.cigar_data.singleStickPrice,
        releaseYear: item.cigar_data.releaseYear,
        limitedEdition: item.cigar_data.limitedEdition,
        professionalRating: item.cigar_data.professionalRating,
        agingPotential: item.cigar_data.agingPotential,
        wrapperColor: item.cigar_data.wrapperColor,
        identifyingFeatures: item.cigar_data.identifyingFeatures,
        overview: item.cigar_data.overview,
        tobaccoOrigin: item.cigar_data.tobaccoOrigin,
        flavorTags: item.cigar_data.flavorTags,
        cigarAficionadoRating: item.cigar_data.cigarAficionadoRating,
        detailUrl: item.cigar_data.detailUrl,
      },
      quantity: item.quantity,
      purchaseDate: item.purchase_date ? new Date(item.purchase_date) : undefined,
      pricePaid: item.price_paid || undefined,
      originalBoxPrice: item.original_box_price || undefined,
      sticksPerBox: item.sticks_per_box || undefined,
      location: item.location || undefined,
      notes: item.notes || undefined,
      humidorId: item.humidor_id,
    })) || [];
  },

  async saveInventoryItem(inventoryItem: any) {
    const { data, error } = await supabase
      .from('inventory')
      .upsert([
        {
          id: inventoryItem.id,
          user_id: inventoryItem.user_id,
          humidor_id: inventoryItem.humidor_id,
          cigar_data: inventoryItem.cigar_data,
          quantity: inventoryItem.quantity,
          purchase_date: inventoryItem.purchase_date,
          price_paid: inventoryItem.price_paid,
          original_box_price: inventoryItem.original_box_price,
          sticks_per_box: inventoryItem.sticks_per_box,
          location: inventoryItem.location,
          notes: inventoryItem.notes,
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteInventoryItem(itemId: string) {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  },

  async updateInventoryItem(itemId: string, updates: any) {
    const { data, error } = await supabase
      .from('inventory')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// Journal Entries Service
export const JournalService = {
  async getJournalEntries(userId: string) {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('smoking_date', { ascending: false })
      .order('created_at', { ascending: false }); // Secondary sort by creation time

    if (error) throw error;
    return data || [];
  },

  async saveJournalEntry(journalData: any) {
    console.log('🔍 JournalService.saveJournalEntry called with:', journalData);
    const { data, error } = await supabase
      .from('journal_entries')
      .upsert(journalData, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Error saving journal entry:', error);
      throw error;
    }
    
    console.log('✅ Journal entry saved successfully');
    return data;
  },


  async deleteJournalEntry(entryId: string) {
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', entryId);

    if (error) throw error;
  },

  async updateJournalEntry(entryId: string, updates: any) {
    const { data, error } = await supabase
      .from('journal_entries')
      .update(updates)
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// Inventory Service
export const InventoryService = {
  async saveInventoryItem(inventoryData: any) {
    console.log('🔍 InventoryService.saveInventoryItem called with data:', inventoryData.id);
    const { data, error } = await supabase
      .from('inventory')
      .upsert(inventoryData, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('🔍 InventoryService save error:', error);
      throw error;
    }
    console.log('✅ InventoryService saved successfully:', data.id);
    return data;
  },

  async getInventoryItems(humidorId?: string): Promise<any[]> {
    let query = supabase
      .from('inventory')
      .select('*')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

    if (humidorId) {
      query = query.eq('humidor_id', humidorId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Transform to InventoryItem format
    return data.map(item => ({
      id: item.id,
      cigar: {
        id: item.cigar_data.id || item.id,
        brand: item.cigar_data.brand || 'Unknown',
        line: item.cigar_data.line || 'Unknown',
        name: item.cigar_data.name || 'Unknown',
        size: item.cigar_data.size || '',
        wrapper: item.cigar_data.wrapper || '',
        filler: item.cigar_data.filler || '',
        binder: item.cigar_data.binder || '',
        strength: item.cigar_data.strength || 'Medium',
        flavorProfile: item.cigar_data.flavorProfile || item.cigar_data.flavor_profile || [],
        tobaccoOrigins: item.cigar_data.tobaccoOrigins || item.cigar_data.tobacco_origins || [],
        smokingExperience: item.cigar_data.smokingExperience || item.cigar_data.smoking_experience || {
          first: '',
          second: '',
          final: '',
        },
        imageUrl: item.cigar_data.imageUrl || item.cigar_data.image_url,
        msrp: item.cigar_data.msrp,
        singleStickPrice: item.cigar_data.singleStickPrice || item.cigar_data.single_stick_price,
        overview: item.cigar_data.overview,
        tobaccoOrigin: item.cigar_data.tobaccoOrigin || item.cigar_data.tobacco_origin,
        flavorTags: item.cigar_data.flavorTags || item.cigar_data.flavor_tags || [],
        cigarAficionadoRating: item.cigar_data.cigarAficionadoRating || item.cigar_data.cigar_aficionado_rating,
      },
      quantity: item.quantity,
      purchaseDate: new Date(item.created_at),
      pricePaid: item.price_paid,
      originalBoxPrice: item.original_box_price,
      sticksPerBox: item.sticks_per_box,
      location: item.location,
      notes: item.notes,
      humidorId: item.humidor_id,
      // New cigar specification fields
      dateAcquired: item.date_acquired ? new Date(item.date_acquired) : undefined,
      agingPreferenceMonths: item.aging_preference_months || 0,
      lengthInches: item.length_inches,
      ringGauge: item.ring_gauge,
      vitola: item.vitola,
    }));
  },

  async updateInventoryQuantity(itemId: string, newQuantity: number) {
    const { error } = await supabase
      .from('inventory')
      .update({ 
        quantity: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId);

    if (error) throw error;
  },

  async removeInventoryItem(itemId: string) {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  },
};
