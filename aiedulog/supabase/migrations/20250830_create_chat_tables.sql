-- ============================================================================
-- CHAT SYSTEM DATABASE SCHEMA MIGRATION
-- Creates all necessary tables for Loop-style chat with embedded apps
-- ============================================================================

-- 1. CHAT ROOMS TABLE
-- Stores chat rooms/channels with support for direct, group, and channel types
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  type TEXT CHECK (type IN ('direct', 'group', 'channel', 'collaboration')) DEFAULT 'direct',
  created_by UUID REFERENCES identities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  is_archived BOOLEAN DEFAULT FALSE,
  description TEXT
);

-- 2. CHAT PARTICIPANTS TABLE  
-- Manages who can access each chat room with roles and permissions
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES identities(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  notifications_enabled BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  permissions JSONB DEFAULT '{"read": true, "write": true, "embed": true}',
  UNIQUE(room_id, user_id)
);

-- 3. CHAT MESSAGES TABLE
-- Core message storage with support for different types and threading
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES identities(id) ON DELETE SET NULL,
  message TEXT,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'file', 'image', 'video', 'embed', 'excalidraw', 'kanban', 'todo', 'poll', 'system')),
  attachments JSONB DEFAULT '{}',
  parent_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL, -- For threading
  reactions JSONB DEFAULT '{}', -- {"👍": ["user1", "user2"], "❤️": ["user3"]}
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- 4. CHAT EMBEDS TABLE
-- Manages embedded apps/components within messages (Loop-style)
CREATE TABLE IF NOT EXISTS chat_embeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL CHECK (component_type IN ('excalidraw', 'kanban', 'todo', 'poll', 'document', 'spreadsheet', 'calendar')),
  component_data JSONB NOT NULL DEFAULT '{}',
  permissions JSONB DEFAULT '{"view": "all", "edit": "owner"}',
  size_config JSONB DEFAULT '{"width": 600, "height": 400, "resizable": true}',
  collaboration_settings JSONB DEFAULT '{"realtime": true, "version_control": false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES identities(id) ON DELETE SET NULL
);

-- 5. COLLABORATION BOARDS TABLE (Optional - for workspace-style boards)
CREATE TABLE IF NOT EXISTS collaboration_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('kanban', 'whiteboard', 'document', 'spreadsheet')),
  content JSONB DEFAULT '{}',
  created_by UUID REFERENCES identities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_public BOOLEAN DEFAULT FALSE,
  settings JSONB DEFAULT '{}'
);

-- 6. CHAT FILES TABLE
-- File management for chat attachments
CREATE TABLE IF NOT EXISTS chat_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  storage_path TEXT NOT NULL, -- Supabase storage path
  uploaded_by UUID REFERENCES identities(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  is_image BOOLEAN DEFAULT FALSE,
  thumbnail_path TEXT -- For image/video thumbnails
);

-- 7. CHAT PRESENCE TABLE
-- Real-time presence and typing indicators
CREATE TABLE IF NOT EXISTS chat_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES identities(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  is_typing BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  typing_started_at TIMESTAMPTZ,
  UNIQUE(room_id, user_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_parent ON chat_messages(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON chat_messages(type) WHERE type != 'text';

-- Chat participants indexes  
CREATE INDEX IF NOT EXISTS idx_chat_participants_room ON chat_participants(room_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id) WHERE is_active = true;

-- Chat rooms indexes
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON chat_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON chat_rooms(type);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_updated ON chat_rooms(updated_at DESC) WHERE is_archived = false;

-- Full-text search index for messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_search ON chat_messages USING gin(to_tsvector('english', message)) WHERE is_deleted = false;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_embeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_presence ENABLE ROW LEVEL SECURITY;

-- Chat rooms policies
CREATE POLICY "Users can view rooms they participate in" ON chat_rooms
  FOR SELECT USING (
    id IN (
      SELECT room_id FROM chat_participants 
      WHERE user_id = (
        SELECT identity_id FROM auth_methods 
        WHERE provider = 'supabase' AND provider_user_id = auth.uid()
      ) AND is_active = true
    )
  );

CREATE POLICY "Users can create rooms" ON chat_rooms
  FOR INSERT WITH CHECK (
    created_by = (
      SELECT identity_id FROM auth_methods 
      WHERE provider = 'supabase' AND provider_user_id = auth.uid()
    )
  );

CREATE POLICY "Room owners can update rooms" ON chat_rooms
  FOR UPDATE USING (
    created_by = (
      SELECT identity_id FROM auth_methods 
      WHERE provider = 'supabase' AND provider_user_id = auth.uid()
    )
    OR
    id IN (
      SELECT room_id FROM chat_participants 
      WHERE user_id = (
        SELECT identity_id FROM auth_methods 
        WHERE provider = 'supabase' AND provider_user_id = auth.uid()
      ) AND role IN ('owner', 'admin') AND is_active = true
    )
  );

-- Chat participants policies
CREATE POLICY "Users can view participants of rooms they're in" ON chat_participants
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM chat_participants cp2
      WHERE cp2.user_id = (
        SELECT identity_id FROM auth_methods 
        WHERE provider = 'supabase' AND provider_user_id = auth.uid()
      ) AND cp2.is_active = true
    )
  );

CREATE POLICY "Room admins can manage participants" ON chat_participants
  FOR ALL USING (
    room_id IN (
      SELECT room_id FROM chat_participants
      WHERE user_id = (
        SELECT identity_id FROM auth_methods 
        WHERE provider = 'supabase' AND provider_user_id = auth.uid()
      ) AND role IN ('owner', 'admin') AND is_active = true
    )
  );

-- Chat messages policies
CREATE POLICY "Users can view messages in their rooms" ON chat_messages
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM chat_participants 
      WHERE user_id = (
        SELECT identity_id FROM auth_methods 
        WHERE provider = 'supabase' AND provider_user_id = auth.uid()
      ) AND is_active = true
    )
  );

