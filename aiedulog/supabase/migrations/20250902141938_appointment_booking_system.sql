-- =====================================================================
-- COMPREHENSIVE APPOINTMENT BOOKING SYSTEM
-- =====================================================================
-- Production-ready scheduling system with full appointment management,
-- instructor availability, time blocking, and notification integration
-- =====================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- 1. APPOINTMENT SYSTEM ENUMS
-- =====================================================================

-- Appointment status lifecycle
CREATE TYPE appointment_status AS ENUM (
  'pending',      -- Awaiting confirmation
  'confirmed',    -- Confirmed and scheduled
  'in_progress',  -- Currently active
  'completed',    -- Successfully completed
  'cancelled',    -- Cancelled by user/instructor
  'no_show',      -- User failed to attend
  'rescheduled'   -- Moved to different time
);

-- Meeting delivery methods
CREATE TYPE meeting_type_enum AS ENUM (
  'online',       -- Video/voice call
  'in_person',    -- Physical meeting
  'phone',        -- Phone call only
  'hybrid'        -- Mix of online/in-person
);

-- Appointment-specific notification types (extends existing system)
CREATE TYPE appointment_notification_type AS ENUM (
  'booking_confirmation',    -- Immediate confirmation
  'instructor_notification', -- Notify instructor of new booking
  'reminder_24h',           -- 24 hour reminder
  'reminder_1h',            -- 1 hour reminder
  'reminder_15m',           -- 15 minute reminder
  'cancellation_notice',    -- Cancellation notification
  'reschedule_notice',      -- Reschedule notification
  'completion_followup',    -- Post-appointment follow-up
  'no_show_alert',         -- No-show notification
  'payment_reminder'        -- Payment due reminder
);

-- Days of the week (0 = Sunday, 6 = Saturday)
CREATE TYPE day_of_week_enum AS ENUM ('0', '1', '2', '3', '4', '5', '6');

-- =====================================================================
-- 2. APPOINTMENT TYPES AND SERVICES
-- =====================================================================

-- Service offerings by instructors
CREATE TABLE appointment_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Instructor and service details
  instructor_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  type_name VARCHAR(150) NOT NULL,
  description TEXT,
  
  -- Scheduling parameters
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  buffer_time_minutes INTEGER DEFAULT 15 CHECK (buffer_time_minutes >= 0),
  
  -- Booking rules
  booking_advance_days INTEGER DEFAULT 30 CHECK (booking_advance_days >= 0),
  booking_advance_hours INTEGER DEFAULT 24 CHECK (booking_advance_hours >= 0),
  cancellation_hours INTEGER DEFAULT 24 CHECK (cancellation_hours >= 0),
  max_bookings_per_day INTEGER DEFAULT 8 CHECK (max_bookings_per_day > 0),
  
  -- Pricing and display
  price DECIMAL(10,2) DEFAULT 0.00 CHECK (price >= 0),
  currency VARCHAR(3) DEFAULT 'KRW',
  display_color VARCHAR(7) DEFAULT '#2E86AB',
  sort_order INTEGER DEFAULT 0,
  
  -- Status and metadata
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  
  -- Instructions and requirements
  preparation_instructions TEXT,
  equipment_requirements TEXT,
  meeting_link_template TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_color_hex CHECK (display_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT valid_currency CHECK (currency ~ '^[A-Z]{3}$')
);

-- =====================================================================
-- 3. INSTRUCTOR AVAILABILITY PATTERNS
-- =====================================================================

-- Weekly recurring availability patterns
CREATE TABLE instructor_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Instructor and timing
  instructor_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Availability settings
  is_available BOOLEAN DEFAULT true,
  timezone VARCHAR(50) DEFAULT 'Asia/Seoul',
  
  -- Booking constraints
  slot_duration_minutes INTEGER DEFAULT 60 CHECK (slot_duration_minutes > 0),
  buffer_between_appointments INTEGER DEFAULT 15 CHECK (buffer_between_appointments >= 0),
  max_bookings INTEGER DEFAULT 8 CHECK (max_bookings > 0),
  
  -- Date range (for temporary availability changes)
  effective_from DATE,
  effective_until DATE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_date_range CHECK (effective_until IS NULL OR effective_until >= effective_from)
);

-- =====================================================================
-- 4. SPECIFIC TIME BLOCKS (OVERRIDES AND EXCEPTIONS)
-- =====================================================================

