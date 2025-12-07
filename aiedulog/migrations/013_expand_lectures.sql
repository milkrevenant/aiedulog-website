-- =============================================================================
-- Migration 013: Expand lecture schema for board/admin UI
-- Created: 2025-10-17
-- Purpose: Add schedule, location, media, and registration metadata fields
-- =============================================================================

-- Extend lectures table with additional metadata used by the UI
ALTER TABLE lectures
  ADD COLUMN IF NOT EXISTS instructor_bio TEXT,
  ADD COLUMN IF NOT EXISTS instructor_image TEXT,
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME,
  ADD COLUMN IF NOT EXISTS schedule_details TEXT,
  ADD COLUMN IF NOT EXISTS location_type VARCHAR(50) DEFAULT 'offline',
  ADD COLUMN IF NOT EXISTS location_address TEXT,
  ADD COLUMN IF NOT EXISTS location_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_image TEXT,
  ADD COLUMN IF NOT EXISTS banner_image TEXT,
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Extend lecture registrations for payment/status tracking
ALTER TABLE lecture_registrations
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
