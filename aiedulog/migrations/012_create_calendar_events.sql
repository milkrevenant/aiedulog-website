-- =============================================================================
-- Migration 012: Create Calendar Events Table
-- Created: 2025-12-07
-- Purpose: Calendar feature layout
-- =============================================================================

-- Ensure the update trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    category VARCHAR(50) NOT NULL DEFAULT 'event', -- 'event', 'training', 'meeting', 'academic'
    created_by UUID REFERENCES user_profiles(user_id),
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON calendar_events (start_date, end_date);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Policy 1: Everyone can read public events
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON calendar_events;
CREATE POLICY "Public events are viewable by everyone" ON calendar_events
    FOR SELECT
    USING (is_public = true);

-- Policy 2: Authenticated users can read their own private events
-- Using get_current_user_id() instead of auth.uid() which is Supabase specific
DROP POLICY IF EXISTS "Users can view own private events" ON calendar_events;
CREATE POLICY "Users can view own private events" ON calendar_events
    FOR SELECT
    USING (get_current_user_id() = created_by);

-- Policy 3: Staff/Verified can manage events
DROP POLICY IF EXISTS "Staff and verified users can manage events" ON calendar_events;
CREATE POLICY "Staff and verified users can manage events" ON calendar_events
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = get_current_user_id()
            AND (role IN ('admin', 'moderator', 'verified'))
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
