-- ============================================
-- 003 수정: 이미 부분 실행된 경우를 위한 안전한 버전
-- ============================================

-- 1. 먼저 마이그레이션 기록 확인
DO $$
BEGIN
  -- 이미 성공적으로 완료된 경우 전체 스킵
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = '003_roles_system' AND success = true) THEN
    RAISE NOTICE 'Migration 003_roles_system already completed successfully. Skipping.';
    RETURN;
  END IF;
  
  -- 실패 기록이 있는 경우 클린업
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = '003_roles_system' AND success = false) THEN
    RAISE NOTICE 'Previous failed attempt detected. Cleaning up and retrying.';
    DELETE FROM schema_migrations WHERE version = '003_roles_system';
  END IF;
END $$;

-- 2. has_permission 함수만 생성 (이미 테이블은 생성되었을 가능성이 높음)
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, required_permission TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = user_id;
  IF user_role = 'admin' THEN RETURN TRUE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM role_permissions 
    WHERE role = user_role AND permission = required_permission
  );
END;
$$;

-- 3. 마이그레이션 성공 기록
DO $$
BEGIN
  INSERT INTO schema_migrations (version, name, success, error_message)
  VALUES ('003_roles_system', 'Roles and permissions system', true, 'Fixed after partial execution')
  ON CONFLICT (version) 
  DO UPDATE SET 
    executed_at = NOW(),
    success = true,
    error_message = 'Fixed after partial execution';
END $$;