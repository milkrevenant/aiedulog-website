-- AiEduLog RDS Migration DDL
-- Clean PostgreSQL schema without Supabase RLS dependencies
-- Generated for AWS RDS PostgreSQL 15.4

-- Drop existing tables if they exist
DROP TABLE IF EXISTS 
    auth_methods, user_profiles, bookmarks, post_likes, comments, posts,
    chat_messages, chat_participants, chat_rooms, lecture_registrations, 
    lectures, notifications, file_uploads, resources, announcements, 
    news_posts, regular_meetings, training_programs
CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================
-- CORE USER MANAGEMENT TABLES
-- ============================

-- User profiles (replacing both identities and user_profiles)
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    nickname TEXT,
    school TEXT,
    subject TEXT,
    interests TEXT[] DEFAULT '{}',
    role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'moderator')),
    is_lecturer BOOLEAN DEFAULT false,
    lecturer_info JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    last_active_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Authentication methods (simplified for Cognito integration)
CREATE TABLE auth_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('cognito', 'google', 'github', 'apple')),
    auth_provider_id TEXT NOT NULL,
    provider_data JSONB DEFAULT '{}',
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(provider, auth_provider_id)
);

-- ============================
-- CONTENT MANAGEMENT TABLES
-- ============================

-- Posts (main content)
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'education', 'job', 'tech', 'news')),
    tags TEXT[],
    images TEXT[],
    image_urls TEXT[] DEFAULT '{}',
    file_urls JSONB DEFAULT '[]',
    file_metadata JSONB DEFAULT '[]',
    school_level VARCHAR(10) CHECK (school_level IN ('elementary', 'middle', 'high', 'university')),
    view_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Comments
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Post likes
CREATE TABLE post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(post_id, user_id)
);

-- Bookmarks
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(post_id, user_id)
);

-- ============================
-- CHAT SYSTEM TABLES
-- ============================

-- Chat rooms
CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'public' CHECK (type IN ('public', 'private', 'direct')),
    creator_id UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    created_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    max_members INTEGER,
    is_active BOOLEAN DEFAULT true,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Chat participants
CREATE TABLE chat_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    last_read_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(room_id, user_id)
);

-- Chat messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================
-- EDUCATION SYSTEM TABLES
-- ============================

-- Lectures
CREATE TABLE lectures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(500),
    description TEXT,
    instructor_name VARCHAR(255) NOT NULL,
    instructor_bio TEXT,
    instructor_image VARCHAR(500),
    category VARCHAR(100) NOT NULL,
    level VARCHAR(50) CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    duration VARCHAR(100),
    price NUMERIC(10,2) DEFAULT 0,
    max_participants INTEGER DEFAULT 30,
    current_participants INTEGER DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    schedule_details TEXT,
    location_type VARCHAR(50) DEFAULT 'offline' CHECK (location_type IN ('online', 'offline', 'hybrid')),
    location_address TEXT,
    location_url VARCHAR(500),
    thumbnail_image VARCHAR(500),
    banner_image VARCHAR(500),
    materials JSONB,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'full', 'cancelled', 'completed')),
    registration_open BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    created_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    published_at TIMESTAMP WITH TIME ZONE,
    view_count INTEGER DEFAULT 0,
    slug VARCHAR(255) UNIQUE,
    meta_description TEXT,
    tags TEXT[],
    attachment_url TEXT
);

-- Lecture registrations
CREATE TABLE lecture_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    confirmation_date TIMESTAMP WITH TIME ZONE,
    cancellation_date TIMESTAMP WITH TIME ZONE,
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_amount NUMERIC(10,2),
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(50),
    notes TEXT,
    attendance_confirmed BOOLEAN DEFAULT false,
    certificate_issued BOOLEAN DEFAULT false,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(lecture_id, user_id)
);

-- Training programs
CREATE TABLE training_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    training_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    duration_hours INTEGER,
    location TEXT,
    online_link TEXT,
    instructor_name TEXT NOT NULL,
    instructor_title TEXT,
    instructor_bio TEXT,
    instructor_image TEXT,
    program_content JSONB,
    materials_link TEXT,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    registration_deadline DATE,
    fee INTEGER DEFAULT 0,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Regular meetings
CREATE TABLE regular_meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    meeting_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location TEXT,
    online_link TEXT,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    registration_deadline DATE,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================
-- CONTENT & RESOURCE TABLES
-- ============================

-- Announcements
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'system', 'event', 'maintenance')),
    priority INTEGER DEFAULT 0 CHECK (priority BETWEEN 0 AND 10),
    author_id UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    is_pinned BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- News posts
CREATE TABLE news_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    thumbnail_image TEXT,
    category TEXT DEFAULT 'news' CHECK (category IN ('news', 'update', 'event', 'announcement')),
    author_id UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    view_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- File uploads
CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploaded_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    file_type TEXT,
    storage_bucket TEXT DEFAULT 'user-uploads',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Resources
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploader_id UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    subject TEXT,
    grade TEXT[],
    download_count INTEGER DEFAULT 0,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================
