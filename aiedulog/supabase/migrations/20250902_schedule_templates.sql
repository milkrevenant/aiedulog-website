-- Schedule Templates Table
-- Stores reusable schedule configuration templates

CREATE TABLE IF NOT EXISTS schedule_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_config JSONB NOT NULL DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES identities(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES identities(id) ON DELETE SET NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_schedule_templates_name ON schedule_templates(name);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_created_by ON schedule_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_active ON schedule_templates(is_active) WHERE is_active = true;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_schedule_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_schedule_templates_timestamp_trigger
  BEFORE UPDATE ON schedule_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_templates_timestamp();

-- RLS Policies
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage schedule templates" ON schedule_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM identities i
      WHERE i.auth_user_id = auth.uid()
      AND i.role IN ('admin', 'moderator')
    )
  );

-- Users can view active templates
CREATE POLICY "Users can view active schedule templates" ON schedule_templates
  FOR SELECT USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM identities i
      WHERE i.auth_user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON schedule_templates TO authenticated;
GRANT SELECT ON schedule_templates TO anon;

-- Add some default templates
INSERT INTO schedule_templates (name, description, template_config) VALUES
('Daily Blog Post', 'Publish blog posts daily at 9 AM', '{
  "schedule_type": "publish",
  "timezone": "Asia/Seoul",
  "recurrence_rule": "FREQ=DAILY;BYHOUR=9;BYMINUTE=0",
  "action_data": {}
}'),
('Weekly Newsletter', 'Send newsletter every Monday at 10 AM', '{
  "schedule_type": "publish",
  "timezone": "Asia/Seoul", 
  "recurrence_rule": "FREQ=WEEKLY;BYDAY=MO;BYHOUR=10;BYMINUTE=0",
  "action_data": {}
}'),
('Auto Archive Old Posts', 'Archive posts older than 30 days', '{
  "schedule_type": "archive",
  "timezone": "Asia/Seoul",
  "recurrence_rule": "FREQ=DAILY;BYHOUR=2;BYMINUTE=0",
  "action_data": {
    "archive_older_than_days": 30
  }
}')
ON CONFLICT DO NOTHING;