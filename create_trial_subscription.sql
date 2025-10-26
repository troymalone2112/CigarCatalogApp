-- Create trial subscription for new user troy21@gmail.com
-- This bypasses RLS by using the service role

-- First, let's create the subscription manually
INSERT INTO user_subscriptions (
  user_id,
  plan_id,
  status,
  is_premium,
  trial_start_date,
  trial_end_date,
  auto_renew
) VALUES (
  '65dc55ef-1ee9-4b42-93db-ee0a9c9e4c7e', -- troy21@gmail.com user ID
  '53818698-fbd6-484d-9ced-b1ede78aefb1', -- Free Trial plan ID
  'trial',
  false,
  NOW(),
  NOW() + INTERVAL '3 days',
  true
);

-- Check the result
SELECT 
  p.full_name,
  p.email,
  us.status,
  us.is_premium,
  us.trial_start_date,
  us.trial_end_date,
  us.created_at
FROM profiles p
JOIN user_subscriptions us ON p.id = us.user_id
WHERE p.email = 'troy21@gmail.com';

