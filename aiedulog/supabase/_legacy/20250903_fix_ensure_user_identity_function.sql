-- =====================================================================
-- Fix ensure_user_identity() Function for auth.user.id Regeneration
-- =====================================================================
-- This migration fixes the critical issue where auth.user.id regeneration
-- causes duplicate identities to be created. The improved function uses
-- email-first resolution strategy with atomic operations.
-- =====================================================================

-- Drop existing function first
DROP FUNCTION IF EXISTS ensure_user_identity(UUID, TEXT);

-- =====================================================================
-- IMPROVED ensure_user_identity() Function
-- =====================================================================
-- This function handles auth.user.id regeneration by:
-- 1. Primary lookup by email (most stable identifier)
-- 2. Update auth mapping when provider_user_id changes
-- 3. Prevent duplicate identity creation
-- 4. Handle missing profiles gracefully
-- 5. Ensure all operations are atomic
-- =====================================================================

CREATE OR REPLACE FUNCTION ensure_user_identity(
  new_auth_user_id UUID, 
  user_email TEXT
)
RETURNS UUID AS $$
DECLARE
  identity_record RECORD;
  existing_identity_id UUID;
  existing_auth_method_id UUID;
  profile_exists BOOLEAN := FALSE;
BEGIN
  -- Validate inputs
  IF new_auth_user_id IS NULL OR user_email IS NULL OR user_email = '' THEN
    RAISE EXCEPTION 'ensure_user_identity: auth_user_id and user_email cannot be null or empty';
  END IF;

  -- =====================================================================
  -- STEP 1: PRIMARY LOOKUP BY EMAIL (Most Stable Identifier)
  -- =====================================================================
  -- Email is the most stable identifier across auth provider changes
  -- This prevents duplicate identity creation when auth.user.id changes
  
  SELECT 
    i.id as identity_id,
    i.auth_user_id,
    am.id as auth_method_id,
    am.provider_user_id,
    EXISTS(SELECT 1 FROM user_profiles up WHERE up.identity_id = i.id) as has_profile
  INTO identity_record
  FROM identities i
  LEFT JOIN auth_methods am ON am.identity_id = i.id AND am.is_primary = true
  LEFT JOIN user_profiles up ON up.identity_id = i.id
  WHERE up.email = user_email
  LIMIT 1;

  -- =====================================================================
  -- STEP 2: HANDLE EXISTING IDENTITY WITH EMAIL MATCH
  -- =====================================================================
  IF identity_record.identity_id IS NOT NULL THEN
    existing_identity_id := identity_record.identity_id;
    
    -- Check if auth_user_id has changed (regeneration scenario)
    IF identity_record.auth_user_id != new_auth_user_id THEN
      -- Update the identity's auth_user_id
      UPDATE identities 
      SET 
        auth_user_id = new_auth_user_id,
        updated_at = NOW()
      WHERE id = existing_identity_id;
      
      -- Update or create auth_method with new provider_user_id
      IF identity_record.auth_method_id IS NOT NULL THEN
        UPDATE auth_methods 
        SET 
          provider_user_id = new_auth_user_id,
          updated_at = NOW()
        WHERE id = identity_record.auth_method_id;
      ELSE
        -- Create missing auth_method
        INSERT INTO auth_methods (
          identity_id, 
          provider_user_id, 
          provider_type, 
          is_primary
        )
        VALUES (
          existing_identity_id, 
          new_auth_user_id, 
          'supabase', 
          true
        );
      END IF;
    END IF;
    
    -- Ensure profile exists (defensive programming)
    IF NOT identity_record.has_profile THEN
      INSERT INTO user_profiles (identity_id, email)
      VALUES (existing_identity_id, user_email)
      ON CONFLICT (identity_id) DO NOTHING;
    END IF;
    
    RETURN existing_identity_id;
  END IF;

  -- =====================================================================
  -- STEP 3: FALLBACK LOOKUP BY PROVIDER_USER_ID
  -- =====================================================================
  -- This handles cases where email might have changed but auth_user_id is stable
  -- Also handles migration scenarios
  
  SELECT 
    i.id as identity_id,
    EXISTS(SELECT 1 FROM user_profiles up WHERE up.identity_id = i.id) as has_profile
  INTO identity_record
  FROM identities i
  JOIN auth_methods am ON am.identity_id = i.id
  WHERE am.provider_user_id = new_auth_user_id
  LIMIT 1;

  IF identity_record.identity_id IS NOT NULL THEN
    existing_identity_id := identity_record.identity_id;
    
    -- Update identity's auth_user_id for consistency
    UPDATE identities 
    SET 
      auth_user_id = new_auth_user_id,
      updated_at = NOW()
    WHERE id = existing_identity_id;
    
    -- Create profile if missing, or update email if it changed
    IF identity_record.has_profile THEN
      -- Update profile email if it has changed
      UPDATE user_profiles 
      SET 
        email = user_email,
        updated_at = NOW()
      WHERE identity_id = existing_identity_id 
        AND email != user_email;
    ELSE
      -- Create missing profile
      INSERT INTO user_profiles (identity_id, email)
      VALUES (existing_identity_id, user_email)
      ON CONFLICT (identity_id) DO NOTHING;
    END IF;
    
    RETURN existing_identity_id;
  END IF;

  -- =====================================================================
  -- STEP 4: CREATE NEW IDENTITY (No Existing Match Found)
  -- =====================================================================
  -- This only executes when truly new user with no existing identity
  
  -- Use atomic transaction to prevent race conditions
  BEGIN
    -- Create new identity
    INSERT INTO identities (auth_user_id, status, role)
    VALUES (new_auth_user_id, 'active', 'member')
    RETURNING id INTO existing_identity_id;
    
    -- Create auth method
    INSERT INTO auth_methods (
      identity_id, 
      provider_user_id, 
      provider_type, 
      is_primary
    )
    VALUES (
      existing_identity_id, 
      new_auth_user_id, 
      'supabase', 
      true
    );
    
    -- Create user profile
    INSERT INTO user_profiles (identity_id, email)
    VALUES (existing_identity_id, user_email);
    
  EXCEPTION 
    WHEN unique_violation THEN
      -- Handle race condition: another process created identity
      -- Retry the lookup to get the existing identity
      SELECT i.id INTO existing_identity_id
      FROM identities i
      JOIN user_profiles up ON up.identity_id = i.id
      WHERE up.email = user_email OR i.auth_user_id = new_auth_user_id
      LIMIT 1;
      
      IF existing_identity_id IS NULL THEN
        -- If still not found, re-raise the original exception
        RAISE;
      END IF;
  END;

  -- =====================================================================
  -- STEP 5: FINAL VALIDATION & RETURN
  -- =====================================================================
  
  -- Ensure we have a valid identity_id to return
  IF existing_identity_id IS NULL THEN
    RAISE EXCEPTION 'ensure_user_identity: Failed to create or find identity for email %', user_email;
  END IF;

  -- Final verification that profile exists
  SELECT EXISTS(
    SELECT 1 FROM user_profiles 
    WHERE identity_id = existing_identity_id
  ) INTO profile_exists;
  
  IF NOT profile_exists THEN
    -- Last resort: create profile if somehow missing
    INSERT INTO user_profiles (identity_id, email)
    VALUES (existing_identity_id, user_email)
    ON CONFLICT (identity_id) DO NOTHING;
  END IF;

  RETURN existing_identity_id;

