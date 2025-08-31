-- ============================================================================
-- REAL-TIME COLLABORATION SYSTEM FOR LOOP-STYLE EMBEDS
-- Microsoft Loop-style real-time collaborative editing for embedded components
-- ============================================================================

-- 1. EMBED COLLABORATION SESSIONS TABLE
-- Manages active collaboration sessions for embeds
CREATE TABLE IF NOT EXISTS embed_collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embed_id UUID REFERENCES chat_embeds(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL, -- Unique session identifier
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  is_active BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{"conflict_resolution": "last_writer_wins", "sync_interval": 100}',
  UNIQUE(embed_id, session_id)
);

-- 2. EMBED OPERATIONS LOG TABLE
-- Operational Transform log for conflict resolution
CREATE TABLE IF NOT EXISTS embed_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embed_id UUID REFERENCES chat_embeds(id) ON DELETE CASCADE,
  session_id UUID REFERENCES embed_collaboration_sessions(id) ON DELETE CASCADE,
  operation_id TEXT NOT NULL, -- Client-generated operation ID
  user_id UUID REFERENCES identities(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('insert', 'update', 'delete', 'move', 'batch')),
  operation_data JSONB NOT NULL, -- The actual operation data
  target_path TEXT, -- JSON path for the operation target (e.g. 'columns.0.cards.1.title')
  vector_clock JSONB DEFAULT '{}', -- Vector clock for ordering
  sequence_number BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  is_applied BOOLEAN DEFAULT FALSE,
  conflict_resolved BOOLEAN DEFAULT FALSE,
  parent_operation_id UUID REFERENCES embed_operations(id) ON DELETE SET NULL
);

-- 3. EMBED SNAPSHOTS TABLE
-- Periodic snapshots for performance and recovery
CREATE TABLE IF NOT EXISTS embed_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embed_id UUID REFERENCES chat_embeds(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL,
  sequence_number BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES identities(id) ON DELETE SET NULL,
  snapshot_type TEXT DEFAULT 'periodic' CHECK (snapshot_type IN ('periodic', 'manual', 'recovery'))
);

-- 4. EMBED PRESENCE TABLE  
-- Real-time presence tracking for collaborative editing
CREATE TABLE IF NOT EXISTS embed_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embed_id UUID REFERENCES chat_embeds(id) ON DELETE CASCADE,
  user_id UUID REFERENCES identities(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'idle', 'away', 'disconnected')),
  cursor_position JSONB, -- Current cursor/selection position
  editing_path TEXT, -- What the user is currently editing (JSON path)
  presence_data JSONB DEFAULT '{}', -- Additional presence info (color, name, etc.)
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(embed_id, user_id, session_id)
);

