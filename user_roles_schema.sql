-- User Roles Schema for Cigar Catalog App
-- This creates the foundation for role-based access control

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_type VARCHAR(20) NOT NULL CHECK (role_type IN ('super_user', 'standard_user')),
    granted_by UUID REFERENCES auth.users(id), -- Who granted this role
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one role per user
    UNIQUE(user_id)
);

-- Create admin_analytics table for super user analytics
CREATE TABLE IF NOT EXISTS admin_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value JSONB NOT NULL,
    date_recorded TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_activity_log table for tracking user actions
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50), -- 'cigar', 'journal_entry', 'inventory_item', etc.
    resource_id UUID,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_type ON user_roles(role_type);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_analytics_date ON admin_analytics(date_recorded);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Super users can view all roles" ON user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role_type = 'super_user' 
            AND ur.is_active = true
        )
    );

CREATE POLICY "Super users can manage roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role_type = 'super_user' 
            AND ur.is_active = true
        )
    );

-- RLS Policies for admin_analytics
CREATE POLICY "Super users can view analytics" ON admin_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role_type = 'super_user' 
            AND ur.is_active = true
        )
    );

CREATE POLICY "Super users can create analytics" ON admin_analytics
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role_type = 'super_user' 
            AND ur.is_active = true
        )
    );

-- RLS Policies for user_activity_log
CREATE POLICY "Users can view their own activity" ON user_activity_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Super users can view all activity" ON user_activity_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role_type = 'super_user' 
            AND ur.is_active = true
        )
    );

CREATE POLICY "System can log user activity" ON user_activity_log
    FOR INSERT WITH CHECK (true);

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role_type 
        FROM user_roles 
        WHERE user_id = user_uuid 
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is super user
CREATE OR REPLACE FUNCTION is_super_user(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT EXISTS (
            SELECT 1 
            FROM user_roles 
            WHERE user_id = user_uuid 
            AND role_type = 'super_user' 
            AND is_active = true
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign user role (super users only)
CREATE OR REPLACE FUNCTION assign_user_role(
    target_user_id UUID,
    role VARCHAR(20),
    granted_by_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if the granting user is a super user
    IF NOT is_super_user(granted_by_user_id) THEN
        RAISE EXCEPTION 'Only super users can assign roles';
    END IF;
    
    -- Insert or update the user role
    INSERT INTO user_roles (user_id, role_type, granted_by)
    VALUES (target_user_id, role, granted_by_user_id)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        role_type = EXCLUDED.role_type,
        granted_by = EXCLUDED.granted_by,
        granted_at = NOW(),
        is_active = true,
        updated_at = NOW();
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default standard user role on signup
CREATE OR REPLACE FUNCTION create_default_user_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Assign standard_user role by default
    INSERT INTO user_roles (user_id, role_type, granted_by)
    VALUES (NEW.id, 'standard_user', NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically assign standard_user role on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_role();

-- Insert your super user role (replace with your actual user ID)
-- You can get your user ID from the Supabase dashboard or auth.users table
-- INSERT INTO user_roles (user_id, role_type, granted_by) 
-- VALUES ('YOUR_USER_ID_HERE', 'super_user', 'YOUR_USER_ID_HERE')
-- ON CONFLICT (user_id) DO NOTHING;

-- Create a view for user management
CREATE OR REPLACE VIEW user_management AS
SELECT 
    u.id,
    u.email,
    u.created_at as user_created_at,
    u.last_sign_in_at,
    ur.role_type,
    ur.is_active as role_active,
    ur.granted_at,
    ur.granted_by,
    COALESCE(
        (SELECT COUNT(*) FROM user_activity_log ual WHERE ual.user_id = u.id),
        0
    ) as activity_count
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
ORDER BY u.created_at DESC;

-- Grant access to the view for super users
GRANT SELECT ON user_management TO authenticated;

-- Create RLS policy for the view
CREATE POLICY "Super users can view user management" ON user_management
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role_type = 'super_user' 
            AND ur.is_active = true
        )
    );

COMMENT ON TABLE user_roles IS 'User role assignments for role-based access control';
COMMENT ON TABLE admin_analytics IS 'Analytics data accessible only to super users';
COMMENT ON TABLE user_activity_log IS 'Log of user actions for analytics and monitoring';
COMMENT ON FUNCTION get_user_role(UUID) IS 'Returns the role type for a given user';
COMMENT ON FUNCTION is_super_user(UUID) IS 'Returns true if user is a super user';
COMMENT ON FUNCTION assign_user_role(UUID, VARCHAR, UUID) IS 'Assigns a role to a user (super users only)';
COMMENT ON FUNCTION create_default_user_role() IS 'Automatically assigns standard_user role to new users';






