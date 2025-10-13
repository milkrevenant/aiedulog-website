-- =============================================================================
-- Migration 002: Core Tables Schema
-- Created: 2025-10-13
-- Purpose: Create all core tables for aiedulog application
-- =============================================================================

-- Drop existing tables if any (migration safety)
DROP TABLE IF EXISTS
    lecture_registrations, lectures, notifications,
    chat_messages, chat_participants, chat_rooms,
    bookmarks, post_likes, comments, posts,
    auth_methods, user_profiles
CASCADE;

-- =============================================================================
-- USER MANAGEMENT TABLES
-- =============================================================================

-- User Profiles: Core user information
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
    role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'moderator', 'super_admin')),
    is_lecturer BOOLEAN DEFAULT false,
    lecturer_info JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    last_active_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_active ON user_profiles(is_active) WHERE is_active = true;

COMMENT ON TABLE user_profiles IS 'Core user profile information';
COMMENT ON COLUMN user_profiles.role IS 'User role: member, admin, moderator, super_admin';

-- Auth Methods: Multi-provider authentication
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

CREATE INDEX idx_auth_methods_user ON auth_methods(user_id);
CREATE INDEX idx_auth_methods_provider_id ON auth_methods(provider, auth_provider_id) WHERE provider = 'cognito';

COMMENT ON TABLE auth_methods IS 'Multi-provider authentication methods for users';

-- =============================================================================
-- CONTENT TABLES
-- =============================================================================

-- Posts: User-generated content
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    tags TEXT[],
    images TEXT[],
    image_urls TEXT[] DEFAULT '{}',
    file_urls JSONB DEFAULT '[]',
    file_metadata JSONB DEFAULT '[]',
    school_level VARCHAR(10),
    view_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_published_created ON posts(is_published, created_at DESC);
CREATE INDEX idx_posts_category ON posts(category) WHERE is_published = true;

COMMENT ON TABLE posts IS 'User-generated posts and content';

-- Comments: Post comments and replies
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

CREATE INDEX idx_comments_post ON comments(post_id, created_at);
CREATE INDEX idx_comments_author ON comments(author_id);

COMMENT ON TABLE comments IS 'Comments on posts with threading support';

-- Post Likes: User likes on posts
CREATE TABLE post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(post_id, user_id)
);

CREATE INDEX idx_post_likes_post ON post_likes(post_id);
CREATE INDEX idx_post_likes_user ON post_likes(user_id);

COMMENT ON TABLE post_likes IS 'User likes on posts';

-- Bookmarks: User bookmarks for posts
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(post_id, user_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id, created_at DESC);
CREATE INDEX idx_bookmarks_post ON bookmarks(post_id);

COMMENT ON TABLE bookmarks IS 'User bookmarks for posts';

-- =============================================================================
-- CHAT SYSTEM TABLES
-- =============================================================================

-- Chat Rooms: Group and direct message rooms
CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'public' CHECK (type IN ('public', 'private', 'direct')),
    creator_id UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    max_members INTEGER,
    is_active BOOLEAN DEFAULT true,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_chat_rooms_type ON chat_rooms(type, is_active);
CREATE INDEX idx_chat_rooms_creator ON chat_rooms(creator_id);

COMMENT ON TABLE chat_rooms IS 'Chat rooms for group and direct messaging';

-- Chat Participants: Room membership
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

CREATE INDEX idx_chat_participants_room ON chat_participants(room_id, is_active);
CREATE INDEX idx_chat_participants_user ON chat_participants(user_id, is_active);

COMMENT ON TABLE chat_participants IS 'Chat room participants and their roles';

-- Chat Messages: Messages in chat rooms
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_chat_messages_room_time ON chat_messages(room_id, created_at DESC);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);

COMMENT ON TABLE chat_messages IS 'Messages in chat rooms';

-- =============================================================================
-- LECTURE SYSTEM TABLES
-- =============================================================================

-- Lectures: Course and lecture information
CREATE TABLE lectures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(500),
    description TEXT,
    instructor_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    level VARCHAR(50),
    duration VARCHAR(100),
    price NUMERIC(10,2) DEFAULT 0,
    max_participants INTEGER DEFAULT 30,
    current_participants INTEGER DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'draft',
    registration_open BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    created_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_lectures_status ON lectures(status, start_date);
CREATE INDEX idx_lectures_category ON lectures(category);
CREATE INDEX idx_lectures_creator ON lectures(created_by);

COMMENT ON TABLE lectures IS 'Lecture and course information';

-- Lecture Registrations: User enrollments
CREATE TABLE lecture_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(lecture_id, user_id)
);

CREATE INDEX idx_lecture_registrations_lecture ON lecture_registrations(lecture_id);
CREATE INDEX idx_lecture_registrations_user ON lecture_registrations(user_id);

COMMENT ON TABLE lecture_registrations IS 'User lecture registrations';

-- =============================================================================
-- NOTIFICATION SYSTEM
-- =============================================================================

-- Notifications: User notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

COMMENT ON TABLE notifications IS 'User notifications and alerts';