-- Specific date/time availability overrides
CREATE TABLE time_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Instructor and timing
  instructor_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  block_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Block type and reason
  is_blocked BOOLEAN DEFAULT true, -- true = blocked, false = special availability
  block_type VARCHAR(50) DEFAULT 'manual', -- manual, holiday, sick, vacation, meeting
  block_reason TEXT,
  
  -- Recurrence (for holidays, etc.)
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern JSONB, -- {type: 'yearly', day: 15, month: 8} for yearly Aug 15
  
  -- Metadata
  created_by UUID REFERENCES identities(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- =====================================================================
-- 5. MAIN APPOINTMENTS TABLE
-- =====================================================================

-- Core appointment records
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Participants
  user_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  appointment_type_id UUID NOT NULL REFERENCES appointment_types(id) ON DELETE RESTRICT,
  
  -- Scheduling details
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Asia/Seoul',
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  
  -- Appointment details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  internal_notes TEXT, -- Instructor-only notes
  user_notes TEXT,     -- User-provided notes
  
  -- Meeting details
  meeting_type meeting_type_enum NOT NULL DEFAULT 'online',
  meeting_link TEXT,
  meeting_password VARCHAR(100),
  meeting_room VARCHAR(100),
  meeting_address TEXT,
  meeting_instructions TEXT,
  
  -- Status and lifecycle
  status appointment_status NOT NULL DEFAULT 'pending',
  confirmation_token VARCHAR(100),
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES identities(id),
  
  -- Cancellation details
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES identities(id),
  cancellation_reason TEXT,
  cancellation_type VARCHAR(50), -- user, instructor, system, admin
  
  -- Completion details
  completed_at TIMESTAMPTZ,
  attendance_status VARCHAR(50), -- attended, no_show, partial
  instructor_feedback TEXT,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  user_feedback TEXT,
  
  -- Payment and billing
  price DECIMAL(10,2) DEFAULT 0.00 CHECK (price >= 0),
  currency VARCHAR(3) DEFAULT 'KRW',
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, refunded, failed
  payment_reference VARCHAR(100),
  payment_date TIMESTAMPTZ,
  
  -- Rescheduling history
  original_appointment_id UUID REFERENCES appointments(id),
  rescheduled_from_date DATE,
  rescheduled_from_time TIME,
  reschedule_count INTEGER DEFAULT 0,
  
  -- Notification tracking
  confirmation_sent BOOLEAN DEFAULT false,
  reminder_24h_sent BOOLEAN DEFAULT false,
  reminder_1h_sent BOOLEAN DEFAULT false,
  reminder_15m_sent BOOLEAN DEFAULT false,
  
  -- Metadata and audit
  booking_source VARCHAR(50) DEFAULT 'web', -- web, mobile, admin, api
  booking_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_currency CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT valid_date_time CHECK (appointment_date >= CURRENT_DATE - INTERVAL '1 year'),
  CONSTRAINT no_self_appointment CHECK (user_id != instructor_id)
);

-- =====================================================================
-- 6. BOOKING SESSIONS (MULTI-STEP WORKFLOW)
-- =====================================================================

-- Track multi-step booking process
CREATE TABLE booking_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Session details
  session_token VARCHAR(100) NOT NULL UNIQUE,
  user_id UUID REFERENCES identities(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES identities(id),
  appointment_type_id UUID REFERENCES appointment_types(id),
  
  -- Booking progress
  current_step INTEGER DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 5),
  completed_steps INTEGER[] DEFAULT ARRAY[],
  
  -- Selected details (accumulated during process)
  selected_date DATE,
  selected_start_time TIME,
  selected_duration INTEGER,
  form_data JSONB DEFAULT '{}',
  
  -- Session management
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  is_completed BOOLEAN DEFAULT false,
  final_appointment_id UUID REFERENCES appointments(id),
  
  -- Metadata
  browser_fingerprint VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 7. APPOINTMENT NOTIFICATIONS (INTEGRATION WITH EXISTING SYSTEM)
-- =====================================================================

