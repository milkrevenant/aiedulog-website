-- =====================================================================
-- COMPREHENSIVE NOTIFICATION SYSTEM INTEGRATION
-- =====================================================================
-- Enterprise-grade notification system with scheduling integration,
-- real-time delivery, templates, preferences, and analytics
-- =====================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- =====================================================================
-- 1. ENHANCED NOTIFICATION TYPES AND ENUMS
-- =====================================================================

-- Notification delivery channels
CREATE TYPE notification_channel AS ENUM (
  'in_app',      -- In-application notifications
  'email',       -- Email notifications
  'push',        -- Push notifications
  'sms',         -- SMS notifications
  'webhook'      -- Webhook notifications
);

-- Notification priority levels
CREATE TYPE notification_priority AS ENUM (
  'low',         -- Non-urgent notifications
  'normal',      -- Standard notifications
  'high',        -- Important notifications
  'critical',    -- Critical system notifications
  'urgent'       -- Immediate attention required
);

-- Notification categories
CREATE TYPE notification_category AS ENUM (
  'schedule',    -- Scheduling-related notifications
  'content',     -- Content management notifications
  'system',      -- System notifications
  'security',    -- Security alerts
  'user',        -- User interactions
  'admin',       -- Administrative notifications
  'marketing'    -- Marketing/promotional notifications
);

-- Notification template types
CREATE TYPE template_type AS ENUM (
  'email_html',
  'email_text',
  'push_notification',
  'in_app_notification',
  'sms_message',
  'webhook_payload'
);

-- Delivery status
CREATE TYPE delivery_status AS ENUM (
  'pending',     -- Queued for delivery
  'processing',  -- Currently being processed
  'delivered',   -- Successfully delivered
  'failed',      -- Delivery failed
  'bounced',     -- Email bounced
  'clicked',     -- Notification clicked/opened
  'expired'      -- Notification expired
);

-- =====================================================================
-- 2. CORE NOTIFICATION TABLES
-- =====================================================================

-- Enhanced notifications table with scheduling integration
DROP TABLE IF EXISTS notifications CASCADE;
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User targeting
  user_id UUID REFERENCES identities(id) ON DELETE CASCADE,
  user_group VARCHAR(100), -- For targeting groups of users
  
  -- Content and metadata
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  category notification_category NOT NULL DEFAULT 'system',
  type VARCHAR(100) NOT NULL, -- Extensible notification type
  priority notification_priority NOT NULL DEFAULT 'normal',
  
  -- Scheduling integration
  schedule_id UUID REFERENCES content_schedules(id) ON DELETE SET NULL,
  related_content_type VARCHAR(50), -- section, block, user, etc.
  related_content_id UUID,
  
  -- Interaction data
  link VARCHAR(500),
  action_data JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Status and lifecycle
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  
  -- Delivery tracking
  channels notification_channel[] DEFAULT ARRAY['in_app'],
  delivery_attempts INTEGER DEFAULT 0,
  max_delivery_attempts INTEGER DEFAULT 3,
  
  -- Scheduling for future delivery
  scheduled_for TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES identities(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification templates for consistent messaging
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Template identification
  template_key VARCHAR(100) NOT NULL UNIQUE,
  template_name VARCHAR(200) NOT NULL,
  template_type template_type NOT NULL,
  category notification_category NOT NULL,
  
  -- Template content with variable substitution
  subject_template TEXT, -- For email templates
  content_template TEXT NOT NULL,
  
  -- Template configuration
  is_active BOOLEAN DEFAULT true,
  variables JSONB DEFAULT '{}', -- Expected variables and their types
  
  -- Localization support
  language VARCHAR(10) DEFAULT 'ko',
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES identities(id)
);

-- User notification preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES identities(id) ON DELETE CASCADE,
  
  -- Channel preferences by category
  category notification_category NOT NULL,
  channels notification_channel[] NOT NULL DEFAULT ARRAY['in_app'],
  
  -- Timing preferences
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone VARCHAR(50) DEFAULT 'Asia/Seoul',
  
  -- Frequency controls
  digest_frequency VARCHAR(20) DEFAULT 'never', -- immediate, daily, weekly, never
  max_notifications_per_hour INTEGER DEFAULT 10,
  
  -- Specific notification types
  schedule_notifications BOOLEAN DEFAULT true,
  content_notifications BOOLEAN DEFAULT true,
  system_notifications BOOLEAN DEFAULT true,
  marketing_notifications BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, category)
);