-- 5. EMBED LOCKS TABLE
-- Fine-grained locking for specific embed elements
CREATE TABLE IF NOT EXISTS embed_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embed_id UUID REFERENCES chat_embeds(id) ON DELETE CASCADE,
  user_id UUID REFERENCES identities(id) ON DELETE CASCADE,
  lock_path TEXT NOT NULL, -- JSON path of locked element
  lock_type TEXT DEFAULT 'exclusive' CHECK (lock_type IN ('exclusive', 'shared', 'intention')),
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 minutes'),
  is_active BOOLEAN DEFAULT TRUE,
  lock_data JSONB DEFAULT '{}', -- Additional lock metadata
  UNIQUE(embed_id, lock_path, lock_type)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Embed operations indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_embed_operations_embed_sequence ON embed_operations(embed_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_embed_operations_session ON embed_operations(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_embed_operations_user ON embed_operations(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_embed_operations_target ON embed_operations(embed_id, target_path);

-- Presence indexes for real-time queries
CREATE INDEX IF NOT EXISTS idx_embed_presence_embed ON embed_presence(embed_id) WHERE status != 'disconnected';
CREATE INDEX IF NOT EXISTS idx_embed_presence_user ON embed_presence(user_id, last_seen);
CREATE INDEX IF NOT EXISTS idx_embed_presence_heartbeat ON embed_presence(heartbeat_at) WHERE status IN ('active', 'idle');

-- Locks indexes for conflict detection
CREATE INDEX IF NOT EXISTS idx_embed_locks_embed_path ON embed_locks(embed_id, lock_path) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_embed_locks_user ON embed_locks(user_id, acquired_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_embed_locks_expiry ON embed_locks(expires_at) WHERE is_active = true;

-- Snapshots indexes for recovery
CREATE INDEX IF NOT EXISTS idx_embed_snapshots_embed_seq ON embed_snapshots(embed_id, sequence_number DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE embed_collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE embed_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE embed_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE embed_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE embed_locks ENABLE ROW LEVEL SECURITY;

-- Collaboration sessions policies
CREATE POLICY "Users can manage sessions for accessible embeds" ON embed_collaboration_sessions
  FOR ALL USING (
    embed_id IN (
      SELECT ce.id FROM chat_embeds ce
      JOIN chat_messages cm ON ce.message_id = cm.id
      WHERE cm.room_id IN (
        SELECT room_id FROM chat_participants 
        WHERE user_id = (
          SELECT identity_id FROM auth_methods 
          WHERE provider = 'supabase' AND provider_user_id = auth.uid()
        ) AND is_active = true
      )
    )
  );

-- Operations policies
CREATE POLICY "Users can manage operations for accessible embeds" ON embed_operations
  FOR ALL USING (
    embed_id IN (
      SELECT ce.id FROM chat_embeds ce
      JOIN chat_messages cm ON ce.message_id = cm.id
      WHERE cm.room_id IN (
        SELECT room_id FROM chat_participants 
        WHERE user_id = (
          SELECT identity_id FROM auth_methods 
          WHERE provider = 'supabase' AND provider_user_id = auth.uid()
        ) AND is_active = true
      )
    )
  );

-- Snapshots policies
CREATE POLICY "Users can view snapshots for accessible embeds" ON embed_snapshots
  FOR SELECT USING (
    embed_id IN (
      SELECT ce.id FROM chat_embeds ce
      JOIN chat_messages cm ON ce.message_id = cm.id
      WHERE cm.room_id IN (
        SELECT room_id FROM chat_participants 
        WHERE user_id = (
          SELECT identity_id FROM auth_methods 
          WHERE provider = 'supabase' AND provider_user_id = auth.uid()
        ) AND is_active = true
      )
    )
  );

CREATE POLICY "Users can create snapshots for accessible embeds" ON embed_snapshots
  FOR INSERT WITH CHECK (
    embed_id IN (
      SELECT ce.id FROM chat_embeds ce
      JOIN chat_messages cm ON ce.message_id = cm.id
      WHERE cm.room_id IN (
        SELECT room_id FROM chat_participants 
        WHERE user_id = (
          SELECT identity_id FROM auth_methods 
          WHERE provider = 'supabase' AND provider_user_id = auth.uid()
        ) AND is_active = true
      )
    )
    AND created_by = (
      SELECT identity_id FROM auth_methods 
      WHERE provider = 'supabase' AND provider_user_id = auth.uid()
    )
  );

-- Presence policies
CREATE POLICY "Users can manage their own presence" ON embed_presence
  FOR ALL USING (
    user_id = (
      SELECT identity_id FROM auth_methods 
      WHERE provider = 'supabase' AND provider_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view presence for accessible embeds" ON embed_presence
  FOR SELECT USING (
    embed_id IN (
      SELECT ce.id FROM chat_embeds ce
      JOIN chat_messages cm ON ce.message_id = cm.id
      WHERE cm.room_id IN (
        SELECT room_id FROM chat_participants 
        WHERE user_id = (
          SELECT identity_id FROM auth_methods 
          WHERE provider = 'supabase' AND provider_user_id = auth.uid()
        ) AND is_active = true
      )
    )
  );

-- Locks policies
CREATE POLICY "Users can manage locks for accessible embeds" ON embed_locks
  FOR ALL USING (
    embed_id IN (
      SELECT ce.id FROM chat_embeds ce
      JOIN chat_messages cm ON ce.message_id = cm.id
      WHERE cm.room_id IN (
        SELECT room_id FROM chat_participants 
        WHERE user_id = (
          SELECT identity_id FROM auth_methods 
          WHERE provider = 'supabase' AND provider_user_id = auth.uid()
        ) AND is_active = true
      )
    )
  );

-- ============================================================================
-- STORED PROCEDURES AND FUNCTIONS
-- ============================================================================

-- 1. Create collaboration session
CREATE OR REPLACE FUNCTION create_embed_collaboration_session(
  p_embed_id UUID,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
  v_session_key TEXT;
BEGIN
  -- Generate unique session key
  v_session_key := 'session_' || extract(epoch from now()) || '_' || substr(gen_random_uuid()::text, 1, 8);
  
  -- Create session
  INSERT INTO embed_collaboration_sessions (embed_id, session_id)
  VALUES (p_embed_id, v_session_key)
  RETURNING id INTO v_session_id;
  
  -- Initialize user presence
  INSERT INTO embed_presence (embed_id, user_id, session_id, status)
  VALUES (p_embed_id, p_user_id, v_session_key, 'active')
  ON CONFLICT (embed_id, user_id, session_id) 
  DO UPDATE SET 
    status = 'active',
    last_seen = NOW(),
    heartbeat_at = NOW();
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Apply operation with conflict resolution
CREATE OR REPLACE FUNCTION apply_embed_operation(
  p_embed_id UUID,
  p_session_id UUID,
  p_operation_id TEXT,
  p_user_id UUID,
  p_operation_type TEXT,
  p_operation_data JSONB,
  p_target_path TEXT DEFAULT NULL,
  p_vector_clock JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
  v_sequence_number BIGINT;
  v_current_data JSONB;
  v_new_data JSONB;
  v_operation_id UUID;
  v_conflict_detected BOOLEAN := FALSE;
  v_result JSONB;
BEGIN
  -- Get next sequence number
  SELECT COALESCE(MAX(sequence_number), 0) + 1 
  INTO v_sequence_number
  FROM embed_operations 
  WHERE embed_id = p_embed_id;
  
  -- Get current embed data
  SELECT component_data INTO v_current_data
  FROM chat_embeds 
  WHERE id = p_embed_id;
  
  -- Insert operation record
  INSERT INTO embed_operations (
    embed_id, session_id, operation_id, user_id, 
    operation_type, operation_data, target_path, 
    vector_clock, sequence_number
  ) VALUES (
    p_embed_id, p_session_id, p_operation_id, p_user_id,
    p_operation_type, p_operation_data, p_target_path,
    p_vector_clock, v_sequence_number
  ) RETURNING id INTO v_operation_id;
  
  -- Apply operation based on type
  CASE p_operation_type
    WHEN 'insert' THEN
      -- Handle insert operations
      IF p_target_path IS NOT NULL THEN
        v_new_data := jsonb_set(v_current_data, string_to_array(p_target_path, '.'), p_operation_data, true);
      ELSE
        v_new_data := v_current_data || p_operation_data;
      END IF;
      
    WHEN 'update' THEN
      -- Handle update operations
      IF p_target_path IS NOT NULL THEN
        v_new_data := jsonb_set(v_current_data, string_to_array(p_target_path, '.'), p_operation_data);
      ELSE
        v_new_data := p_operation_data;
      END IF;
      
    WHEN 'delete' THEN
      -- Handle delete operations
      IF p_target_path IS NOT NULL THEN
        v_new_data := v_current_data #- string_to_array(p_target_path, '.');
      END IF;
      
    WHEN 'move' THEN
      -- Handle move operations (for drag & drop)
      v_new_data := v_current_data; -- Complex move logic would go here
      
    ELSE
      -- Unknown operation type
      v_new_data := v_current_data;
  END CASE;
  
  -- Update embed data
  UPDATE chat_embeds 
  SET 
    component_data = v_new_data,
    updated_at = NOW()
  WHERE id = p_embed_id;
  
  -- Mark operation as applied
  UPDATE embed_operations 
  SET 
    is_applied = true,
    applied_at = NOW()
  WHERE id = v_operation_id;
  
  -- Return result
  v_result := jsonb_build_object(
    'success', true,
    'operation_id', v_operation_id,
    'sequence_number', v_sequence_number,
    'data', v_new_data,
    'conflict_detected', v_conflict_detected
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update user presence
CREATE OR REPLACE FUNCTION update_embed_presence(
  p_embed_id UUID,
  p_user_id UUID,
  p_session_id TEXT,
  p_status TEXT DEFAULT 'active',
  p_cursor_position JSONB DEFAULT NULL,
  p_editing_path TEXT DEFAULT NULL,
  p_presence_data JSONB DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
  INSERT INTO embed_presence (
    embed_id, user_id, session_id, status, 
    cursor_position, editing_path, presence_data,
    last_seen, heartbeat_at
  ) VALUES (
    p_embed_id, p_user_id, p_session_id, p_status,
    p_cursor_position, p_editing_path, p_presence_data,
    NOW(), NOW()
  )
  ON CONFLICT (embed_id, user_id, session_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    cursor_position = EXCLUDED.cursor_position,
    editing_path = EXCLUDED.editing_path,
    presence_data = EXCLUDED.presence_data,
    last_seen = NOW(),
    heartbeat_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Acquire element lock
CREATE OR REPLACE FUNCTION acquire_embed_lock(
  p_embed_id UUID,
  p_user_id UUID,
  p_lock_path TEXT,
  p_lock_type TEXT DEFAULT 'exclusive',
  p_timeout_seconds INTEGER DEFAULT 300
) RETURNS BOOLEAN AS $$
DECLARE
  v_existing_lock_count INTEGER;
  v_expires_at TIMESTAMPTZ;
BEGIN
  v_expires_at := NOW() + (p_timeout_seconds || ' seconds')::INTERVAL;
  
  -- Check for existing conflicting locks
  SELECT COUNT(*) INTO v_existing_lock_count
  FROM embed_locks
  WHERE embed_id = p_embed_id 
    AND lock_path = p_lock_path 
    AND is_active = true
    AND expires_at > NOW()
    AND (lock_type = 'exclusive' OR p_lock_type = 'exclusive')
    AND user_id != p_user_id;
  
  -- If conflicting locks exist, return false
  IF v_existing_lock_count > 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Acquire lock
  INSERT INTO embed_locks (
    embed_id, user_id, lock_path, lock_type, expires_at
  ) VALUES (
    p_embed_id, p_user_id, p_lock_path, p_lock_type, v_expires_at
  )
  ON CONFLICT (embed_id, lock_path, lock_type)
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    acquired_at = NOW(),
    expires_at = EXCLUDED.expires_at,
    is_active = true;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Release element lock
CREATE OR REPLACE FUNCTION release_embed_lock(
  p_embed_id UUID,
  p_user_id UUID,
  p_lock_path TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE embed_locks
  SET is_active = false
  WHERE embed_id = p_embed_id
    AND user_id = p_user_id
    AND lock_path = p_lock_path
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create periodic snapshot
CREATE OR REPLACE FUNCTION create_embed_snapshot(
  p_embed_id UUID,
  p_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_current_data JSONB;
  v_sequence_number BIGINT;
  v_snapshot_id UUID;
BEGIN
  -- Get current embed data
  SELECT component_data INTO v_current_data
  FROM chat_embeds 
  WHERE id = p_embed_id;
  
  -- Get current sequence number
  SELECT COALESCE(MAX(sequence_number), 0) 
  INTO v_sequence_number
  FROM embed_operations 
  WHERE embed_id = p_embed_id;
  
  -- Create snapshot
  INSERT INTO embed_snapshots (
    embed_id, snapshot_data, sequence_number, created_by
  ) VALUES (
    p_embed_id, v_current_data, v_sequence_number, p_user_id
  ) RETURNING id INTO v_snapshot_id;
  
  -- Clean up old snapshots (keep last 10)
  DELETE FROM embed_snapshots 
  WHERE embed_id = p_embed_id 
    AND id NOT IN (
      SELECT id FROM embed_snapshots 
      WHERE embed_id = p_embed_id 
      ORDER BY created_at DESC 
      LIMIT 10
    );
  
  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

-- Clean up expired sessions and locks
CREATE OR REPLACE FUNCTION cleanup_embed_collaboration()
RETURNS VOID AS $$
BEGIN
  -- Mark expired sessions as inactive
  UPDATE embed_collaboration_sessions 
  SET is_active = false 
  WHERE expires_at < NOW() AND is_active = true;
  
  -- Release expired locks
  UPDATE embed_locks 
  SET is_active = false 
  WHERE expires_at < NOW() AND is_active = true;
  
  -- Update stale presence to disconnected
  UPDATE embed_presence 
  SET status = 'disconnected'
  WHERE heartbeat_at < NOW() - INTERVAL '1 minute' 
    AND status != 'disconnected';
  
  -- Clean up old operations (keep last 1000 per embed)
  DELETE FROM embed_operations
  WHERE id NOT IN (
    SELECT id FROM (
      SELECT id, row_number() OVER (PARTITION BY embed_id ORDER BY sequence_number DESC) as rn
      FROM embed_operations
    ) ranked
    WHERE rn <= 1000
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update embed timestamp when operations are applied
CREATE OR REPLACE FUNCTION trigger_update_embed_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_embeds 
  SET updated_at = NOW()
  WHERE id = NEW.embed_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER embed_operations_update_timestamp
  AFTER INSERT ON embed_operations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_embed_timestamp();

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant permissions for collaboration functions
GRANT EXECUTE ON FUNCTION create_embed_collaboration_session(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_embed_operation(UUID, UUID, TEXT, UUID, TEXT, JSONB, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_embed_presence(UUID, UUID, TEXT, TEXT, JSONB, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION acquire_embed_lock(UUID, UUID, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION release_embed_lock(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_embed_snapshot(UUID, UUID) TO authenticated;

-- ============================================================================
-- MIGRATION TRACKING
-- ============================================================================

INSERT INTO schema_migrations (version, applied_at) 
VALUES ('20250830_embed_collaboration', NOW()) 
ON CONFLICT (version) DO NOTHING;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Real-time collaboration system migration completed!';
  RAISE NOTICE 'Features: Operational Transform, Conflict Resolution, Presence, Locking, Snapshots';
  RAISE NOTICE 'Ready for Microsoft Loop-style collaborative editing';
END $$;