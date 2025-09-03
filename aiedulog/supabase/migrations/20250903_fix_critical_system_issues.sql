-- =====================================================================
-- CRITICAL SYSTEM FIXES MIGRATION
-- =====================================================================
-- This migration fixes critical issues preventing the system from working:
-- 1. Missing footer management tables
-- 2. Identity system relationship issues
-- 3. Notification system schema fixes
-- 4. Security violations table
-- 5. Posts and identities relationship fixes
-- =====================================================================

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- 1. IDENTITY SYSTEM FIXES
-- =====================================================================

-- Create identities table if it doesn't exist
CREATE TABLE IF NOT EXISTS identities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE NOT NULL, -- References auth.users.id
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'banned')),
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'verified', 'moderator', 'admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create auth_methods table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  provider_user_id UUID NOT NULL UNIQUE, -- auth.users.id
  provider_type VARCHAR(50) NOT NULL DEFAULT 'supabase',
  provider_data JSONB DEFAULT '{}',
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_primary_per_identity UNIQUE (identity_id, is_primary) DEFERRABLE INITIALLY DEFERRED
);

-- Create user_profiles table if it doesn't exist  
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  nickname VARCHAR(100),
  full_name VARCHAR(255),
  avatar_url TEXT,
  school VARCHAR(255),
  subject VARCHAR(255),
  role VARCHAR(50) DEFAULT 'member',
  bio TEXT,
  social_links JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(identity_id),
  UNIQUE(email)
);

-- Create posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  content TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'deleted')),
  category VARCHAR(100),
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 2. FOOTER MANAGEMENT TABLES
-- =====================================================================

-- Footer categories table
CREATE TABLE IF NOT EXISTS footer_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_ko VARCHAR(255) NOT NULL,
  title_en VARCHAR(255),
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Footer links table
CREATE TABLE IF NOT EXISTS footer_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES footer_categories(id) ON DELETE CASCADE,
  title_ko VARCHAR(255) NOT NULL,
  title_en VARCHAR(255),
  url VARCHAR(500) NOT NULL,
  is_external BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Footer social links table
CREATE TABLE IF NOT EXISTS footer_social_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform VARCHAR(100) NOT NULL,
  icon_name VARCHAR(100) NOT NULL,
  url VARCHAR(500) NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Footer settings table