-- Scheduled notifications for appointments
CREATE TABLE appointment_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationship to appointment and user
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  
  -- Notification details
  notification_type appointment_notification_type NOT NULL,
  delivery_channel notification_channel NOT NULL DEFAULT 'in_app',
  priority notification_priority NOT NULL DEFAULT 'normal',
  
  -- Scheduling
  scheduled_time TIMESTAMPTZ NOT NULL,
  delivery_window_minutes INTEGER DEFAULT 60, -- How long to retry delivery
  
  -- Content
  subject VARCHAR(255),
  message TEXT NOT NULL,
  template_data JSONB DEFAULT '{}',
  
  -- Delivery tracking
  status delivery_status DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Integration with main notification system
  main_notification_id UUID REFERENCES notifications(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 8. PERFORMANCE OPTIMIZATION INDEXES
-- =====================================================================

-- Appointment types indexes
CREATE INDEX idx_appointment_types_instructor ON appointment_types(instructor_id) WHERE is_active = true;
CREATE INDEX idx_appointment_types_active ON appointment_types(is_active, is_public);
CREATE INDEX idx_appointment_types_sort ON appointment_types(instructor_id, sort_order);

-- Instructor availability indexes
CREATE INDEX idx_instructor_availability_lookup ON instructor_availability(instructor_id, day_of_week, is_available);
CREATE INDEX idx_instructor_availability_time ON instructor_availability(day_of_week, start_time, end_time) WHERE is_available = true;
CREATE INDEX idx_instructor_availability_dates ON instructor_availability(effective_from, effective_until) WHERE effective_from IS NOT NULL;

-- Time blocks indexes
CREATE INDEX idx_time_blocks_lookup ON time_blocks(instructor_id, block_date);
CREATE INDEX idx_time_blocks_date_range ON time_blocks(block_date, start_time, end_time);
CREATE INDEX idx_time_blocks_recurring ON time_blocks(is_recurring) WHERE is_recurring = true;

-- Appointments indexes (critical for performance)
CREATE INDEX idx_appointments_user ON appointments(user_id, appointment_date DESC);
CREATE INDEX idx_appointments_instructor ON appointments(instructor_id, appointment_date DESC);
CREATE INDEX idx_appointments_date_time ON appointments(appointment_date, start_time);
CREATE INDEX idx_appointments_status ON appointments(status) WHERE status != 'completed';
CREATE INDEX idx_appointments_upcoming ON appointments(appointment_date, start_time) 
  WHERE status IN ('pending', 'confirmed') AND appointment_date >= CURRENT_DATE;
CREATE INDEX idx_appointments_notifications ON appointments(id, status, appointment_date) 
  WHERE status IN ('pending', 'confirmed');

-- Booking sessions indexes
CREATE INDEX idx_booking_sessions_token ON booking_sessions(session_token);
CREATE INDEX idx_booking_sessions_user ON booking_sessions(user_id, expires_at);
CREATE INDEX idx_booking_sessions_cleanup ON booking_sessions(expires_at) WHERE is_completed = false;

-- Appointment notifications indexes
CREATE INDEX idx_appointment_notifications_schedule ON appointment_notifications(scheduled_time, status) 
  WHERE status = 'pending';
CREATE INDEX idx_appointment_notifications_appointment ON appointment_notifications(appointment_id);
CREATE INDEX idx_appointment_notifications_user ON appointment_notifications(user_id, scheduled_time DESC);

-- =====================================================================
-- 9. ROW LEVEL SECURITY POLICIES
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_notifications ENABLE ROW LEVEL SECURITY;

-- Appointment Types Policies
CREATE POLICY appointment_types_public_read 
ON appointment_types FOR SELECT 
USING (is_active = true AND is_public = true);

CREATE POLICY appointment_types_instructor_manage 
ON appointment_types FOR ALL 
USING (
  instructor_id IN (
    SELECT i.id FROM identities i WHERE i.auth_user_id = auth.uid()
  )
);

CREATE POLICY appointment_types_admin_manage 
ON appointment_types FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM identities i 
    WHERE i.auth_user_id = auth.uid() 
    AND i.role IN ('admin', 'super_admin')
  )
);

-- Instructor Availability Policies
CREATE POLICY instructor_availability_public_read 
ON instructor_availability FOR SELECT 
USING (is_available = true);

CREATE POLICY instructor_availability_instructor_manage 
ON instructor_availability FOR ALL 
USING (
  instructor_id IN (
    SELECT i.id FROM identities i WHERE i.auth_user_id = auth.uid()
  )
);

CREATE POLICY instructor_availability_admin_manage 
ON instructor_availability FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM identities i 
    WHERE i.auth_user_id = auth.uid() 
    AND i.role IN ('admin', 'super_admin')
  )
);

-- Time Blocks Policies
CREATE POLICY time_blocks_instructor_manage 
ON time_blocks FOR ALL 
USING (
  instructor_id IN (
    SELECT i.id FROM identities i WHERE i.auth_user_id = auth.uid()
  )
);

