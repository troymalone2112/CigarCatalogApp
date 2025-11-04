import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { connectionHealthManager } from './connectionHealthManager';

// Use environment variables with proper fallbacks
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

// Production-ready logging
console.log('🔍 Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');

// Validate environment variables
if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
  console.warn('⚠️ EXPO_PUBLIC_SUPABASE_URL not found in environment variables, using fallback');
}
if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    '⚠️ EXPO_PUBLIC_SUPABASE_ANON_KEY not found in environment variables, using fallback',
  );
}

// Additional validation
if (!supabaseUrl || supabaseUrl.trim() === '') {
  console.error('🚨 SUPABASE URL IS EMPTY OR NULL!');
  throw new Error('Supabase URL is empty or null');
}

if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  console.error('🚨 SUPABASE URL DOES NOT START WITH HTTP/HTTPS:', supabaseUrl);
  throw new Error('Supabase URL does not start with http/https: ' + supabaseUrl);
}

console.log('✅ Supabase client initialized successfully');

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
    fetch: (url, options = {}) => {
      // Add timeout using AbortController (standard approach)
      const controller = new AbortController();
      // Increase timeout to reduce false aborts on slower networks
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
    },
  },
  db: {
    schema: 'public',
  },
});

// Enhanced connection health check using ConnectionHealthManager
export const checkSupabaseConnection = async () => {
  return await connectionHealthManager.checkDatabaseHealth();
};

// Enhanced network connectivity check using ConnectionHealthManager
export const checkNetworkConnectivity = async () => {
  return await connectionHealthManager.checkNetworkConnectivity();
};

// Execute database operations with resilient retry logic
export const executeWithResilience = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  options?: { timeoutMs?: number; maxRetries?: number },
): Promise<T> => {
  return await connectionHealthManager.executeWithRetry(operation, operationName, options);
};