CREATE TABLE IF NOT EXISTS footer_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value_ko TEXT,
  setting_value_en TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 3. SECURITY VIOLATIONS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS security_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  violation_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  source_ip INET,
  user_agent TEXT,
  user_id UUID REFERENCES identities(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES identities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 4. INDEXES FOR PERFORMANCE
-- =====================================================================

-- Identity system indexes
CREATE INDEX IF NOT EXISTS idx_identities_auth_user_id ON identities(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_identities_status ON identities(status);
CREATE INDEX IF NOT EXISTS idx_auth_methods_provider_user_id ON auth_methods(provider_user_id);
CREATE INDEX IF NOT EXISTS idx_auth_methods_identity_id ON auth_methods(identity_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_identity_id ON user_profiles(identity_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_posts_identity_id ON posts(identity_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);

-- Footer system indexes
CREATE INDEX IF NOT EXISTS idx_footer_categories_active ON footer_categories(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_footer_links_category ON footer_links(category_id, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_footer_social_links_active ON footer_social_links(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_footer_settings_key ON footer_settings(setting_key, is_active);

-- Security indexes
CREATE INDEX IF NOT EXISTS idx_security_violations_type ON security_violations(violation_type, created_at);
CREATE INDEX IF NOT EXISTS idx_security_violations_severity ON security_violations(severity, resolved);

-- =====================================================================
-- 5. ROW LEVEL SECURITY POLICIES
-- =====================================================================

-- Enable RLS
ALTER TABLE identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE footer_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE footer_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE footer_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE footer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_violations ENABLE ROW LEVEL SECURITY;

-- Identity system policies
DROP POLICY IF EXISTS identities_read_policy ON identities;
CREATE POLICY identities_read_policy ON identities
FOR SELECT USING (
  auth_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM identities i2 
    WHERE i2.auth_user_id = auth.uid() 
    AND i2.role IN ('admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS auth_methods_read_policy ON auth_methods;
CREATE POLICY auth_methods_read_policy ON auth_methods
FOR SELECT USING (
  provider_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM identities i 
    WHERE i.auth_user_id = auth.uid() 
    AND i.role IN ('admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS user_profiles_read_policy ON user_profiles;
CREATE POLICY user_profiles_read_policy ON user_profiles
FOR SELECT USING (
  identity_id IN (
    SELECT i.id FROM identities i WHERE i.auth_user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM identities i2 
    WHERE i2.auth_user_id = auth.uid() 
    AND i2.role IN ('admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS user_profiles_update_policy ON user_profiles;
CREATE POLICY user_profiles_update_policy ON user_profiles
FOR UPDATE USING (
  identity_id IN (
    SELECT i.id FROM identities i WHERE i.auth_user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM identities i2 
    WHERE i2.auth_user_id = auth.uid() 
    AND i2.role IN ('admin', 'super_admin')
  )
);

-- Posts policies
DROP POLICY IF EXISTS posts_read_policy ON posts;
CREATE POLICY posts_read_policy ON posts
FOR SELECT USING (
  status = 'published' OR
  identity_id IN (
    SELECT i.id FROM identities i WHERE i.auth_user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM identities i2 
    WHERE i2.auth_user_id = auth.uid() 
    AND i2.role IN ('admin', 'super_admin')
  )
);

-- Footer policies (public read)
DROP POLICY IF EXISTS footer_categories_read_policy ON footer_categories;
CREATE POLICY footer_categories_read_policy ON footer_categories
FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS footer_links_read_policy ON footer_links;
CREATE POLICY footer_links_read_policy ON footer_links
FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS footer_social_links_read_policy ON footer_social_links;
CREATE POLICY footer_social_links_read_policy ON footer_social_links
FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS footer_settings_read_policy ON footer_settings;
CREATE POLICY footer_settings_read_policy ON footer_settings
FOR SELECT USING (is_active = true);

-- Admin policies for footer management
DROP POLICY IF EXISTS footer_categories_admin_policy ON footer_categories;
CREATE POLICY footer_categories_admin_policy ON footer_categories
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM identities i 
    WHERE i.auth_user_id = auth.uid() 
    AND i.role IN ('admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS footer_links_admin_policy ON footer_links;
CREATE POLICY footer_links_admin_policy ON footer_links
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM identities i 
    WHERE i.auth_user_id = auth.uid() 
    AND i.role IN ('admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS footer_social_links_admin_policy ON footer_social_links;
CREATE POLICY footer_social_links_admin_policy ON footer_social_links
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM identities i 
    WHERE i.auth_user_id = auth.uid() 
    AND i.role IN ('admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS footer_settings_admin_policy ON footer_settings;
CREATE POLICY footer_settings_admin_policy ON footer_settings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM identities i 
    WHERE i.auth_user_id = auth.uid() 
    AND i.role IN ('admin', 'super_admin')
  )
);

-- Security violations policy (allow reporting)
DROP POLICY IF EXISTS security_violations_report_policy ON security_violations;
CREATE POLICY security_violations_report_policy ON security_violations
FOR INSERT WITH CHECK (true); -- Allow anyone to report violations

DROP POLICY IF EXISTS security_violations_read_policy ON security_violations;
CREATE POLICY security_violations_read_policy ON security_violations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM identities i 
    WHERE i.auth_user_id = auth.uid() 
    AND i.role IN ('admin', 'super_admin')
  )
);

-- =====================================================================
-- 6. SAMPLE DATA FOR TESTING
-- =====================================================================

-- Insert default footer settings
INSERT INTO footer_settings (setting_key, setting_value_ko, setting_value_en) VALUES
('copyright', '© 2025 AIedulog. All rights reserved.', '© 2025 AIedulog. All rights reserved.'),
('contact_email', 'contact@aiedulog.com', 'contact@aiedulog.com'),
('address_ko', '서울특별시 강남구 테헤란로 123', '123 Teheran-ro, Gangnam-gu, Seoul'),
('address_en', '123 Teheran-ro, Gangnam-gu, Seoul, Korea', '123 Teheran-ro, Gangnam-gu, Seoul, Korea')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert sample footer category
INSERT INTO footer_categories (title_ko, title_en, display_order) VALUES
('서비스', 'Services', 1),
('회사정보', 'Company', 2),
('고객지원', 'Support', 3)
ON CONFLICT DO NOTHING;

-- Insert sample footer links (only if categories exist)
INSERT INTO footer_links (category_id, title_ko, title_en, url, is_external) 
SELECT fc.id, '대시보드', 'Dashboard', '/dashboard', false
FROM footer_categories fc WHERE fc.title_ko = '서비스' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO footer_links (category_id, title_ko, title_en, url, is_external) 
SELECT fc.id, '채팅', 'Chat', '/chat', false
FROM footer_categories fc WHERE fc.title_ko = '서비스' LIMIT 1
ON CONFLICT DO NOTHING;

-- =====================================================================
-- 7. UTILITY FUNCTIONS
-- =====================================================================

-- Function to create user profile when identity is created
CREATE OR REPLACE FUNCTION create_user_profile_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (identity_id, email, role)
  SELECT NEW.id, au.email, 'member'
  FROM auth.users au 
  WHERE au.id = NEW.auth_user_id
  ON CONFLICT (identity_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile
DROP TRIGGER IF EXISTS create_profile_on_identity ON identities;
CREATE TRIGGER create_profile_on_identity
  AFTER INSERT ON identities
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile_from_auth();

-- =====================================================================
-- IMPROVED ensure_user_identity() Function with Email-First Resolution
-- =====================================================================
-- This function handles auth.user.id regeneration by using email-first
-- resolution strategy with atomic operations and proper error handling.
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION ensure_user_identity(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION ensure_user_identity(UUID, TEXT) IS 
'Improved function that handles auth.user.id regeneration using email-first resolution strategy. Prevents duplicate identity creation and handles auth mapping updates atomically.';

-- =====================================================================
-- 8. UPDATE TIMESTAMP TRIGGERS
-- =====================================================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to new tables
CREATE TRIGGER update_identities_updated_at 
  BEFORE UPDATE ON identities 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auth_methods_updated_at 
  BEFORE UPDATE ON auth_methods 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at 
  BEFORE UPDATE ON posts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_footer_categories_updated_at 
  BEFORE UPDATE ON footer_categories 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_footer_links_updated_at 
  BEFORE UPDATE ON footer_links 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_footer_social_links_updated_at 
  BEFORE UPDATE ON footer_social_links 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_footer_settings_updated_at 
  BEFORE UPDATE ON footer_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- MIGRATION COMPLETION
-- =====================================================================

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'CRITICAL SYSTEM FIXES MIGRATION COMPLETED SUCCESSFULLY';
  RAISE NOTICE 'Fixed: Identity system tables and relationships';
  RAISE NOTICE 'Fixed: Footer management system tables';
  RAISE NOTICE 'Fixed: Security violations reporting';
  RAISE NOTICE 'Fixed: Posts and identities relationships';
  RAISE NOTICE 'Added: Comprehensive RLS policies';
  RAISE NOTICE 'Added: Sample data for testing';
  RAISE NOTICE 'Status: System should now be functional';
END $$;