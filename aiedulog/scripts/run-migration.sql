-- =====================================================================
-- QUICK MANUAL MIGRATION RUNNER
-- =====================================================================
-- Copy and paste this into Supabase SQL Editor to fix the system issues
-- =====================================================================

-- 1. Create basic identity system tables
CREATE TABLE IF NOT EXISTS identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  role VARCHAR(50) DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  provider_user_id UUID NOT NULL UNIQUE,
  provider_type VARCHAR(50) NOT NULL DEFAULT 'supabase',
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  nickname VARCHAR(100),
  full_name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identity_id),
  UNIQUE(email)
);

-- 2. Create footer management tables
CREATE TABLE IF NOT EXISTS footer_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ko VARCHAR(255) NOT NULL,
  title_en VARCHAR(255),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS footer_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE IF NOT EXISTS footer_social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(100) NOT NULL,
  icon_name VARCHAR(100) NOT NULL,
  url VARCHAR(500) NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS footer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value_ko TEXT,
  setting_value_en TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create security violations table
CREATE TABLE IF NOT EXISTS security_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium',
  source_ip INET,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS and create policies
ALTER TABLE identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE footer_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE footer_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE footer_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE footer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_violations ENABLE ROW LEVEL SECURITY;

-- Basic read policies for identity system
DROP POLICY IF EXISTS identities_read_policy ON identities;
CREATE POLICY identities_read_policy ON identities FOR SELECT USING (true);

DROP POLICY IF EXISTS auth_methods_read_policy ON auth_methods;
CREATE POLICY auth_methods_read_policy ON auth_methods FOR SELECT USING (true);

DROP POLICY IF EXISTS user_profiles_read_policy ON user_profiles;
CREATE POLICY user_profiles_read_policy ON user_profiles FOR SELECT USING (true);

-- Public read policies for footer
DROP POLICY IF EXISTS footer_categories_read_policy ON footer_categories;
CREATE POLICY footer_categories_read_policy ON footer_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS footer_links_read_policy ON footer_links;
CREATE POLICY footer_links_read_policy ON footer_links FOR SELECT USING (true);

DROP POLICY IF EXISTS footer_social_links_read_policy ON footer_social_links;
CREATE POLICY footer_social_links_read_policy ON footer_social_links FOR SELECT USING (true);

DROP POLICY IF EXISTS footer_settings_read_policy ON footer_settings;
CREATE POLICY footer_settings_read_policy ON footer_settings FOR SELECT USING (true);

-- Allow violation reports
DROP POLICY IF EXISTS security_violations_insert_policy ON security_violations;
CREATE POLICY security_violations_insert_policy ON security_violations FOR INSERT WITH CHECK (true);

-- 5. Insert sample footer data
INSERT INTO footer_settings (setting_key, setting_value_ko, setting_value_en) VALUES
('copyright', '© 2025 AIedulog. All rights reserved.', '© 2025 AIedulog. All rights reserved.'),
('contact_email', 'contact@aiedulog.com', 'contact@aiedulog.com')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO footer_categories (title_ko, title_en, display_order) VALUES
('서비스', 'Services', 1),
('고객지원', 'Support', 2)
ON CONFLICT DO NOTHING;

-- 6. Create the specific user identity for testing
INSERT INTO identities (auth_user_id, status, role) VALUES
('e08292ee-483a-4182-8c6a-a8015115ddbf', 'active', 'member')
ON CONFLICT (auth_user_id) DO NOTHING;

INSERT INTO auth_methods (identity_id, provider_user_id, provider_type, is_primary) 
SELECT i.id, 'e08292ee-483a-4182-8c6a-a8015115ddbf', 'supabase', true
FROM identities i 
WHERE i.auth_user_id = 'e08292ee-483a-4182-8c6a-a8015115ddbf'
ON CONFLICT (provider_user_id) DO NOTHING;

INSERT INTO user_profiles (identity_id, email, role, nickname) 
SELECT i.id, 'dellacmoment@gmail.com', 'member', 'Test User'
FROM identities i 
WHERE i.auth_user_id = 'e08292ee-483a-4182-8c6a-a8015115ddbf'
ON CONFLICT (identity_id) DO NOTHING;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_identities_auth_user_id ON identities(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_auth_methods_provider_user_id ON auth_methods(provider_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_identity_id ON user_profiles(identity_id);
CREATE INDEX IF NOT EXISTS idx_footer_categories_active ON footer_categories(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_footer_settings_key ON footer_settings(setting_key);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'CRITICAL SYSTEM FIXES APPLIED SUCCESSFULLY!';
  RAISE NOTICE 'Tables created: identities, auth_methods, user_profiles, footer_*, security_violations';
  RAISE NOTICE 'Test user created: e08292ee-483a-4182-8c6a-a8015115ddbf / dellacmoment@gmail.com';
  RAISE NOTICE 'System should now be functional!';
END $$;