CREATE POLICY time_blocks_admin_manage 
ON time_blocks FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM identities i 
    WHERE i.auth_user_id = auth.uid() 
    AND i.role IN ('admin', 'super_admin')
  )
);

-- Appointments Policies (Most Critical)
CREATE POLICY appointments_user_access 
ON appointments FOR SELECT 
USING (
  user_id IN (
    SELECT i.id FROM identities i WHERE i.auth_user_id = auth.uid()
  )
);

CREATE POLICY appointments_instructor_access 
ON appointments FOR ALL 
USING (
  instructor_id IN (
    SELECT i.id FROM identities i WHERE i.auth_user_id = auth.uid()
  )
);

CREATE POLICY appointments_user_create 
ON appointments FOR INSERT 
WITH CHECK (
  user_id IN (
    SELECT i.id FROM identities i WHERE i.auth_user_id = auth.uid()
  ) AND 
  status = 'pending'
);

CREATE POLICY appointments_user_update 
ON appointments FOR UPDATE 
USING (
  user_id IN (
    SELECT i.id FROM identities i WHERE i.auth_user_id = auth.uid()
  ) AND
  status IN ('pending', 'confirmed')
) 
WITH CHECK (
  status IN ('pending', 'cancelled') AND
  cancelled_by = user_id
);

CREATE POLICY appointments_admin_full_access 
ON appointments FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM identities i 
    WHERE i.auth_user_id = auth.uid() 
    AND i.role IN ('admin', 'super_admin')
  )
);

-- Booking Sessions Policies
CREATE POLICY booking_sessions_user_access 
ON booking_sessions FOR ALL 
USING (
  user_id IN (
    SELECT i.id FROM identities i WHERE i.auth_user_id = auth.uid()
  ) OR
  user_id IS NULL -- Allow anonymous booking sessions
);

-- Appointment Notifications Policies
CREATE POLICY appointment_notifications_user_read 
ON appointment_notifications FOR SELECT 
USING (
  user_id IN (
    SELECT i.id FROM identities i WHERE i.auth_user_id = auth.uid()
  )
);

CREATE POLICY appointment_notifications_system_manage 
ON appointment_notifications FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM identities i 
    WHERE i.auth_user_id = auth.uid() 
    AND i.role IN ('admin', 'super_admin', 'system')
  )
);

-- =====================================================================
-- 10. UTILITY FUNCTIONS FOR AVAILABILITY CHECKING
-- =====================================================================

-- Function to check if a time slot is available
CREATE OR REPLACE FUNCTION check_time_slot_availability(
  p_instructor_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_appointment_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_day_of_week INTEGER;
  v_has_availability BOOLEAN := FALSE;
  v_is_blocked BOOLEAN := FALSE;
  v_has_conflict BOOLEAN := FALSE;
BEGIN
  -- Get day of week (0 = Sunday)
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Check if instructor has general availability on this day/time
  SELECT EXISTS(
    SELECT 1 FROM instructor_availability ia
    WHERE ia.instructor_id = p_instructor_id
    AND ia.day_of_week = v_day_of_week
    AND ia.is_available = true
    AND ia.start_time <= p_start_time
    AND ia.end_time >= p_end_time
    AND (ia.effective_from IS NULL OR ia.effective_from <= p_date)
    AND (ia.effective_until IS NULL OR ia.effective_until >= p_date)
  ) INTO v_has_availability;
  
  -- If no general availability, return false
  IF NOT v_has_availability THEN
    RETURN FALSE;
  END IF;
  
  -- Check for specific time blocks (blocked time)
  SELECT EXISTS(
    SELECT 1 FROM time_blocks tb
    WHERE tb.instructor_id = p_instructor_id
    AND tb.block_date = p_date
    AND tb.is_blocked = true
    AND NOT (tb.end_time <= p_start_time OR tb.start_time >= p_end_time)
  ) INTO v_is_blocked;
  
  -- If time is blocked, return false
  IF v_is_blocked THEN
    RETURN FALSE;
  END IF;
  
  -- Check for conflicting appointments
  SELECT EXISTS(
    SELECT 1 FROM appointments a
    WHERE a.instructor_id = p_instructor_id
    AND a.appointment_date = p_date
    AND a.status IN ('pending', 'confirmed', 'in_progress')
    AND NOT (a.end_time <= p_start_time OR a.start_time >= p_end_time)
    AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id)
  ) INTO v_has_conflict;
  
  -- Return true if no conflicts
  RETURN NOT v_has_conflict;
END;
$$;

