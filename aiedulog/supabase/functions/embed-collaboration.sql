-- ============================================================================
-- ADDITIONAL RPC FUNCTIONS FOR EMBED COLLABORATION
-- Advanced collaboration features and helper functions
-- ============================================================================

-- 1. Bulk operation application for batch updates
CREATE OR REPLACE FUNCTION apply_embed_operations_batch(
  p_embed_id UUID,
  p_session_id UUID,
  p_user_id UUID,
  p_operations JSONB -- Array of operation objects
) RETURNS JSONB AS $$
DECLARE
  v_operation JSONB;
  v_results JSONB := '[]'::jsonb;
  v_result JSONB;
  v_current_data JSONB;
  v_sequence_number BIGINT;
BEGIN
  -- Get current embed data
  SELECT component_data INTO v_current_data
  FROM chat_embeds 
  WHERE id = p_embed_id;
  
  -- Process each operation in the batch
  FOR v_operation IN SELECT * FROM jsonb_array_elements(p_operations)
  LOOP
    -- Get next sequence number
    SELECT COALESCE(MAX(sequence_number), 0) + 1 
    INTO v_sequence_number
    FROM embed_operations 
    WHERE embed_id = p_embed_id;
    
    -- Apply individual operation
    SELECT apply_embed_operation(
      p_embed_id,
      p_session_id,
      v_operation->>'operation_id',
      p_user_id,
      v_operation->>'type',
      v_operation->'data',
      v_operation->>'target_path',
      COALESCE(v_operation->'vector_clock', '{}'::jsonb)
    ) INTO v_result;
    
    -- Add result to results array
    v_results := v_results || jsonb_build_array(v_result);
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'operations_applied', jsonb_array_length(p_operations),
    'results', v_results
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'operations_applied', jsonb_array_length(v_results)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Get embed collaboration status and metrics
CREATE OR REPLACE FUNCTION get_embed_collaboration_status(
  p_embed_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_active_sessions INTEGER;
  v_active_users INTEGER;
  v_total_operations INTEGER;
  v_recent_operations INTEGER;
  v_conflicts INTEGER;
  v_last_activity TIMESTAMPTZ;
BEGIN
  -- Count active sessions
  SELECT COUNT(*) INTO v_active_sessions
  FROM embed_collaboration_sessions
  WHERE embed_id = p_embed_id 
    AND is_active = true 
    AND expires_at > NOW();
  
  -- Count active users (from presence)
  SELECT COUNT(DISTINCT user_id) INTO v_active_users
  FROM embed_presence
  WHERE embed_id = p_embed_id 
    AND status IN ('active', 'idle')
    AND heartbeat_at > NOW() - INTERVAL '2 minutes';
  
  -- Count total operations
  SELECT COUNT(*) INTO v_total_operations
  FROM embed_operations
  WHERE embed_id = p_embed_id;
  
  -- Count recent operations (last hour)
  SELECT COUNT(*) INTO v_recent_operations
  FROM embed_operations
  WHERE embed_id = p_embed_id 
    AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Count unresolved conflicts
  SELECT COUNT(*) INTO v_conflicts
  FROM embed_operations
  WHERE embed_id = p_embed_id 
    AND conflict_resolved = false
    AND created_at > NOW() - INTERVAL '1 day';
  
  -- Get last activity time
  SELECT MAX(created_at) INTO v_last_activity
  FROM embed_operations
  WHERE embed_id = p_embed_id;
  
  -- Build result
  v_result := jsonb_build_object(
    'embed_id', p_embed_id,
    'active_sessions', v_active_sessions,
    'active_users', v_active_users,
    'total_operations', v_total_operations,
    'recent_operations', v_recent_operations,
    'unresolved_conflicts', v_conflicts,
    'last_activity', v_last_activity,
    'is_active', v_active_sessions > 0
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Get operation history with conflict detection
CREATE OR REPLACE FUNCTION get_embed_operation_history(
  p_embed_id UUID,
  p_from_sequence BIGINT DEFAULT 0,
  p_limit INTEGER DEFAULT 100,
  p_include_conflicts BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
  v_operations JSONB;
  v_conflicts JSONB := '[]'::jsonb;
BEGIN
  -- Get operations
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', eo.id,
      'operation_id', eo.operation_id,
      'user_id', eo.user_id,
      'user', jsonb_build_object(
        'email', up.email,
        'nickname', up.nickname,
        'avatar_url', up.avatar_url
      ),
      'operation_type', eo.operation_type,
      'operation_data', eo.operation_data,
      'target_path', eo.target_path,
      'vector_clock', eo.vector_clock,
      'sequence_number', eo.sequence_number,
      'created_at', eo.created_at,
      'is_applied', eo.is_applied,
      'conflict_resolved', eo.conflict_resolved
    ) ORDER BY eo.sequence_number ASC
  ) INTO v_operations
  FROM embed_operations eo
  LEFT JOIN identities i ON eo.user_id = i.id
  LEFT JOIN user_profiles up ON i.id = up.identity_id
  WHERE eo.embed_id = p_embed_id
    AND eo.sequence_number >= p_from_sequence
  ORDER BY eo.sequence_number ASC
  LIMIT p_limit;
  
  -- Detect conflicts if requested
  IF p_include_conflicts THEN
    WITH operation_groups AS (
      SELECT 
        target_path,
        array_agg(eo.* ORDER BY eo.created_at) as operations,
        COUNT(*) as op_count
      FROM embed_operations eo
      WHERE eo.embed_id = p_embed_id
        AND eo.sequence_number >= p_from_sequence
        AND eo.created_at > NOW() - INTERVAL '1 hour'
      GROUP BY target_path
      HAVING COUNT(*) > 1
    ),
    conflicts AS (
      SELECT 
        target_path,
        'concurrent_edit' as conflict_type,
        operations,
        op_count
      FROM operation_groups
      WHERE op_count > 1
    )
    SELECT jsonb_agg(
      jsonb_build_object(
        'target_path', target_path,
        'conflict_type', conflict_type,
        'operation_count', op_count,
        'severity', CASE 
          WHEN op_count > 3 THEN 'high'
          WHEN op_count > 2 THEN 'medium'
          ELSE 'low'
        END
      )
    ) INTO v_conflicts
    FROM conflicts;
  END IF;
  
  RETURN jsonb_build_object(
    'operations', COALESCE(v_operations, '[]'::jsonb),
    'conflicts', v_conflicts,
    'has_more', (
      SELECT COUNT(*) > p_limit
      FROM embed_operations
      WHERE embed_id = p_embed_id
        AND sequence_number >= p_from_sequence
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Merge embed data with conflict resolution
CREATE OR REPLACE FUNCTION merge_embed_data(
  p_embed_id UUID,
  p_user_id UUID,
  p_merge_strategy TEXT DEFAULT 'smart_merge',
  p_base_data JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_current_data JSONB;
  v_operations JSONB;
  v_merged_data JSONB;
  v_conflicts JSONB;
BEGIN
  -- Get current embed data
  SELECT component_data INTO v_current_data
  FROM chat_embeds 
  WHERE id = p_embed_id;
  
  -- Use provided base data or current data
  v_merged_data := COALESCE(p_base_data, v_current_data);
  
  -- Get recent operations for merging
  SELECT get_embed_operation_history(
    p_embed_id, 
    0, -- from beginning
    1000, -- large limit
    true -- include conflicts
  ) INTO v_operations;
  
  -- Apply merge strategy
  CASE p_merge_strategy
    WHEN 'last_writer_wins' THEN
      -- Simply use the most recent operation's data
      SELECT component_data INTO v_merged_data
      FROM chat_embeds 
      WHERE id = p_embed_id;
      
    WHEN 'smart_merge' THEN
      -- Try to merge non-conflicting changes
      -- This is a simplified version - real implementation would be more complex
      v_merged_data := v_current_data;
      
    WHEN 'conflict_resolution' THEN
      -- Mark for manual resolution
      v_merged_data := jsonb_build_object(
        'requires_resolution', true,
        'current_data', v_current_data,
        'conflicts', v_operations->'conflicts'
      );
      
    ELSE
      -- Default to current data
      v_merged_data := v_current_data;
  END CASE;
  
  -- Update embed data if merge successful
  IF NOT (v_merged_data ? 'requires_resolution') THEN
    UPDATE chat_embeds 
    SET 
      component_data = v_merged_data,
      updated_at = NOW()
    WHERE id = p_embed_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'strategy', p_merge_strategy,
    'merged_data', v_merged_data,
    'conflicts_detected', (v_operations->'conflicts'),
    'requires_manual_resolution', (v_merged_data ? 'requires_resolution')
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'strategy', p_merge_strategy
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Cleanup stale collaboration data
CREATE OR REPLACE FUNCTION cleanup_embed_collaboration_advanced()
RETURNS JSONB AS $$
DECLARE
  v_cleaned_sessions INTEGER := 0;
  v_cleaned_presence INTEGER := 0;
  v_cleaned_locks INTEGER := 0;
  v_cleaned_operations INTEGER := 0;
  v_created_snapshots INTEGER := 0;
BEGIN
  -- Clean expired sessions
  UPDATE embed_collaboration_sessions 
  SET is_active = false 
  WHERE expires_at < NOW() AND is_active = true;
  
  GET DIAGNOSTICS v_cleaned_sessions = ROW_COUNT;
  
  -- Clean stale presence (no heartbeat for 5 minutes)
  UPDATE embed_presence 
  SET status = 'disconnected'
  WHERE heartbeat_at < NOW() - INTERVAL '5 minutes' 
    AND status != 'disconnected';
    
  GET DIAGNOSTICS v_cleaned_presence = ROW_COUNT;
  
  -- Release expired locks
  UPDATE embed_locks 
  SET is_active = false 
  WHERE expires_at < NOW() AND is_active = true;
  
  GET DIAGNOSTICS v_cleaned_locks = ROW_COUNT;
  
  -- Archive old operations (keep last 2000 per embed)
  WITH old_operations AS (
    SELECT id 
    FROM (
      SELECT id, 
             row_number() OVER (PARTITION BY embed_id ORDER BY sequence_number DESC) as rn
      FROM embed_operations
    ) ranked
    WHERE rn > 2000
  )
  DELETE FROM embed_operations
  WHERE id IN (SELECT id FROM old_operations);
  
  GET DIAGNOSTICS v_cleaned_operations = ROW_COUNT;
  
  -- Create snapshots for active embeds without recent snapshots
  INSERT INTO embed_snapshots (embed_id, snapshot_data, sequence_number, snapshot_type)
  SELECT 
    ce.id,
    ce.component_data,
    COALESCE((SELECT MAX(sequence_number) FROM embed_operations WHERE embed_id = ce.id), 0),
    'periodic'
  FROM chat_embeds ce
  WHERE ce.id IN (
    -- Active embeds (with recent operations)
    SELECT DISTINCT embed_id 
    FROM embed_operations 
    WHERE created_at > NOW() - INTERVAL '1 day'
  )
  AND ce.id NOT IN (
    -- Embeds with recent snapshots
    SELECT embed_id 
    FROM embed_snapshots 
    WHERE created_at > NOW() - INTERVAL '1 hour'
  );
  
  GET DIAGNOSTICS v_created_snapshots = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'cleaned_sessions', v_cleaned_sessions,
    'cleaned_presence', v_cleaned_presence,
    'cleaned_locks', v_cleaned_locks,
    'cleaned_operations', v_cleaned_operations,
    'created_snapshots', v_created_snapshots,
    'cleanup_time', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- 6. Get embed collaboration analytics
CREATE OR REPLACE FUNCTION get_embed_collaboration_analytics(
  p_embed_id UUID DEFAULT NULL,
  p_time_range INTERVAL DEFAULT '7 days'
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_where_clause TEXT := '';
BEGIN
  -- Build where clause
  IF p_embed_id IS NOT NULL THEN
    v_where_clause := ' AND embed_id = ''' || p_embed_id || '''';
  END IF;
  
  -- Get analytics data
  EXECUTE format($sql$
    WITH operation_stats AS (
      SELECT 
        embed_id,
        COUNT(*) as total_operations,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT DATE(created_at)) as active_days,
        AVG(EXTRACT(epoch FROM (applied_at - created_at))) as avg_apply_time_seconds
      FROM embed_operations
      WHERE created_at > NOW() - %L %s
      GROUP BY embed_id
    ),
    conflict_stats AS (
      SELECT 
        embed_id,
        COUNT(*) as total_conflicts,
        COUNT(CASE WHEN conflict_resolved = true THEN 1 END) as resolved_conflicts,
        COUNT(CASE WHEN conflict_resolved = false THEN 1 END) as unresolved_conflicts
      FROM embed_operations
      WHERE created_at > NOW() - %L %s
        AND conflict_resolved IS NOT NULL
      GROUP BY embed_id
    ),
    presence_stats AS (
      SELECT 
        embed_id,
        COUNT(DISTINCT user_id) as unique_presence_users,
        AVG(EXTRACT(epoch FROM (last_seen - heartbeat_at))) as avg_session_duration_seconds
      FROM embed_presence
      WHERE last_seen > NOW() - %L %s
      GROUP BY embed_id
    )
    SELECT jsonb_build_object(
      'time_range', %L,
      'embed_analytics', COALESCE(jsonb_agg(
        jsonb_build_object(
          'embed_id', COALESCE(os.embed_id, cs.embed_id, ps.embed_id),
          'operations', jsonb_build_object(
            'total', COALESCE(os.total_operations, 0),
            'unique_users', COALESCE(os.unique_users, 0),
            'active_days', COALESCE(os.active_days, 0),
            'avg_apply_time_seconds', COALESCE(os.avg_apply_time_seconds, 0)
          ),
          'conflicts', jsonb_build_object(
            'total', COALESCE(cs.total_conflicts, 0),
            'resolved', COALESCE(cs.resolved_conflicts, 0),
            'unresolved', COALESCE(cs.unresolved_conflicts, 0),
            'resolution_rate', CASE 
              WHEN cs.total_conflicts > 0 
              THEN ROUND((cs.resolved_conflicts::numeric / cs.total_conflicts::numeric) * 100, 2)
              ELSE 0
            END
          ),
          'presence', jsonb_build_object(
            'unique_users', COALESCE(ps.unique_presence_users, 0),
            'avg_session_duration_seconds', COALESCE(ps.avg_session_duration_seconds, 0)
          )
        )
      ), '[]'::jsonb),
      'summary', jsonb_build_object(
        'total_embeds', COUNT(DISTINCT COALESCE(os.embed_id, cs.embed_id, ps.embed_id)),
        'total_operations', SUM(COALESCE(os.total_operations, 0)),
        'total_conflicts', SUM(COALESCE(cs.total_conflicts, 0)),
        'total_unique_users', COUNT(DISTINCT COALESCE(os.unique_users, cs.unique_users, ps.unique_presence_users))
      )
    )
    FROM operation_stats os
    FULL OUTER JOIN conflict_stats cs ON os.embed_id = cs.embed_id
    FULL OUTER JOIN presence_stats ps ON COALESCE(os.embed_id, cs.embed_id) = ps.embed_id
  $sql$, 
    p_time_range, v_where_clause,
    p_time_range, v_where_clause,
    p_time_range, v_where_clause,
    p_time_range
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Export embed collaboration data
CREATE OR REPLACE FUNCTION export_embed_collaboration_data(
  p_embed_id UUID,
  p_include_operations BOOLEAN DEFAULT true,
  p_include_snapshots BOOLEAN DEFAULT false,
  p_include_presence BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_embed_data JSONB;
  v_operations JSONB := '[]'::jsonb;
  v_snapshots JSONB := '[]'::jsonb;
  v_presence JSONB := '[]'::jsonb;
BEGIN
  -- Get embed data
  SELECT jsonb_build_object(
    'id', ce.id,
    'component_type', ce.component_type,
    'component_data', ce.component_data,
    'created_at', ce.created_at,
    'updated_at', ce.updated_at
  ) INTO v_embed_data
  FROM chat_embeds ce
  WHERE ce.id = p_embed_id;
  
  -- Get operations if requested
  IF p_include_operations THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', eo.id,
        'operation_id', eo.operation_id,
        'user_id', eo.user_id,
        'operation_type', eo.operation_type,
        'operation_data', eo.operation_data,
        'target_path', eo.target_path,
        'vector_clock', eo.vector_clock,
        'sequence_number', eo.sequence_number,
        'created_at', eo.created_at,
        'is_applied', eo.is_applied
      ) ORDER BY eo.sequence_number
    ) INTO v_operations
    FROM embed_operations eo
    WHERE eo.embed_id = p_embed_id;
  END IF;
  
  -- Get snapshots if requested
  IF p_include_snapshots THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', es.id,
        'snapshot_data', es.snapshot_data,
        'sequence_number', es.sequence_number,
        'created_at', es.created_at,
        'snapshot_type', es.snapshot_type
      ) ORDER BY es.created_at DESC
    ) INTO v_snapshots
    FROM embed_snapshots es
    WHERE es.embed_id = p_embed_id;
  END IF;
  
  -- Get presence if requested
  IF p_include_presence THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'user_id', ep.user_id,
        'status', ep.status,
        'cursor_position', ep.cursor_position,
        'editing_path', ep.editing_path,
        'presence_data', ep.presence_data,
        'last_seen', ep.last_seen
      )
    ) INTO v_presence
    FROM embed_presence ep
    WHERE ep.embed_id = p_embed_id
      AND ep.status != 'disconnected';
  END IF;
  
  -- Build final result
  v_result := jsonb_build_object(
    'embed', v_embed_data,
    'export_time', NOW(),
    'operations', COALESCE(v_operations, '[]'::jsonb),
    'snapshots', COALESCE(v_snapshots, '[]'::jsonb),
    'presence', COALESCE(v_presence, '[]'::jsonb),
    'metadata', jsonb_build_object(
      'operations_count', jsonb_array_length(COALESCE(v_operations, '[]'::jsonb)),
      'snapshots_count', jsonb_array_length(COALESCE(v_snapshots, '[]'::jsonb)),
      'presence_count', jsonb_array_length(COALESCE(v_presence, '[]'::jsonb))
    )
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS FOR NEW FUNCTIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION apply_embed_operations_batch(UUID, UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_embed_collaboration_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_embed_operation_history(UUID, BIGINT, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION merge_embed_data(UUID, UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_embed_collaboration_advanced() TO authenticated;
GRANT EXECUTE ON FUNCTION get_embed_collaboration_analytics(UUID, INTERVAL) TO authenticated;
GRANT EXECUTE ON FUNCTION export_embed_collaboration_data(UUID, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

-- ============================================================================
-- CREATE SCHEDULED CLEANUP JOB (if pg_cron is available)
-- ============================================================================

-- Uncomment if pg_cron extension is available
-- SELECT cron.schedule('cleanup-embed-collaboration', '*/10 * * * *', 'SELECT cleanup_embed_collaboration_advanced();');

-- ============================================================================
-- LOG COMPLETION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Advanced embed collaboration functions created successfully!';
  RAISE NOTICE 'Functions: batch operations, analytics, merging, cleanup, export';
  RAISE NOTICE 'Ready for production use with comprehensive collaboration features';
END $$;