// Auth Service
export const AuthService = {
  async signUp(email: string, password: string, fullName: string) {
    // Check network connectivity first
    const networkOk = await checkNetworkConnectivity();
    if (!networkOk) {
      throw new Error('No internet connection. Please check your network and try again.');
    }

    // Check Supabase connection
    const supabaseOk = await checkSupabaseConnection();
    if (!supabaseOk) {
      throw new Error('Unable to connect to server. Please try again later.');
    }

    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Get user's timezone for accurate trial tracking
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        console.log(`🔐 Attempting signup (attempt ${attempt}/${maxRetries}):`, {
          email,
          fullName,
          userTimezone,
        });

        // Get device's current time in local timezone
        const now = new Date();
        const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        // Create a date string in the user's local timezone
        const localDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
        const localTime = new Date().toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        const localDateTimeString = `${localDate}T${localTime}`;

        console.log('📱 Local date:', localDate);
        console.log('📱 Local time:', localTime);
        console.log('📱 Local datetime:', localDateTimeString);
        console.log('📱 Device timezone:', deviceTimezone);

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              timezone: deviceTimezone,
              device_time: localDateTimeString, // Send local date/time
            },
          },
        });

        if (error) {
          console.error(`❌ Supabase signup error (attempt ${attempt}):`, error);
          console.error('Error type:', error.constructor.name);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);

          // If it's a network error and we have retries left, continue
          if (error.message.includes('Network request failed') && attempt < maxRetries) {
            console.log(`🔄 Network error, retrying in ${attempt * 2} seconds...`);
            await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
            lastError = error;
            continue;
          }

          throw error;
        }

        console.log('✅ Supabase signup successful:', data.user?.id);
        return data;
      } catch (error: any) {
        console.error(`❌ Signup failed (attempt ${attempt}):`, error);
        lastError = error;

        // If it's a network error and we have retries left, continue
        if (
          error?.message &&
          error.message.includes('Network request failed') &&
          attempt < maxRetries
        ) {
          console.log(`🔄 Network error, retrying in ${attempt * 2} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
          continue;
        }

        throw error;
      }
    }

    // If we get here, all retries failed
    throw lastError;
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
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

    if (error) {
      // If no profile exists, return null instead of trying to create one
      if (error.code === 'PGRST116') {
        console.log('🔍 No profile found for user');
        return null;
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
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);

      // If it's a duplicate key error, try to fetch the existing profile
      if (error.code === '23505') {
        console.log('🔍 Profile already exists, fetching it...');
        return await this.getProfile(userId);
      }

      throw error;
    }

    console.log('✅ Profile created successfully:', data);
    return data;
  },

  async updateProfile(
    userId: string,
    updates: { full_name?: string; avatar_url?: string; onboarding_completed?: boolean },
  ) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      // If no profile exists to update, create one
      if (error.code === 'PGRST116') {
        console.log('🔍 No profile found to update, creating new profile for user:', userId);
        return await this.createProfileWithUpdates(userId, updates);
      }
      throw error;
    }
    return data;
  },

  async createProfileWithUpdates(
    userId: string,
    updates: { full_name?: string; avatar_url?: string; onboarding_completed?: boolean },
  ) {
    console.log('🔍 Creating profile with updates for user:', userId);

    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          email: '', // Will be updated by trigger
          full_name: updates.full_name || 'New User',
          avatar_url: updates.avatar_url || null,
          onboarding_completed: updates.onboarding_completed || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating profile with updates:', error);
      throw error;
    }

    console.log('✅ Profile created with updates successfully:', data);
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
    return (
      data?.map((h) => ({
        id: h.id,
        userId: h.user_id,
        name: h.name,
        description: h.description,
        capacity: h.capacity,
        createdAt: new Date(h.created_at),
        updatedAt: new Date(h.updated_at),
      })) || []
    );
  },

  async getHumidorStats(userId: string) {
    const { data, error } = await supabase
      .from('humidor_stats')
      .select('*')
      .eq('user_id', userId)
      .order('cigar_count', { ascending: false });

    if (error) throw error;
    return (
      data?.map((h) => ({
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
      })) || []
    );
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
        },
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

  // Optimized method to get all humidor data in a single call
  async getHumidorDataOptimized(userId: string) {
    console.log('🚀 DatabaseService - Starting optimized humidor data load for user:', userId);
    const startTime = Date.now();

    try {
      // Get all humidor data in parallel (removed problematic user_humidor_aggregate view)
      const [humidorsResult, statsResult] = await Promise.all([
        supabase
          .from('humidors')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),

        supabase
          .from('humidor_stats')
          .select('*')
          .eq('user_id', userId)
          .order('cigar_count', { ascending: false }),
      ]);

      const loadTime = Date.now() - startTime;
      console.log(`⚡ DatabaseService - Optimized humidor data loaded in ${loadTime}ms`);

      // Handle humidors
      const humidors =
        humidorsResult.data?.map((h) => ({
          id: h.id,
          userId: h.user_id,
          name: h.name,
          description: h.description,
          capacity: h.capacity,
          createdAt: new Date(h.created_at),
          updatedAt: new Date(h.updated_at),
        })) || [];

      // Handle stats
      const humidorStats =
        statsResult.data?.map((h) => ({
          humidorId: h.humidor_id,
          userId: h.user_id,
          humidorName: h.humidor_name,
          description: h.description,
          capacity: h.capacity,
          cigarCount: h.cigar_count, // Fixed: was h.total_cigars
          totalValue: h.total_value,
          avgCigarPrice: h.avg_cigar_price,
          createdAt: new Date(h.created_at),
          updatedAt: new Date(h.updated_at),
        })) || [];

      // Calculate aggregate data from humidor stats (since we removed the problematic view)
      const aggregate = {
        userId,
        totalHumidors: humidors.length,
        totalCigars: humidorStats.reduce((sum, stat) => sum + (stat.cigarCount || 0), 0),
        totalCollectionValue: humidorStats.reduce((sum, stat) => sum + (stat.totalValue || 0), 0),
        avgCigarValue:
          humidorStats.length > 0
            ? humidorStats.reduce((sum, stat) => sum + (stat.avgCigarPrice || 0), 0) /
              humidorStats.length
            : 0,
        uniqueBrands: 0, // This would need to be calculated from inventory data if needed
      };

      // Check for errors
      if (humidorsResult.error) throw humidorsResult.error;
      if (statsResult.error) throw statsResult.error;

      return {
        humidors,
        humidorStats,
        aggregate,
        loadTime,
      };
    } catch (error: any) {
      const loadTime = Date.now() - startTime;
      console.error(
        `❌ DatabaseService - Optimized humidor data load failed after ${loadTime}ms:`,
        error,
      );
      throw error;
    }
  },

  async updateHumidor(
    humidorId: string,
    updates: { name?: string; description?: string; capacity?: number },
  ) {
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
    const { error } = await supabase.from('humidors').delete().eq('id', humidorId);

    if (error) throw error;
  },

  // Inventory Management Functions
  async getInventory(userId: string, humidorId?: string) {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error('Database request timeout')), 15000), // 15 second timeout
      );

      let query = supabase
        .from('inventory')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (humidorId) {
        query = query.eq('humidor_id', humidorId);
      }

      const dataPromise = query;
      const { data, error } = (await Promise.race([dataPromise, timeoutPromise])) as any;

      if (error) throw error;
      return (
        data?.map((item: any) => ({
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
        })) || []
      );
    } catch (error: any) {
      console.error('❌ DatabaseService.getInventory error:', error);
      throw error;
    }
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
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteInventoryItem(itemId: string) {
    const { error } = await supabase.from('inventory').delete().eq('id', itemId);

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
      .order('created_at', { ascending: false }); // Sort by creation time

    if (error) throw error;
    return data || [];
  },

  async saveJournalEntry(journalData: any) {
    console.log('🔍 JournalService.saveJournalEntry called with:', journalData);

    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries} to save journal entry`);

        const { data, error } = await supabase
          .from('journal_entries')
          .upsert(journalData, { onConflict: 'id' })
          .select()
          .single();

        if (error) {
          console.error(`❌ Error on attempt ${attempt}:`, error);
          lastError = error;

          // If it's a network error, wait before retrying
          if (error.message?.includes('Network request failed') && attempt < maxRetries) {
            console.log(`⏳ Waiting 2 seconds before retry ${attempt + 1}...`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue;
          }

          throw error;
        }

        console.log('✅ Journal entry saved successfully');
        return data;
      } catch (error: any) {
        console.error(`❌ Attempt ${attempt} failed:`, error);
        lastError = error;

        // If it's a network error and we have retries left, continue
        if (error.message?.includes('Network request failed') && attempt < maxRetries) {
          console.log(`⏳ Waiting 2 seconds before retry ${attempt + 1}...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }

        // If it's not a network error or we're out of retries, throw
        throw error;
      }
    }

    // If we get here, all retries failed
    console.error('❌ All retry attempts failed for journal entry save');
    throw lastError;
  },

  async deleteJournalEntry(entryId: string) {
    const { error } = await supabase.from('journal_entries').delete().eq('id', entryId);

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
    try {
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
      return data.map((item) => ({
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
          smokingExperience: item.cigar_data.smokingExperience ||
            item.cigar_data.smoking_experience || {
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
          cigarAficionadoRating:
            item.cigar_data.cigarAficionadoRating || item.cigar_data.cigar_aficionado_rating,
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
    } catch (err: any) {
      // Treat aborted requests as non-fatal to avoid blocking UX
      const message = String(err?.message || '').toLowerCase();
      if (err?.name === 'AbortError' || message.includes('abort')) {
        console.warn(
          '⚠️ InventoryService.getInventoryItems aborted; returning empty list to continue UX',
        );
        return [];
      }
      throw err;
    }
  },

  async updateInventoryQuantity(itemId: string, newQuantity: number) {
    const { error } = await supabase
      .from('inventory')
      .update({
        quantity: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    if (error) throw error;
  },

  async removeInventoryItem(itemId: string) {
    const { error } = await supabase.from('inventory').delete().eq('id', itemId);

    if (error) throw error;
  },
};