-- Notification delivery tracking
CREATE TABLE notification_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  
  -- Delivery details
  channel notification_channel NOT NULL,
  recipient VARCHAR(255) NOT NULL, -- email, phone, device_token
  status delivery_status NOT NULL DEFAULT 'pending',
  
  -- Provider tracking
  external_id VARCHAR(255), -- Provider's message ID
  provider_name VARCHAR(100), -- SendGrid, Firebase, etc.
  
  -- Delivery metrics
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  
  -- Response data
  provider_response JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification analytics and metrics
CREATE TABLE notification_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Aggregation keys
  date DATE NOT NULL,
  hour INTEGER CHECK (hour >= 0 AND hour <= 23),
  category notification_category,
  channel notification_channel,
  template_key VARCHAR(100),
  
  -- Metrics
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  
  -- Performance metrics
  avg_delivery_time_seconds INTEGER DEFAULT 0,
  delivery_rate DECIMAL(5,4) DEFAULT 0,
  open_rate DECIMAL(5,4) DEFAULT 0,
  click_rate DECIMAL(5,4) DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(date, hour, category, channel, template_key)
);

-- Real-time notification queue for immediate delivery
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  
  -- Queue management
  priority notification_priority NOT NULL DEFAULT 'normal',
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Processing status
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Worker assignment
  worker_id VARCHAR(100),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 3. NOTIFICATION SCHEDULING INTEGRATION FUNCTIONS
-- =====================================================================

-- Function to create notification for schedule events
CREATE OR REPLACE FUNCTION create_schedule_notification(
  p_schedule_id UUID,
  p_event_type VARCHAR,
  p_user_ids UUID[],
  p_title TEXT,
  p_message TEXT,
  p_priority notification_priority DEFAULT 'normal',
  p_channels notification_channel[] DEFAULT ARRAY['in_app'],
  p_template_key VARCHAR DEFAULT NULL,
  p_template_data JSONB DEFAULT '{}'
)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_ids UUID[] := '{}';
  notification_id UUID;
  user_id UUID;
  final_title TEXT;
  final_message TEXT;
BEGIN
  -- Process template if provided
  IF p_template_key IS NOT NULL THEN
    SELECT 
      COALESCE(
        replace_template_variables(nt.subject_template, p_template_data), 
        p_title
      ),
      replace_template_variables(nt.content_template, p_template_data)
    INTO final_title, final_message
    FROM notification_templates nt
    WHERE nt.template_key = p_template_key AND nt.is_active = true;
    
    IF NOT FOUND THEN
      final_title := p_title;
      final_message := p_message;
    END IF;
  ELSE
    final_title := p_title;
    final_message := p_message;
  END IF;

  -- Create notification for each user
  FOREACH user_id IN ARRAY p_user_ids
  LOOP
    -- Check user preferences
    IF should_send_notification(user_id, 'schedule', p_channels) THEN
      INSERT INTO notifications (
        user_id,
        title,
        message,
        category,
        type,
        priority,
        schedule_id,
        related_content_type,
        related_content_id,
        channels,
        metadata,
        created_by
      ) VALUES (
        user_id,
        final_title,
        final_message,
        'schedule',
        p_event_type,
        p_priority,
        p_schedule_id,
        'schedule',
        p_schedule_id,
        p_channels,
        jsonb_build_object(
          'event_type', p_event_type,
          'template_key', p_template_key,
          'template_data', p_template_data
        ),
        auth.uid()
      ) RETURNING id INTO notification_id;
      
      notification_ids := array_append(notification_ids, notification_id);
      
      -- Queue for delivery
      PERFORM queue_notification_for_delivery(notification_id, p_priority);
    END IF;
  END LOOP;
  
  RETURN notification_ids;
END;
$$;

