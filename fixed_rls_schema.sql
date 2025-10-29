-- Fixed Row Level Security Policies for Supabase
-- Run this AFTER running the main supabase_schema.sql

-- First, let's fix the profiles table RLS policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON profiles;

-- Better RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Fix cigars table RLS (should be readable by authenticated users)
DROP POLICY IF EXISTS "Cigars are viewable by everyone." ON cigars;

CREATE POLICY "Authenticated users can view cigars" ON cigars
  FOR SELECT USING (auth.role() = 'authenticated');

-- Optional: Allow authenticated users to contribute cigars
CREATE POLICY "Authenticated users can insert cigars" ON cigars
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Fix user_inventory RLS policies
DROP POLICY IF EXISTS "Users can view their own inventory." ON user_inventory;
DROP POLICY IF EXISTS "Users can insert into their own inventory." ON user_inventory;
DROP POLICY IF EXISTS "Users can update their own inventory." ON user_inventory;
DROP POLICY IF EXISTS "Users can delete from their own inventory." ON user_inventory;

CREATE POLICY "Users can manage their own inventory" ON user_inventory
  FOR ALL USING (auth.uid() = user_id);

-- Fix journal_entries RLS policies
DROP POLICY IF EXISTS "Users can view their own journal entries." ON journal_entries;
DROP POLICY IF EXISTS "Users can insert their own journal entries." ON journal_entries;
DROP POLICY IF EXISTS "Users can update their own journal entries." ON journal_entries;
DROP POLICY IF EXISTS "Users can delete their own journal entries." ON journal_entries;

CREATE POLICY "Users can manage their own journal entries" ON journal_entries
  FOR ALL USING (auth.uid() = user_id);

-- Fix user_preferences RLS policies
DROP POLICY IF EXISTS "Users can view their own preferences." ON user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences." ON user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences." ON user_preferences;

CREATE POLICY "Users can manage their own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Now let's add the subscription tables with proper RLS
-- (These will be created when you run subscription_schema.sql)

-- Create a function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Test RLS policies with a simple query function
CREATE OR REPLACE FUNCTION test_rls_policies()
RETURNS TEXT AS $$
DECLARE
  result TEXT := '';
  user_count INTEGER;
  profile_count INTEGER;
BEGIN
  -- Test if we can count users (should work for authenticated users)
  SELECT COUNT(*) INTO user_count FROM auth.users;
  result := result || 'Auth users: ' || user_count || E'\n';
  
  -- Test if we can count profiles
  SELECT COUNT(*) INTO profile_count FROM profiles;
  result := result || 'Profiles: ' || profile_count || E'\n';
  
  result := result || 'RLS policies appear to be working!';
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'RLS Error: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Ensure RLS is enabled on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cigars ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;















