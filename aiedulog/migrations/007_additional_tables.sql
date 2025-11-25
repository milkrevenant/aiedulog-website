-- Additional Tables for Complete Migration
-- Generated: 2025-10-13
-- Phase: Supabase → RDS Complete Migration

-- =============================================================================
-- FOOTER MANAGEMENT TABLES
-- =============================================================================

-- Footer Categories
CREATE TABLE IF NOT EXISTS footer_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_footer_categories_active ON footer_categories(is_active, display_order);

COMMENT ON TABLE footer_categories IS 'Footer menu categories';

-- Footer Links
CREATE TABLE IF NOT EXISTS footer_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES footer_categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    opens_new_tab BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_footer_links_category ON footer_links(category_id, display_order);

COMMENT ON TABLE footer_links IS 'Footer navigation links';

-- Footer Social Links
CREATE TABLE IF NOT EXISTS footer_social_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform TEXT NOT NULL,
    url TEXT NOT NULL,
    icon_name TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_footer_social_active ON footer_social_links(is_active, display_order);

COMMENT ON TABLE footer_social_links IS 'Social media links in footer';

-- Footer Settings
CREATE TABLE IF NOT EXISTS footer_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE footer_settings IS 'Footer configuration settings';

-- =============================================================================
-- CONTENT MANAGEMENT TABLES
-- =============================================================================

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    category TEXT DEFAULT 'general',
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_published BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    publish_date TIMESTAMP WITH TIME ZONE,
    expire_date TIMESTAMP WITH TIME ZONE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_announcements_published ON announcements(is_published, publish_date DESC);
CREATE INDEX idx_announcements_author ON announcements(author_id);
CREATE INDEX idx_announcements_priority ON announcements(priority, is_published);

COMMENT ON TABLE announcements IS 'System announcements and notices';

-- News Posts
CREATE TABLE IF NOT EXISTS news_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    author_id UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    category TEXT DEFAULT 'general',
    tags TEXT[] DEFAULT '{}',
    image_url TEXT,
    is_published BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    publish_date TIMESTAMP WITH TIME ZONE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_news_published ON news_posts(is_published, publish_date DESC);
CREATE INDEX idx_news_author ON news_posts(author_id);
CREATE INDEX idx_news_featured ON news_posts(is_featured, is_published);

COMMENT ON TABLE news_posts IS 'News articles and updates';

-- =============================================================================
-- EDUCATION/TRAINING TABLES (이미 lectures가 있으므로 보완)
-- =============================================================================

-- Training Programs
CREATE TABLE IF NOT EXISTS training_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    instructor_id UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    duration_weeks INTEGER,
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    max_participants INTEGER,
    enrollment_start TIMESTAMP WITH TIME ZONE,
    enrollment_end TIMESTAMP WITH TIME ZONE,
    program_start TIMESTAMP WITH TIME ZONE,
    program_end TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_training_programs_active ON training_programs(is_active, program_start);
CREATE INDEX idx_training_programs_instructor ON training_programs(instructor_id);

COMMENT ON TABLE training_programs IS 'Educational training programs';

-- Regular Meetings
CREATE TABLE IF NOT EXISTS regular_meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    organizer_id UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    meeting_type TEXT DEFAULT 'online' CHECK (meeting_type IN ('online', 'offline', 'hybrid')),
    location TEXT,
    meeting_url TEXT,
    recurrence TEXT CHECK (recurrence IN ('weekly', 'biweekly', 'monthly')),
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    time_of_day TIME,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_regular_meetings_active ON regular_meetings(is_active, day_of_week);
CREATE INDEX idx_regular_meetings_organizer ON regular_meetings(organizer_id);

COMMENT ON TABLE regular_meetings IS 'Recurring meeting schedules';

-- =============================================================================
-- ANALYTICS TABLES
-- =============================================================================

-- Page Views (간단한 애널리틱스)
CREATE TABLE IF NOT EXISTS page_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    page_path TEXT NOT NULL,
    referrer TEXT,
    user_agent TEXT,
    ip_address INET,
    session_id TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_page_views_user ON page_views(user_id, viewed_at DESC);
CREATE INDEX idx_page_views_path ON page_views(page_path, viewed_at DESC);
CREATE INDEX idx_page_views_date ON page_views(viewed_at DESC);

COMMENT ON TABLE page_views IS 'Page view analytics';