-- NOTIFICATION SYSTEM TABLES
-- ============================

-- Custom notification types
CREATE TYPE notification_category AS ENUM ('system', 'user', 'content', 'chat', 'lecture', 'announcement');
CREATE TYPE notification_type AS ENUM ('post_like', 'post_comment', 'chat_message', 'lecture_registration', 'system_alert', 'announcement');
CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'sms', 'push');

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    category notification_category NOT NULL DEFAULT 'system',
    type notification_type NOT NULL,
    priority notification_priority NOT NULL DEFAULT 'normal',
    title TEXT NOT NULL,
    message TEXT,
    link TEXT,
    data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    related_content_type TEXT,
    related_content_id UUID,
    channels notification_channel[] DEFAULT ARRAY['in_app'],
    read_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    template_id UUID,
    template_version INTEGER,
    batch_id UUID,
    send_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL
);

-- ============================
-- INDEXES FOR PERFORMANCE
-- ============================

-- User profiles indexes
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_school ON user_profiles(school) WHERE school IS NOT NULL;
CREATE INDEX idx_user_profiles_interests ON user_profiles USING gin(interests);
CREATE INDEX idx_user_profiles_is_active ON user_profiles(is_active);

-- Auth methods indexes
CREATE INDEX idx_auth_methods_user_id ON auth_methods(user_id);
CREATE INDEX idx_auth_methods_provider ON auth_methods(provider, auth_provider_id);
CREATE INDEX idx_auth_methods_primary ON auth_methods(user_id, is_primary) WHERE is_primary = true;

-- Posts indexes
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_is_pinned ON posts(is_pinned DESC);
CREATE INDEX idx_posts_school_level ON posts(school_level) WHERE category = 'education';
CREATE INDEX idx_posts_published ON posts(is_published, created_at DESC);

-- Comments indexes
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_id) WHERE parent_id IS NOT NULL;

-- Post interactions indexes
CREATE INDEX idx_post_likes_post ON post_likes(post_id);
CREATE INDEX idx_post_likes_user ON post_likes(user_id);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);

-- Chat system indexes
CREATE INDEX idx_chat_messages_room ON chat_messages(room_id, created_at DESC);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_participants_user ON chat_participants(user_id);
CREATE INDEX idx_chat_rooms_creator ON chat_rooms(creator_id);

-- Lectures indexes
CREATE INDEX idx_lectures_category ON lectures(category);
CREATE INDEX idx_lectures_status ON lectures(status);
CREATE INDEX idx_lectures_start_date ON lectures(start_date);
CREATE INDEX idx_lectures_featured ON lectures(featured) WHERE featured = true;
CREATE INDEX idx_lecture_registrations_lecture ON lecture_registrations(lecture_id);
CREATE INDEX idx_lecture_registrations_user ON lecture_registrations(user_id);
CREATE INDEX idx_lecture_registrations_status ON lecture_registrations(status);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_category ON notifications(category);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_send_at ON notifications(send_at);

-- File uploads indexes
CREATE INDEX idx_file_uploads_uploaded_by ON file_uploads(uploaded_by);
CREATE INDEX idx_file_uploads_bucket ON file_uploads(storage_bucket);

-- Resources indexes
CREATE INDEX idx_resources_uploader ON resources(uploader_id);
CREATE INDEX idx_resources_subject ON resources(subject);
CREATE INDEX idx_resources_post ON resources(post_id);

-- ============================
-- TRIGGERS FOR AUTO-UPDATE
-- ============================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply auto-update triggers to relevant tables
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auth_methods_updated_at 
    BEFORE UPDATE ON auth_methods 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at 
    BEFORE UPDATE ON posts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at 
    BEFORE UPDATE ON comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lectures_updated_at 
    BEFORE UPDATE ON lectures 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_programs_updated_at 
    BEFORE UPDATE ON training_programs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_regular_meetings_updated_at 
    BEFORE UPDATE ON regular_meetings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at 
    BEFORE UPDATE ON announcements 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_posts_updated_at 
    BEFORE UPDATE ON news_posts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_uploads_updated_at 
    BEFORE UPDATE ON file_uploads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================
-- COMMENTS AND DOCUMENTATION
-- ============================

COMMENT ON TABLE user_profiles IS 'Unified user identity and profile information';
COMMENT ON TABLE auth_methods IS 'Authentication methods linked to user accounts';
COMMENT ON TABLE posts IS 'Main content posts for feeds, education, and job boards';
COMMENT ON TABLE comments IS 'Comments on posts with nested replies support';
COMMENT ON TABLE notifications IS 'Unified notification system with multiple channels';
COMMENT ON TABLE lectures IS 'Educational lecture/course management';
COMMENT ON TABLE chat_rooms IS 'Chat rooms for real-time communication';

-- Grant necessary permissions (adjust based on your user setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aiedulog_app;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO aiedulog_app;