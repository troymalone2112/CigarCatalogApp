# User Roles Setup Guide

This guide explains how to set up and manage user roles in the Cigar Catalog App.

## Overview

The app supports two user roles:

- **Standard User**: Regular app users who sign up through the App Store
- **Super User**: Admin users with access to analytics and user management

## Database Setup

### 1. Run the Schema Migration

Execute the SQL schema file in your Supabase project:

```sql
-- Run the contents of user_roles_schema.sql in your Supabase SQL editor
```

This will create:

- `user_roles` table for role assignments
- `admin_analytics` table for analytics data
- `user_activity_log` table for activity tracking
- `user_management` view for admin dashboard
- Required functions and triggers

### 2. Assign Your Super User Role

After creating your account, you need to manually assign the super user role.

#### Option A: Through Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Find your user account and copy the **User ID**
4. Go to **Table Editor** → **user_roles**
5. Insert a new row with:
   - `user_id`: Your user ID
   - `role_type`: `super_user`
   - `granted_by`: Your user ID (same as user_id)
   - `is_active`: `true`

#### Option B: Through SQL Editor

```sql
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from auth.users
INSERT INTO user_roles (user_id, role_type, granted_by)
VALUES ('YOUR_USER_ID_HERE', 'super_user', 'YOUR_USER_ID_HERE')
ON CONFLICT (user_id) DO NOTHING;
```

### 3. Verify Your Role

After assigning the role, restart the app and check:

1. Go to **Settings** in the app
2. You should see "Super User" role badge
3. You should see an "Administration" section with "Admin Dashboard" option

## Role Management

### Promoting Users to Super User

Super users can promote other users through the Admin Dashboard:

1. Go to **Settings** → **Admin Dashboard**
2. Find the user in the "Recent Users" section
3. Click "Promote" button next to their name

### Demoting Super Users

Super users can demote other super users (but not themselves):

1. Go to **Settings** → **Admin Dashboard**
2. Find the super user in the "Recent Users" section
3. Click "Demote" button next to their name

### Manual Role Management via SQL

```sql
-- Promote a user to super user
SELECT assign_user_role('USER_ID_HERE', 'super_user');

-- Demote a user to standard user
SELECT assign_user_role('USER_ID_HERE', 'standard_user');

-- Check a user's role
SELECT get_user_role('USER_ID_HERE');

-- Check if user is super user
SELECT is_super_user('USER_ID_HERE');
```

## Features by Role

### Standard User Features

- ✅ Access to all core app functionality
- ✅ Cigar identification and cataloging
- ✅ Inventory management
- ✅ Journal entries
- ✅ Recommendations
- ❌ Admin dashboard access
- ❌ User management
- ❌ Analytics viewing

### Super User Features

- ✅ All Standard User features
- ✅ Admin Dashboard access
- ✅ User management (promote/demote users)
- ✅ Analytics and statistics viewing
- ✅ User activity logs
- ✅ System administration tools

## Security Features

### Row Level Security (RLS)

- All tables have RLS enabled
- Users can only access their own data
- Super users can access admin tables
- Automatic role assignment for new users

### Activity Logging

The system automatically logs:

- Inventory item additions/updates/deletions
- Journal entry additions/updates/deletions
- Quantity changes
- User role changes
- Admin actions

### Access Control

- Role checks happen at the database level
- Frontend UI adapts based on user role
- API calls are protected by RLS policies

## Troubleshooting

### Can't Access Admin Dashboard

1. Verify your user ID is in the `user_roles` table
2. Check that `role_type` is `super_user`
3. Ensure `is_active` is `true`
4. Try logging out and back in
5. Check console for permission errors

### Role Not Updating

1. Check Supabase logs for RLS policy violations
2. Verify the `user_roles` table has the correct data
3. Try refreshing the app or logging out/in
4. Check that the `granted_by` field is set correctly

### Activity Logs Not Appearing

1. Check Supabase logs for insert errors
2. Verify RLS policies allow inserts to `user_activity_log`
3. Check that the user is properly authenticated
4. Look for network errors in the app console

## Database Functions Reference

### Core Functions

- `get_user_role(user_uuid)` - Returns user's role
- `is_super_user(user_uuid)` - Returns true if super user
- `assign_user_role(target_user_id, role, granted_by)` - Assigns role

### Triggers

- `on_auth_user_created` - Automatically assigns `standard_user` role to new users

### Views

- `user_management` - Aggregated user data for admin dashboard

## Monitoring and Analytics

### Key Metrics Tracked

- Total users
- Active users
- User role distribution
- Activity patterns
- Feature usage

### Admin Dashboard Features

- User statistics overview
- Recent user activity
- User management interface
- Analytics data viewing
- Role management tools

## Best Practices

1. **Limit Super Users**: Only assign super user role to trusted administrators
2. **Regular Audits**: Periodically review user roles and activity logs
3. **Secure Access**: Use strong passwords and enable 2FA for admin accounts
4. **Monitor Activity**: Regularly check admin dashboard for unusual activity
5. **Backup Data**: Ensure regular backups of user roles and activity logs

## Support

If you encounter issues with user roles:

1. Check the Supabase logs
2. Verify RLS policies are correctly configured
3. Test role functions in the SQL editor
4. Review the activity logs for clues
5. Contact support with specific error messages