-- Function to check if notification should be sent based on user preferences
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_category notification_category,
  p_channels notification_channel[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_prefs RECORD;
  current_time TIME;
  user_timezone VARCHAR;
BEGIN
  -- Get user preferences
  SELECT * INTO user_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id AND category = p_category AND is_active = true;
  
  -- If no preferences found, use defaults (allow in-app only)
  IF NOT FOUND THEN
    RETURN 'in_app' = ANY(p_channels);
  END IF;
  
  -- Check if any of the requested channels are allowed
  IF NOT (user_prefs.channels && p_channels) THEN
    RETURN false;
  END IF;
  
  -- Check quiet hours
  IF user_prefs.quiet_hours_start IS NOT NULL AND user_prefs.quiet_hours_end IS NOT NULL THEN
    SELECT EXTRACT(HOUR FROM NOW() AT TIME ZONE COALESCE(user_prefs.timezone, 'Asia/Seoul'))::INTEGER INTO current_time;
    
    IF current_time BETWEEN EXTRACT(HOUR FROM user_prefs.quiet_hours_start) 
                        AND EXTRACT(HOUR FROM user_prefs.quiet_hours_end) THEN
      -- Only allow critical notifications during quiet hours
      RETURN EXISTS (
        SELECT 1 FROM notifications n 
        WHERE n.user_id = p_user_id 
        AND n.priority IN ('critical', 'urgent')
        AND n.created_at >= NOW() - INTERVAL '1 minute'
      );
    END IF;
  END IF;
  
  RETURN true;
END;
$$;

-- Function to replace template variables
CREATE OR REPLACE FUNCTION replace_template_variables(
  p_template TEXT,
  p_data JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  result TEXT := p_template;
  key TEXT;
  value TEXT;
BEGIN
  -- Replace each variable in the template
  FOR key, value IN SELECT * FROM jsonb_each_text(p_data)
  LOOP
    result := replace(result, '{{' || key || '}}', value);
  END LOOP;
  
  RETURN result;
END;
$$;

-- Function to queue notification for delivery
CREATE OR REPLACE FUNCTION queue_notification_for_delivery(
  p_notification_id UUID,
  p_priority notification_priority DEFAULT 'normal'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  queue_id UUID;
BEGIN
  INSERT INTO notification_queue (
    notification_id,
    priority,
    scheduled_for
  ) VALUES (
    p_notification_id,
    p_priority,
    CASE 
      WHEN p_priority IN ('critical', 'urgent') THEN NOW()
      ELSE NOW() + INTERVAL '1 minute'
    END
  ) RETURNING id INTO queue_id;
  
  RETURN queue_id;
END;
$$;

-- =====================================================================
-- 4. SCHEDULING SYSTEM INTEGRATION TRIGGERS
-- =====================================================================

-- Function to handle schedule creation notifications
CREATE OR REPLACE FUNCTION notify_schedule_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  relevant_users UUID[];
  content_title TEXT;
BEGIN
  -- Get relevant users (content creator, admins)
  relevant_users := ARRAY[NEW.created_by];
  
  -- Add admins
  relevant_users := relevant_users || ARRAY(
    SELECT i.id FROM identities i WHERE i.role IN ('admin', 'super_admin')
  );
  
  -- Get content title for context
  IF NEW.content_type = 'section' THEN
    SELECT title INTO content_title FROM main_content_sections WHERE id = NEW.content_id;
  ELSE
    SELECT 'Content Block' INTO content_title;
  END IF;
  
  -- Create notification
  PERFORM create_schedule_notification(
    NEW.id,
    'schedule_created',
    relevant_users,
    '새로운 스케줄이 생성되었습니다',
    format('%s에 대한 %s 작업이 %s에 예약되었습니다.', 
           COALESCE(content_title, '컨텐츠'), 
           NEW.schedule_type, 
           to_char(NEW.scheduled_time, 'YYYY-MM-DD HH24:MI')),
    'normal',
    ARRAY['in_app', 'email'],
    'schedule_created',
    jsonb_build_object(
      'content_title', COALESCE(content_title, '컨텐츠'),
      'schedule_type', NEW.schedule_type,
      'scheduled_time', NEW.scheduled_time
    )
  );
  
  RETURN NEW;
END;
$$;

-- Function to handle schedule execution notifications
CREATE OR REPLACE FUNCTION notify_schedule_executed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  relevant_users UUID[];
  content_title TEXT;
  was_successful BOOLEAN;
  notification_priority notification_priority;
BEGIN
  -- Only trigger on status changes to executed or failed
  IF OLD.status = NEW.status OR NEW.status NOT IN ('executed', 'failed') THEN
    RETURN NEW;
  END IF;
  
  was_successful := NEW.status = 'executed';
  notification_priority := CASE WHEN was_successful THEN 'normal'::notification_priority ELSE 'high'::notification_priority END;
  
  -- Get relevant users
  relevant_users := ARRAY[NEW.created_by];
  
  -- Add admins for failed executions
  IF NOT was_successful THEN
    relevant_users := relevant_users || ARRAY(
      SELECT i.id FROM identities i WHERE i.role IN ('admin', 'super_admin')
    );
  END IF;
  
  -- Get content title
  IF NEW.content_type = 'section' THEN
    SELECT title INTO content_title FROM main_content_sections WHERE id = NEW.content_id;
  ELSE
    SELECT 'Content Block' INTO content_title;
  END IF;
  
  -- Create notification
  PERFORM create_schedule_notification(
    NEW.id,
    CASE WHEN was_successful THEN 'schedule_executed' ELSE 'schedule_failed' END,
    relevant_users,
    CASE WHEN was_successful 
         THEN '스케줄이 성공적으로 실행되었습니다' 
         ELSE '스케줄 실행이 실패했습니다' END,
    format('%s에 대한 %s 작업이 %s.', 
           COALESCE(content_title, '컨텐츠'), 
           NEW.schedule_type,
           CASE WHEN was_successful THEN '성공적으로 실행되었습니다' ELSE '실패했습니다' END),
    notification_priority,
    ARRAY['in_app', 'email'],
    CASE WHEN was_successful THEN 'schedule_success' ELSE 'schedule_failure' END,
    jsonb_build_object(
      'content_title', COALESCE(content_title, '컨텐츠'),
      'schedule_type', NEW.schedule_type,
      'success', was_successful,
      'error_message', NEW.error_message
    )
  );
  
  RETURN NEW;
END;
$$;

-- Function to handle schedule reminder notifications
CREATE OR REPLACE FUNCTION create_schedule_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  schedule_rec RECORD;
  relevant_users UUID[];
  content_title TEXT;
  reminder_count INTEGER := 0;
BEGIN
  -- Find schedules that need reminders (30 minutes before execution)
  FOR schedule_rec IN
    SELECT * FROM content_schedules
    WHERE status = 'pending'
    AND scheduled_time > NOW() + INTERVAL '25 minutes'
    AND scheduled_time <= NOW() + INTERVAL '35 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE schedule_id = content_schedules.id 
      AND type = 'schedule_reminder'
      AND created_at >= NOW() - INTERVAL '1 hour'
    )
  LOOP
    -- Get relevant users
    relevant_users := ARRAY[schedule_rec.created_by];
    
    -- Get content title
    IF schedule_rec.content_type = 'section' THEN
      SELECT title INTO content_title FROM main_content_sections WHERE id = schedule_rec.content_id;
    ELSE
      content_title := 'Content Block';
    END IF;
    
    -- Create reminder notification
    PERFORM create_schedule_notification(
      schedule_rec.id,
      'schedule_reminder',
      relevant_users,
      '스케줄 실행 알림',
      format('%s에 대한 %s 작업이 곧 실행됩니다 (%s).', 
             COALESCE(content_title, '컨텐츠'), 
             schedule_rec.schedule_type,
             to_char(schedule_rec.scheduled_time, 'YYYY-MM-DD HH24:MI')),
      'high',
      ARRAY['in_app', 'push'],
      'schedule_reminder',
      jsonb_build_object(
        'content_title', COALESCE(content_title, '컨텐츠'),
        'schedule_type', schedule_rec.schedule_type,
        'scheduled_time', schedule_rec.scheduled_time
      )
    );
    
    reminder_count := reminder_count + 1;
  END LOOP;
  
  RETURN reminder_count;
END;
$$;

-- =====================================================================
-- 5. TRIGGERS AND AUTOMATION
-- =====================================================================

-- Trigger for schedule creation notifications
CREATE TRIGGER schedule_created_notification
  AFTER INSERT ON content_schedules
  FOR EACH ROW
  EXECUTE FUNCTION notify_schedule_created();

-- Trigger for schedule execution notifications
CREATE TRIGGER schedule_executed_notification
  AFTER UPDATE ON content_schedules
  FOR EACH ROW
  EXECUTE FUNCTION notify_schedule_executed();

-- Trigger for updating notification timestamps
CREATE OR REPLACE FUNCTION update_notification_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER notifications_updated_timestamp
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_timestamp();

CREATE TRIGGER notification_templates_updated_timestamp
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_timestamp();

CREATE TRIGGER notification_preferences_updated_timestamp
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_timestamp();

-- =====================================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================================

-- Core notification indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_category ON notifications(category);
CREATE INDEX idx_notifications_schedule_id ON notifications(schedule_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_scheduled_for ON notifications(scheduled_for);

-- Delivery tracking indexes
CREATE INDEX idx_notification_deliveries_notification_id ON notification_deliveries(notification_id);
CREATE INDEX idx_notification_deliveries_status ON notification_deliveries(status);
CREATE INDEX idx_notification_deliveries_channel ON notification_deliveries(channel);
CREATE INDEX idx_notification_deliveries_created_at ON notification_deliveries(created_at);

-- Queue management indexes
CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_priority ON notification_queue(priority);
CREATE INDEX idx_notification_queue_scheduled_for ON notification_queue(scheduled_for);

-- Analytics indexes
CREATE INDEX idx_notification_analytics_date ON notification_analytics(date);
CREATE INDEX idx_notification_analytics_category ON notification_analytics(category);
CREATE INDEX idx_notification_analytics_channel ON notification_analytics(channel);

-- Preferences indexes
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_category ON notification_preferences(category);

-- =====================================================================
-- 7. DEFAULT NOTIFICATION TEMPLATES
-- =====================================================================

INSERT INTO notification_templates (template_key, template_name, template_type, category, content_template, subject_template, variables) VALUES
('schedule_created', 'Schedule Created', 'in_app_notification', 'schedule', 
 '{{content_title}}에 대한 {{schedule_type}} 작업이 {{scheduled_time}}에 예약되었습니다.', 
 '새로운 스케줄이 생성되었습니다',
 '{"content_title": "string", "schedule_type": "string", "scheduled_time": "string"}'),

('schedule_success', 'Schedule Success', 'in_app_notification', 'schedule',
 '{{content_title}}에 대한 {{schedule_type}} 작업이 성공적으로 실행되었습니다.',
 '스케줄이 성공적으로 실행되었습니다',
 '{"content_title": "string", "schedule_type": "string"}'),

('schedule_failure', 'Schedule Failure', 'in_app_notification', 'schedule',
 '{{content_title}}에 대한 {{schedule_type}} 작업이 실패했습니다. 오류: {{error_message}}',
 '스케줄 실행이 실패했습니다',
 '{"content_title": "string", "schedule_type": "string", "error_message": "string"}'),

('schedule_reminder', 'Schedule Reminder', 'in_app_notification', 'schedule',
 '{{content_title}}에 대한 {{schedule_type}} 작업이 곧 실행됩니다 ({{scheduled_time}}).',
 '스케줄 실행 알림',
 '{"content_title": "string", "schedule_type": "string", "scheduled_time": "string"}'),

-- Email templates
('schedule_created_email', 'Schedule Created Email', 'email_html', 'schedule',
 '<h2>새로운 스케줄이 생성되었습니다</h2><p><strong>{{content_title}}</strong>에 대한 <strong>{{schedule_type}}</strong> 작업이 <strong>{{scheduled_time}}</strong>에 예약되었습니다.</p><p>스케줄 관리 페이지에서 확인하세요.</p>',
 '새로운 스케줄이 생성되었습니다 - {{content_title}}',
 '{"content_title": "string", "schedule_type": "string", "scheduled_time": "string"}'),

('schedule_failure_email', 'Schedule Failure Email', 'email_html', 'schedule',
 '<h2>스케줄 실행이 실패했습니다</h2><p><strong>{{content_title}}</strong>에 대한 <strong>{{schedule_type}}</strong> 작업이 실패했습니다.</p><p><strong>오류 메시지:</strong> {{error_message}}</p><p>관리자 패널에서 확인하세요.</p>',
 '스케줄 실행 실패 - {{content_title}}',
 '{"content_title": "string", "schedule_type": "string", "error_message": "string"}');

-- =====================================================================
-- 8. CRON JOBS FOR AUTOMATION
-- =====================================================================

-- Schedule reminder job (runs every 5 minutes)
SELECT cron.schedule('schedule-reminders', '*/5 * * * *', 'SELECT create_schedule_reminders();');

-- Analytics aggregation job (runs hourly)
SELECT cron.schedule('notification-analytics', '0 * * * *', $$
  INSERT INTO notification_analytics (date, hour, category, channel, template_key, total_sent, total_delivered, total_opened, total_clicked, total_failed)
  SELECT 
    DATE(created_at) as date,
    EXTRACT(HOUR FROM created_at) as hour,
    n.category,
    unnest(n.channels) as channel,
    COALESCE(n.metadata->>'template_key', 'default') as template_key,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE nd.status = 'delivered') as total_delivered,
    COUNT(*) FILTER (WHERE nd.opened_at IS NOT NULL) as total_opened,
    COUNT(*) FILTER (WHERE nd.clicked_at IS NOT NULL) as total_clicked,
    COUNT(*) FILTER (WHERE nd.status = 'failed') as total_failed
  FROM notifications n
  LEFT JOIN notification_deliveries nd ON nd.notification_id = n.id
  WHERE n.created_at >= NOW() - INTERVAL '2 hours'
  AND n.created_at < NOW() - INTERVAL '1 hour'
  GROUP BY DATE(n.created_at), EXTRACT(HOUR FROM n.created_at), n.category, unnest(n.channels), COALESCE(n.metadata->>'template_key', 'default')
  ON CONFLICT (date, hour, category, channel, template_key) DO UPDATE SET
    total_sent = EXCLUDED.total_sent,
    total_delivered = EXCLUDED.total_delivered,
    total_opened = EXCLUDED.total_opened,
    total_clicked = EXCLUDED.total_clicked,
    total_failed = EXCLUDED.total_failed,
    updated_at = NOW();
$$);

-- Cleanup old notifications (runs daily)
SELECT cron.schedule('notification-cleanup', '0 2 * * *', $$
  DELETE FROM notifications 
  WHERE created_at < NOW() - INTERVAL '90 days' 
  AND is_archived = true;
  
  DELETE FROM notification_deliveries 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  DELETE FROM notification_queue 
  WHERE status IN ('completed', 'failed') 
  AND created_at < NOW() - INTERVAL '7 days';
$$);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

-- Enable RLS on notification tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Notification policies - users can only access their own notifications
CREATE POLICY "notifications_user_access" ON notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_admin_access" ON notifications
FOR ALL USING (has_role_or_higher('admin'::security_role));

-- Template policies - admins only
CREATE POLICY "notification_templates_admin_only" ON notification_templates
FOR ALL USING (has_role_or_higher('admin'::security_role));

-- Preferences policies - users can manage their own preferences
CREATE POLICY "notification_preferences_user_access" ON notification_preferences
FOR ALL USING (user_id = auth.uid() OR has_role_or_higher('admin'::security_role));

-- Delivery tracking - admins only
CREATE POLICY "notification_deliveries_admin_only" ON notification_deliveries
FOR ALL USING (has_role_or_higher('admin'::security_role));

-- Analytics - admins only
CREATE POLICY "notification_analytics_admin_only" ON notification_analytics
FOR ALL USING (has_role_or_higher('admin'::security_role));

-- Queue - system and admins only
CREATE POLICY "notification_queue_system_only" ON notification_queue
FOR ALL USING (has_role_or_higher('admin'::security_role));

-- =====================================================================
-- COMPLETION
-- =====================================================================

COMMENT ON SCHEMA public IS 'AiEduLog - Comprehensive Notification System with Scheduling Integration';

SELECT 'Comprehensive Notification System with Scheduling Integration successfully implemented!' AS status;