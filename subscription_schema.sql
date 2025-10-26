-- Subscription and Trial Management Schema
-- Add this to your existing Supabase database

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
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage tracking table (optional - for analytics)
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'cigar_added', 'journal_entry', 'recognition_used', etc.
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_trial_end ON user_subscriptions(trial_end_date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_action ON usage_tracking(action);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans (public read)
CREATE POLICY "Anyone can view subscription plans" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription" ON user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for usage_tracking
CREATE POLICY "Users can view own usage" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

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
$$ LANGUAGE plpgsql;

-- Trigger to create trial subscription when profile is created
CREATE TRIGGER create_trial_on_signup
  AFTER INSERT ON profiles
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
$$ LANGUAGE plpgsql;

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
$$ LANGUAGE plpgsql;

-- Update trigger for subscription table
CREATE TRIGGER update_user_subscriptions_updated_at 
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at 
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();