-- =============================================================================
-- RESOURCES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    resource_type TEXT CHECK (resource_type IN ('document', 'video', 'link', 'file')),
    url TEXT,
    file_path TEXT,
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    uploader_id UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT false,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_resources_type ON resources(resource_type, is_public);
CREATE INDEX idx_resources_uploader ON resources(uploader_id);
CREATE INDEX idx_resources_category ON resources(category, is_public);

COMMENT ON TABLE resources IS 'Shared resources and materials';

-- =============================================================================
-- ENABLE RLS ON NEW TABLES
-- =============================================================================

ALTER TABLE footer_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE footer_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE footer_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE footer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE regular_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES (기본 정책)
-- =============================================================================

-- Footer tables: Everyone can read, admins can modify
CREATE POLICY "footer_categories_select" ON footer_categories FOR SELECT USING (is_active = true);
CREATE POLICY "footer_categories_admin" ON footer_categories FOR ALL USING (is_user_admin(get_current_user_id()));

CREATE POLICY "footer_links_select" ON footer_links FOR SELECT USING (is_active = true);
CREATE POLICY "footer_links_admin" ON footer_links FOR ALL USING (is_user_admin(get_current_user_id()));

CREATE POLICY "footer_social_select" ON footer_social_links FOR SELECT USING (is_active = true);
CREATE POLICY "footer_social_admin" ON footer_social_links FOR ALL USING (is_user_admin(get_current_user_id()));

CREATE POLICY "footer_settings_select" ON footer_settings FOR SELECT USING (true);
CREATE POLICY "footer_settings_admin" ON footer_settings FOR ALL USING (is_user_admin(get_current_user_id()));

-- Announcements: Published ones are public
CREATE POLICY "announcements_select" ON announcements FOR SELECT USING (
  CASE
    WHEN is_published = true AND (expire_date IS NULL OR expire_date > now()) THEN true
    WHEN author_id = get_current_user_id() THEN true
    WHEN is_user_admin(get_current_user_id()) THEN true
    ELSE false
  END
);
CREATE POLICY "announcements_author" ON announcements FOR ALL USING (author_id = get_current_user_id());
CREATE POLICY "announcements_admin" ON announcements FOR ALL USING (is_user_admin(get_current_user_id()));

-- News: Similar to announcements
CREATE POLICY "news_select" ON news_posts FOR SELECT USING (
  CASE
    WHEN is_published = true THEN true
    WHEN author_id = get_current_user_id() THEN true
    WHEN is_user_admin(get_current_user_id()) THEN true
    ELSE false
  END
);
CREATE POLICY "news_author" ON news_posts FOR ALL USING (author_id = get_current_user_id());
CREATE POLICY "news_admin" ON news_posts FOR ALL USING (is_user_admin(get_current_user_id()));

-- Training programs: Active ones are visible
CREATE POLICY "training_select" ON training_programs FOR SELECT USING (is_active = true);
CREATE POLICY "training_instructor" ON training_programs FOR ALL USING (instructor_id = get_current_user_id());
CREATE POLICY "training_admin" ON training_programs FOR ALL USING (is_user_admin(get_current_user_id()));

-- Regular meetings: Active ones are visible
CREATE POLICY "meetings_select" ON regular_meetings FOR SELECT USING (is_active = true);
CREATE POLICY "meetings_organizer" ON regular_meetings FOR ALL USING (organizer_id = get_current_user_id());
CREATE POLICY "meetings_admin" ON regular_meetings FOR ALL USING (is_user_admin(get_current_user_id()));

-- Page views: Users can see their own
CREATE POLICY "page_views_select" ON page_views FOR SELECT USING (user_id = get_current_user_id() OR is_user_admin(get_current_user_id()));
CREATE POLICY "page_views_insert" ON page_views FOR INSERT WITH CHECK (true);

-- Resources: Public or owner
CREATE POLICY "resources_select" ON resources FOR SELECT USING (
  CASE
    WHEN is_public = true THEN true
    WHEN uploader_id = get_current_user_id() THEN true
    WHEN is_user_admin(get_current_user_id()) THEN true
    ELSE false
  END
);
CREATE POLICY "resources_uploader" ON resources FOR ALL USING (uploader_id = get_current_user_id());
CREATE POLICY "resources_admin" ON resources FOR ALL USING (is_user_admin(get_current_user_id()));

COMMENT ON SCHEMA public IS 'Complete RDS schema with all required tables for aiedulog application';
