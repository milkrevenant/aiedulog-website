-- =============================================================================
-- Migration 001: JWT Extraction Function for Cognito
-- Created: 2025-10-13
-- Purpose: Extract user_id from Cognito JWT tokens for RLS policies
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create function to extract current user ID from Cognito JWT
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
DECLARE
  jwt_claims jsonb;
  cognito_sub text;
  found_user_id uuid;
BEGIN
  -- Try to get JWT claims from session variable
  BEGIN
    jwt_claims := current_setting('request.jwt.claims', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  -- Check if JWT claims exist
  IF jwt_claims IS NULL THEN
    RETURN NULL;
  END IF;

  -- Extract Cognito sub (user identifier)
  cognito_sub := jwt_claims->>'sub';

  -- Validate cognito_sub
  IF cognito_sub IS NULL OR cognito_sub = '' THEN
    RETURN NULL;
  END IF;

  -- Look up user_id from auth_methods table
  SELECT user_id INTO found_user_id
  FROM auth_methods
  WHERE provider = 'cognito'
    AND auth_provider_id = cognito_sub
  LIMIT 1;

  RETURN found_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION get_current_user_id() IS 'Extracts user_id from Cognito JWT claims for RLS policies';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_current_user_id() TO PUBLIC;
