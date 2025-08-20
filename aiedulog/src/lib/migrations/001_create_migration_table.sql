-- ============================================
-- 마이그레이션 추적 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  execution_time_ms INTEGER
);

-- 실행 기록 확인 함수
CREATE OR REPLACE FUNCTION is_migration_executed(migration_version VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM schema_migrations 
    WHERE version = migration_version 
    AND success = true
  );
END;
$$ LANGUAGE plpgsql;

-- 마이그레이션 기록 함수
CREATE OR REPLACE FUNCTION record_migration(
  migration_version VARCHAR,
  migration_name VARCHAR,
  is_success BOOLEAN DEFAULT true,
  error_msg TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO schema_migrations (version, name, success, error_message)
  VALUES (migration_version, migration_name, is_success, error_msg)
  ON CONFLICT (version) 
  DO UPDATE SET 
    executed_at = NOW(),
    success = EXCLUDED.success,
    error_message = EXCLUDED.error_message;
END;
$$ LANGUAGE plpgsql;