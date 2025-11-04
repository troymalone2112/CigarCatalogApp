import { supabase } from './supabaseService';
import {
  UserRole,
  UserRoleData,
  AdminAnalytics,
  UserActivityLog,
  UserManagementData,
} from '../types';

export class UserManagementService {
  // ========== ROLE MANAGEMENT ==========

  /**
   * Get the current user's role
   */
  static async getCurrentUserRole(): Promise<UserRole | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      // Check if user_roles table exists by trying to query it directly
      const { data, error } = await supabase
        .from('user_roles')
        .select('role_type')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error) {
        console.log('User roles table not set up yet, defaulting to standard_user');
        return 'standard_user';
      }

      return (data?.role_type as UserRole) || 'standard_user';
    } catch (error) {
      console.error('Error getting user role:', error);
      return 'standard_user';
    }
  }

  /**
   * Check if current user is a super user
   */
  static async isSuperUser(): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      // Check if user_roles table exists by trying to query it directly
      const { data, error } = await supabase
        .from('user_roles')
        .select('role_type')
        .eq('user_id', user.id)
        .eq('role_type', 'super_user')
        .eq('is_active', true)
        .single();

      if (error) {
        console.log('User roles table not set up yet, defaulting to false');
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking super user status:', error);
      return false;
    }
  }

  /**
   * Assign a role to a user (super users only)
   */
  static async assignUserRole(targetUserId: string, role: UserRole): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('assign_user_role', {
        target_user_id: targetUserId,
        role: role,
      });

      if (error) {
        console.error('Error assigning user role:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error assigning user role:', error);
      return false;
    }
  }

  /**
   * Get all user roles (super users only)
   */
  static async getAllUserRoles(): Promise<UserRoleData[]> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }

      return data.map((role) => ({
        ...role,
        grantedAt: new Date(role.granted_at),
        createdAt: new Date(role.created_at),
        updatedAt: new Date(role.updated_at),
      }));
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }
  }

  // ========== USER MANAGEMENT ==========

  /**
   * Get user management data (super users only)
   */
  static async getUserManagementData(): Promise<UserManagementData[]> {
    try {
      const { data, error } = await supabase
        .from('user_management')
        .select('*')
        .order('user_created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user management data:', error);
        return [];
      }

      return data.map((user) => ({
        ...user,
        userCreatedAt: new Date(user.user_created_at),
        lastSignInAt: user.last_sign_in_at ? new Date(user.last_sign_in_at) : undefined,
        grantedAt: user.granted_at ? new Date(user.granted_at) : undefined,
      }));
    } catch (error) {
      console.error('Error fetching user management data:', error);
      return [];
    }
  }

  /**
   * Update user role (super users only)
   */
  static async updateUserRole(userId: string, newRole: UserRole): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({
          role_type: newRole,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating user role:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating user role:', error);
      return false;
    }
  }

  /**
   * Deactivate user role (super users only)
   */
  static async deactivateUserRole(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error deactivating user role:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deactivating user role:', error);
      return false;
    }
  }

  // ========== ANALYTICS ==========

  /**
   * Record analytics data (super users only)
   */
  static async recordAnalytics(
    metricName: string,
    metricValue: Record<string, any>,
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from('admin_analytics').insert({
        metric_name: metricName,
        metric_value: metricValue,
        date_recorded: new Date().toISOString(),
      });

      if (error) {
        console.error('Error recording analytics:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error recording analytics:', error);
      return false;
    }
  }

  /**
   * Get analytics data (super users only)
   */
  static async getAnalytics(
    metricName?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AdminAnalytics[]> {
    try {
      let query = supabase
        .from('admin_analytics')
        .select('*')
        .order('date_recorded', { ascending: false });

      if (metricName) {
        query = query.eq('metric_name', metricName);
      }

      if (startDate) {
        query = query.gte('date_recorded', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('date_recorded', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching analytics:', error);
        return [];
      }

      return data.map((analytics) => ({
        ...analytics,
        dateRecorded: new Date(analytics.date_recorded),
        createdAt: new Date(analytics.created_at),
      }));
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return [];
    }
  }

  /**
   * Get user statistics (super users only)
   */
  static async getUserStatistics(): Promise<{
    totalUsers: number;
    superUsers: number;
    standardUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_user_statistics');

      if (error) {
        console.error('Error fetching user statistics:', error);
        return {
          totalUsers: 0,
          superUsers: 0,
          standardUsers: 0,
          activeUsers: 0,
          newUsersThisMonth: 0,
        };
      }

      return data;
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      return {
        totalUsers: 0,
        superUsers: 0,
        standardUsers: 0,
        activeUsers: 0,
        newUsersThisMonth: 0,
      };
    }
  }

  // ========== ACTIVITY LOGGING ==========

  /**
   * Log user activity
   */
  static async logUserActivity(
    action: string,
    resourceType?: string,
    resourceId?: string,
    metadata?: Record<string, any>,
  ): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase.from('user_activity_log').insert({
        user_id: user.id,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata,
        ip_address: null, // Could be populated from request headers
        user_agent: null, // Could be populated from request headers
      });

      if (error) {
        console.log('Activity logging not available yet (user_activity_log table not set up)');
        return false;
      }

      return true;
    } catch (error) {
      console.log('Activity logging not available yet (user_activity_log table not set up)');
      return false;
    }
  }

  /**
   * Get user activity logs (super users only)
   */
  static async getUserActivityLogs(
    userId?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100,
  ): Promise<UserActivityLog[]> {
    try {
      let query = supabase
        .from('user_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching user activity logs:', error);
        return [];
      }

      return data.map((log) => ({
        ...log,
        createdAt: new Date(log.created_at),
      }));
    } catch (error) {
      console.error('Error fetching user activity logs:', error);
      return [];
    }
  }

  // ========== HELPER FUNCTIONS ==========

  /**
   * Check if user has permission to access admin features
   */
  static async hasAdminAccess(): Promise<boolean> {
    return await this.isSuperUser();
  }

  /**
   * Get current user's permissions
   */
  static async getCurrentUserPermissions(): Promise<{
    role: UserRole | null;
    isSuperUser: boolean;
    canAccessAdmin: boolean;
  }> {
    const role = await this.getCurrentUserRole();
    const isSuperUser = await this.isSuperUser();

    return {
      role,
      isSuperUser,
      canAccessAdmin: isSuperUser,
    };
  }

  /**
   * Format user role for display
   */
  static formatUserRole(role: UserRole): string {
    switch (role) {
      case 'super_user':
        return 'Super User';
      case 'standard_user':
        return 'Standard User';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get role badge color for UI
   */
  static getRoleBadgeColor(role: UserRole): string {
    switch (role) {
      case 'super_user':
        return '#DC851F'; // Amber
      case 'standard_user':
        return '#999999'; // Gray
      default:
        return '#666666';
    }
  }
}
