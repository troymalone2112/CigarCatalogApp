-- Fixed Subscription Schema with Proper RLS
-- Run this AFTER running fixed_rls_schema.sql

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly DECIMAL,
  price_yearly DECIMAL,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  status TEXT CHECK (status IN ('trial', 'active', 'expired', 'cancelled', 'past_due')) DEFAULT 'trial',
  trial_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trial_end_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '3 days'),
  subscription_start_date TIMESTAMP WITH TIME ZONE,
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  payment_method_id TEXT,
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create usage tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, features) VALUES
('Free Trial', '3-day full access trial', 0.00, 0.00, ARRAY[
  'Unlimited cigar recognition',
  'Personal humidor tracking', 
  'Smoking journal',
  'AI recommendations',
  'Cloud sync'
]),
('Premium Monthly', 'Full access to all features', 9.99, NULL, ARRAY[
  'Unlimited cigar recognition',
  'Personal humidor tracking',
  'Smoking journal', 
  'AI recommendations',
  'Cloud sync',
  'Advanced analytics',
  'Export data',
  'Priority support'
]),
('Premium Yearly', 'Full access with yearly savings', NULL, 99.99, ARRAY[
  'Unlimited cigar recognition',
  'Personal humidor tracking',
  'Smoking journal',
  'AI recommendations', 
  'Cloud sync',
  'Advanced analytics',
  'Export data',
  'Priority support',
  '2 months free'
])
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans (readable by authenticated users)
CREATE POLICY "Authenticated users can view subscription plans" ON subscription_plans
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can manage their own subscription" ON user_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for usage_tracking
CREATE POLICY "Users can manage their own usage tracking" ON usage_tracking
  FOR ALL USING (auth.uid() = user_id);

-- Function to automatically create trial subscription for new users
CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS TRIGGER AS $$
DECLARE
  trial_plan_id UUID;
BEGIN
  -- Get the trial plan ID
  SELECT id INTO trial_plan_id 
  FROM subscription_plans 
  WHERE name = 'Free Trial' 
  LIMIT 1;

  -- Create trial subscription for new user
  INSERT INTO user_subscriptions (
    user_id, 
    plan_id, 
    status,
    trial_start_date,
    trial_end_date
  ) VALUES (
    NEW.id,
    trial_plan_id,
    'trial',
    NOW(),
    NOW() + INTERVAL '3 days'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create trial subscription when user signs up
DROP TRIGGER IF EXISTS create_trial_on_signup ON auth.users;
CREATE TRIGGER create_trial_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_trial_subscription();

-- Function to check if user has active subscription or trial
CREATE OR REPLACE FUNCTION has_active_subscription(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  subscription_record user_subscriptions%ROWTYPE;
BEGIN
  SELECT * INTO subscription_record
  FROM user_subscriptions
  WHERE user_id = user_uuid;

  -- No subscription record found
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check trial status
  IF subscription_record.status = 'trial' THEN
    RETURN subscription_record.trial_end_date > NOW();
  END IF;

  -- Check active subscription
  IF subscription_record.status = 'active' THEN
    RETURN subscription_record.subscription_end_date > NOW();
  END IF;

  -- All other statuses are inactive
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get days remaining in trial/subscription
CREATE OR REPLACE FUNCTION get_subscription_days_remaining(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  subscription_record user_subscriptions%ROWTYPE;
  end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT * INTO subscription_record
  FROM user_subscriptions
  WHERE user_id = user_uuid;

  -- No subscription record found
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Get appropriate end date
  IF subscription_record.status = 'trial' THEN
    end_date := subscription_record.trial_end_date;
  ELSIF subscription_record.status = 'active' THEN
    end_date := subscription_record.subscription_end_date;
  ELSE
    RETURN 0;
  END IF;

  -- Calculate days remaining
  RETURN GREATEST(0, EXTRACT(days FROM (end_date - NOW()))::INTEGER);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_trial_end ON user_subscriptions(trial_end_date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_action ON usage_tracking(action);

-- Update triggers
CREATE TRIGGER update_subscription_plans_updated_at 
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at 
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT ON subscription_plans TO anon, authenticated;
GRANT ALL ON user_subscriptions TO authenticated;
GRANT ALL ON usage_tracking TO authenticated;

-- Test function to verify everything works
CREATE OR REPLACE FUNCTION test_subscription_system()
RETURNS TEXT AS $$
DECLARE
  result TEXT := '';
  plan_count INTEGER;
  current_user_id UUID;
  user_sub user_subscriptions%ROWTYPE;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN 'Error: No authenticated user found';
  END IF;
  
  -- Test subscription plans
  SELECT COUNT(*) INTO plan_count FROM subscription_plans WHERE is_active = true;
  result := result || 'Active subscription plans: ' || plan_count || E'\n';
  
  -- Test user subscription
  SELECT * INTO user_sub FROM user_subscriptions WHERE user_id = current_user_id;
  
  IF FOUND THEN
    result := result || 'User subscription status: ' || user_sub.status || E'\n';
    result := result || 'Trial end date: ' || user_sub.trial_end_date || E'\n';
  ELSE
    result := result || 'No subscription found for user' || E'\n';
  END IF;
  
  result := result || 'Subscription system test completed successfully!';
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Subscription system error: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;