-- Function to get available time slots for a specific date
CREATE OR REPLACE FUNCTION get_available_time_slots(
  p_instructor_id UUID,
  p_date DATE,
  p_duration_minutes INTEGER DEFAULT 60,
  p_appointment_type_id UUID DEFAULT NULL
) RETURNS TABLE (
  start_time TIME,
  end_time TIME,
  duration_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_day_of_week INTEGER;
  v_availability_record RECORD;
  v_slot_start TIME;
  v_slot_end TIME;
  v_type_duration INTEGER := p_duration_minutes;
BEGIN
  -- Get appointment type duration if provided
  IF p_appointment_type_id IS NOT NULL THEN
    SELECT duration_minutes INTO v_type_duration 
    FROM appointment_types 
    WHERE id = p_appointment_type_id;
  END IF;
  
  -- Get day of week
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Loop through instructor's availability windows
  FOR v_availability_record IN
    SELECT ia.start_time, ia.end_time, ia.slot_duration_minutes, ia.buffer_between_appointments
    FROM instructor_availability ia
    WHERE ia.instructor_id = p_instructor_id
    AND ia.day_of_week = v_day_of_week
    AND ia.is_available = true
    AND (ia.effective_from IS NULL OR ia.effective_from <= p_date)
    AND (ia.effective_until IS NULL OR ia.effective_until >= p_date)
    ORDER BY ia.start_time
  LOOP
    -- Generate time slots within this availability window
    v_slot_start := v_availability_record.start_time;
    
    WHILE v_slot_start + (v_type_duration || ' minutes')::INTERVAL <= v_availability_record.end_time LOOP
      v_slot_end := v_slot_start + (v_type_duration || ' minutes')::INTERVAL;
      
      -- Check if this slot is available
      IF check_time_slot_availability(p_instructor_id, p_date, v_slot_start, v_slot_end) THEN
        RETURN QUERY SELECT v_slot_start, v_slot_end, v_type_duration;
      END IF;
      
      -- Move to next slot
      v_slot_start := v_slot_start + (COALESCE(v_availability_record.slot_duration_minutes, 60) || ' minutes')::INTERVAL;
    END LOOP;
  END LOOP;
  
  RETURN;
END;
$$;

-- =====================================================================
-- 11. AUDIT TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =====================================================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_appointment_types_updated_at BEFORE UPDATE ON appointment_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_instructor_availability_updated_at BEFORE UPDATE ON instructor_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_blocks_updated_at BEFORE UPDATE ON time_blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_booking_sessions_updated_at BEFORE UPDATE ON booking_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointment_notifications_updated_at BEFORE UPDATE ON appointment_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- 12. SAMPLE DATA FOR TESTING (OPTIONAL)
-- =====================================================================

-- Note: Sample data would be inserted here for testing purposes
-- This should be removed or commented out in production

-- Insert sample appointment types (assuming instructor exists)
/*
INSERT INTO appointment_types (
  instructor_id, 
  type_name, 
  description, 
  duration_minutes, 
  price
) VALUES 
  ((SELECT id FROM identities WHERE email = 'instructor@example.com' LIMIT 1),
   'AI 교육 상담', 
   'AI 교육 과정에 대한 개별 상담', 
   60, 
   50000.00),
  ((SELECT id FROM identities WHERE email = 'instructor@example.com' LIMIT 1),
   '프로그래밍 멘토링', 
   '개별 프로그래밍 학습 지도', 
   90, 
   75000.00);
*/

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================

-- Add helpful comments
COMMENT ON TABLE appointments IS 'Core appointment booking records with full lifecycle management';
COMMENT ON TABLE appointment_types IS 'Service offerings and configurations by instructors';
COMMENT ON TABLE instructor_availability IS 'Weekly recurring availability patterns';
COMMENT ON TABLE time_blocks IS 'Specific date/time availability overrides and exceptions';
COMMENT ON TABLE booking_sessions IS 'Multi-step booking workflow session tracking';
COMMENT ON TABLE appointment_notifications IS 'Scheduled appointment-related notifications';

COMMENT ON FUNCTION check_time_slot_availability IS 'Checks if a specific time slot is available for booking';
COMMENT ON FUNCTION get_available_time_slots IS 'Returns all available time slots for a date and duration';

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Appointment Booking System schema migration completed successfully';
  RAISE NOTICE 'Created % tables with comprehensive RLS policies', 6;
  RAISE NOTICE 'Added % utility functions for availability checking', 2;
  RAISE NOTICE 'System ready for appointment booking functionality';
END $$;