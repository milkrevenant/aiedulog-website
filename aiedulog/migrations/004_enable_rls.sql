-- =============================================================================
-- Migration 004: Enable Row Level Security (RLS)
-- Created: 2025-10-13
-- Purpose: Enable RLS on all tables to enforce security policies
-- =============================================================================

-- Enable RLS on all core tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Force RLS for sensitive tables (even for table owners)
ALTER TABLE user_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE auth_methods FORCE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE user_profiles IS 'User profiles with RLS enforced';
COMMENT ON TABLE auth_methods IS 'Authentication methods with RLS enforced';