CREATE POLICY "Users can send messages to their rooms" ON chat_messages
  FOR INSERT WITH CHECK (
    room_id IN (
      SELECT room_id FROM chat_participants 
      WHERE user_id = (
        SELECT identity_id FROM auth_methods 
        WHERE provider = 'supabase' AND provider_user_id = auth.uid()
      ) AND is_active = true
    )
    AND sender_id = (
      SELECT identity_id FROM auth_methods 
      WHERE provider = 'supabase' AND provider_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages" ON chat_messages
  FOR UPDATE USING (
    sender_id = (
      SELECT identity_id FROM auth_methods 
      WHERE provider = 'supabase' AND provider_user_id = auth.uid()
    )
  );

-- Similar policies for other tables...
CREATE POLICY "Users can manage embeds in their rooms" ON chat_embeds
  FOR ALL USING (
    message_id IN (
      SELECT id FROM chat_messages cm
      WHERE cm.room_id IN (
        SELECT room_id FROM chat_participants 
        WHERE user_id = (
          SELECT identity_id FROM auth_methods 
          WHERE provider = 'supabase' AND provider_user_id = auth.uid()
        ) AND is_active = true
      )
    )
  );

CREATE POLICY "Users can manage files in their rooms" ON chat_files
  FOR ALL USING (
    message_id IN (
      SELECT id FROM chat_messages cm
      WHERE cm.room_id IN (
        SELECT room_id FROM chat_participants 
        WHERE user_id = (
          SELECT identity_id FROM auth_methods 
          WHERE provider = 'supabase' AND provider_user_id = auth.uid()
        ) AND is_active = true
      )
    )
  );

CREATE POLICY "Users can manage presence in their rooms" ON chat_presence
  FOR ALL USING (
    room_id IN (
      SELECT room_id FROM chat_participants 
      WHERE user_id = (
        SELECT identity_id FROM auth_methods 
        WHERE provider = 'supabase' AND provider_user_id = auth.uid()
      ) AND is_active = true
    )
  );

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to create or get direct chat between two users
CREATE OR REPLACE FUNCTION create_or_get_direct_chat(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  room_id UUID;
BEGIN
  -- Check if direct chat already exists between these users
  SELECT cr.id INTO room_id
  FROM chat_rooms cr
  JOIN chat_participants cp1 ON cr.id = cp1.room_id AND cp1.user_id = user1_id AND cp1.is_active = true
  JOIN chat_participants cp2 ON cr.id = cp2.room_id AND cp2.user_id = user2_id AND cp2.is_active = true
  WHERE cr.type = 'direct'
  AND (
    SELECT COUNT(*) FROM chat_participants cp3 
    WHERE cp3.room_id = cr.id AND cp3.is_active = true
  ) = 2
  LIMIT 1;

  -- If no direct chat exists, create one
  IF room_id IS NULL THEN
    -- Create new room
    INSERT INTO chat_rooms (type, created_by) 
    VALUES ('direct', user1_id)
    RETURNING id INTO room_id;
    
    -- Add both participants
    INSERT INTO chat_participants (room_id, user_id, role, is_active) VALUES
      (room_id, user1_id, 'owner', true),
      (room_id, user2_id, 'member', true);
  END IF;

  RETURN room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update room's last message
CREATE OR REPLACE FUNCTION update_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_rooms 
  SET 
    last_message = NEW.message,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.room_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update room's last message
CREATE TRIGGER trigger_update_room_last_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  WHEN (NEW.is_deleted = false)
  EXECUTE FUNCTION update_room_last_message();

-- Function to clean up old presence records
CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM chat_presence 
  WHERE last_seen < NOW() - INTERVAL '1 day'
  AND status = 'offline';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE DATA (Optional - for development)
-- ============================================================================

-- This section can be removed in production
DO $$
DECLARE
  sample_identity_id UUID;
  sample_room_id UUID;
BEGIN
  -- Only insert sample data if no rooms exist
  IF NOT EXISTS (SELECT 1 FROM chat_rooms LIMIT 1) THEN
    -- Get first identity (if any exists)
    SELECT id INTO sample_identity_id FROM identities LIMIT 1;
    
    IF sample_identity_id IS NOT NULL THEN
      -- Create sample room
      INSERT INTO chat_rooms (name, type, created_by)
      VALUES ('General Discussion', 'channel', sample_identity_id)
      RETURNING id INTO sample_room_id;
      
      -- Add creator as participant
      INSERT INTO chat_participants (room_id, user_id, role)
      VALUES (sample_room_id, sample_identity_id, 'owner');
      
      -- Add welcome message
      INSERT INTO chat_messages (room_id, sender_id, message, type)
      VALUES (sample_room_id, sample_identity_id, 'Welcome to the chat system! 🎉', 'system');
    END IF;
  END IF;
END $$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Add migration tracking
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('20250830_create_chat_tables', NOW()) 
ON CONFLICT (version) DO NOTHING;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Chat system migration completed successfully!';
  RAISE NOTICE 'Tables created: chat_rooms, chat_participants, chat_messages, chat_embeds, collaboration_boards, chat_files, chat_presence';
  RAISE NOTICE 'Indexes and RLS policies applied';
  RAISE NOTICE 'Ready for Loop-style chat with embedded apps';
END $$;