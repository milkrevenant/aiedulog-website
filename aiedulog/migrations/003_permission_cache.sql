-- =============================================================================
-- Migration 003: Permission Cache with Materialized View
-- Created: 2025-10-13
-- Purpose: Create materialized view for permission caching to improve RLS performance
-- =============================================================================

-- Create materialized view for user permissions
-- This dramatically improves RLS policy performance by caching user role checks
CREATE MATERIALIZED VIEW user_permission_cache AS
SELECT
  up.user_id,
  up.role,
  up.is_active,
  up.email,
  CASE WHEN up.role IN ('admin', 'super_admin') THEN true ELSE false END as is_admin,
  CASE WHEN up.role IN ('admin', 'moderator', 'super_admin') THEN true ELSE false END as is_moderator,
  CASE WHEN up.is_active = true THEN true ELSE false END as is_verified_member,
  up.last_active_at
FROM user_profiles up;

-- Create indexes on the materialized view for fast lookups
CREATE UNIQUE INDEX idx_user_permission_cache_user_id ON user_permission_cache(user_id);
CREATE INDEX idx_user_permission_cache_role ON user_permission_cache(role);
CREATE INDEX idx_user_permission_cache_admin ON user_permission_cache(is_admin) WHERE is_admin = true;

COMMENT ON MATERIALIZED VIEW user_permission_cache IS 'Cached user permissions for RLS performance optimization';

-- =============================================================================
-- PERMISSION CHECK FUNCTIONS
-- =============================================================================

-- Function to check if user is admin (uses cache)
CREATE OR REPLACE FUNCTION is_user_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT is_admin FROM user_permission_cache WHERE user_id = check_user_id;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION is_user_admin(UUID) IS 'Check if user has admin privileges using permission cache';

-- Function to check if user is moderator (uses cache)
CREATE OR REPLACE FUNCTION is_user_moderator(check_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT is_moderator FROM user_permission_cache WHERE user_id = check_user_id;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION is_user_moderator(UUID) IS 'Check if user has moderator privileges using permission cache';

-- =============================================================================
-- CACHE REFRESH FUNCTIONS
-- =============================================================================

-- Manual refresh function for permission cache
CREATE OR REPLACE FUNCTION refresh_user_permission_cache()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_permission_cache;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_user_permission_cache() IS 'Manually refresh the user permission cache';

-- Trigger function to auto-refresh cache on user_profiles changes
CREATE OR REPLACE FUNCTION trigger_refresh_permission_cache()
RETURNS trigger AS $$
BEGIN
  PERFORM refresh_user_permission_cache();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on user_profiles table
CREATE TRIGGER user_profiles_changed
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_permission_cache();

COMMENT ON TRIGGER user_profiles_changed ON user_profiles IS 'Auto-refresh permission cache when user profiles change';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_user_admin(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION is_user_moderator(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION refresh_user_permission_cache() TO PUBLIC;
