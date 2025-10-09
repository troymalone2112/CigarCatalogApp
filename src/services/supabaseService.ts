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
});

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

  async updateProfile(userId: string, updates: any) {
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
      cigarCount: h.cigar_count,
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
};