EXCEPTION 
  WHEN OTHERS THEN
    -- Log error details for debugging
    RAISE NOTICE 'ensure_user_identity error: % for auth_user_id=%, email=%', 
      SQLERRM, new_auth_user_id, user_email;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- IMPROVED ensure_user_identity_safe() Function
-- =====================================================================
-- A safer wrapper that handles exceptions gracefully and provides
-- better error reporting for application code
-- =====================================================================

CREATE OR REPLACE FUNCTION ensure_user_identity_safe(
  new_auth_user_id UUID, 
  user_email TEXT
)
RETURNS TABLE(
  identity_id UUID,
  success BOOLEAN,
  error_message TEXT
) AS $$
BEGIN
  -- Attempt to ensure identity
  BEGIN
    RETURN QUERY SELECT 
      ensure_user_identity(new_auth_user_id, user_email),
      true::BOOLEAN,
      NULL::TEXT;
  EXCEPTION 
    WHEN OTHERS THEN
      -- Return error information instead of raising
      RETURN QUERY SELECT 
        NULL::UUID,
        false::BOOLEAN,
        SQLERRM::TEXT;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- Data Cleanup and Migration Utilities
-- =====================================================================

-- Function to identify and merge duplicate identities by email
CREATE OR REPLACE FUNCTION identify_duplicate_identities()
RETURNS TABLE(
  email TEXT,
  identity_count BIGINT,
  identity_ids UUID[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.email,
    COUNT(DISTINCT i.id) as identity_count,
    ARRAY_AGG(DISTINCT i.id) as identity_ids
  FROM identities i
  JOIN user_profiles up ON up.identity_id = i.id
  GROUP BY up.email
  HAVING COUNT(DISTINCT i.id) > 1
  ORDER BY COUNT(DISTINCT i.id) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to fix orphaned auth_methods (without identity reference)
CREATE OR REPLACE FUNCTION fix_orphaned_auth_methods()
RETURNS INTEGER AS $$
DECLARE
  fixed_count INTEGER := 0;
BEGIN
  -- Delete auth_methods that reference non-existent identities
  DELETE FROM auth_methods am
  WHERE NOT EXISTS (
    SELECT 1 FROM identities i WHERE i.id = am.identity_id
  );
  
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  
  RAISE NOTICE 'Fixed % orphaned auth_methods', fixed_count;
  RETURN fixed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to fix missing auth_methods for identities
CREATE OR REPLACE FUNCTION fix_missing_auth_methods()
RETURNS INTEGER AS $$
DECLARE
  fixed_count INTEGER := 0;
BEGIN
  -- Create missing auth_methods for identities that don't have them
  INSERT INTO auth_methods (identity_id, provider_user_id, provider_type, is_primary)
  SELECT 
    i.id,
    i.auth_user_id,
    'supabase',
    true
  FROM identities i
  WHERE NOT EXISTS (
    SELECT 1 FROM auth_methods am 
    WHERE am.identity_id = i.id
  )
  AND i.auth_user_id IS NOT NULL;
  
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  
  RAISE NOTICE 'Fixed % missing auth_methods', fixed_count;
  RETURN fixed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- Add Comments for Documentation
-- =====================================================================

COMMENT ON FUNCTION ensure_user_identity(UUID, TEXT) IS 
'Ensures user identity exists with email-first resolution strategy. 
Handles auth.user.id regeneration by updating provider_user_id when needed. 
Prevents duplicate identity creation through atomic operations.
Returns the identity UUID for the user.';

COMMENT ON FUNCTION ensure_user_identity_safe(UUID, TEXT) IS 
'Safe wrapper for ensure_user_identity that returns success/error information 
instead of raising exceptions. Use this in application code for better error handling.';

COMMENT ON FUNCTION identify_duplicate_identities() IS 
'Utility function to identify users with duplicate identities by email. 
Use this to find data inconsistencies that need manual cleanup.';

COMMENT ON FUNCTION fix_orphaned_auth_methods() IS 
'Utility function to clean up orphaned auth_methods records that reference 
non-existent identities. Run this as part of database maintenance.';

COMMENT ON FUNCTION fix_missing_auth_methods() IS 
'Utility function to create missing auth_methods for identities that dont have them. 
Useful for fixing data inconsistencies during migrations.';

-- =====================================================================
-- Grant Permissions
-- =====================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION ensure_user_identity(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_user_identity_safe(UUID, TEXT) TO authenticated;

-- Grant execute permissions on utility functions to service_role only
GRANT EXECUTE ON FUNCTION identify_duplicate_identities() TO service_role;
GRANT EXECUTE ON FUNCTION fix_orphaned_auth_methods() TO service_role;
GRANT EXECUTE ON FUNCTION fix_missing_auth_methods() TO service_role;

-- =====================================================================
-- Migration Complete
-- =====================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 20250903_fix_ensure_user_identity_function completed successfully';
  RAISE NOTICE 'Improved ensure_user_identity() function now handles:';
  RAISE NOTICE '- Email-first identity resolution';
  RAISE NOTICE '- Auth.user.id regeneration handling';
  RAISE NOTICE '- Atomic operations to prevent race conditions';
  RAISE NOTICE '- Robust error handling and validation';
  RAISE NOTICE '- Utility functions for data cleanup';
END $$;