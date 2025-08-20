-- ============================================
-- 003: 권한 시스템
-- ============================================

-- 먼저 DO 블록으로 테이블과 데이터 처리
DO $$
BEGIN
  -- 이미 실행됐는지 확인
  IF is_migration_executed('003_roles_system') THEN
    RAISE NOTICE 'Migration 003_roles_system already executed. Skipping.';
    RETURN;
  END IF;

  -- role 컬럼 추가 (기존 컬럼이 있는 경우 제약 조건만 추가)
  DO $role_column$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'role') THEN
      ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'member';
    END IF;
    
    -- CHECK 제약 조건 추가 (이미 있으면 무시)
    BEGIN
      ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
      CHECK (role IN ('admin', 'moderator', 'verified', 'member'));
    EXCEPTION WHEN duplicate_object THEN
      -- 제약 조건이 이미 존재하면 무시
      NULL;
    END;
  END $role_column$;

  -- role_permissions 테이블
  CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'verified', 'member')),
    permission TEXT NOT NULL,
    description TEXT,
    UNIQUE(role, permission)
  );

  -- 기본 권한 삽입
  INSERT INTO role_permissions (role, permission, description) VALUES
  ('admin', 'manage_users', '사용자 관리'),
  ('admin', 'manage_content', '모든 콘텐츠 관리'),
  ('moderator', 'manage_content', '콘텐츠 관리'),
  ('verified', 'write_columns', '칼럼 작성'),
  ('member', 'create_posts', '게시글 작성')
  ON CONFLICT (role, permission) DO NOTHING;

  -- 기존 사용자의 role 값 검증 및 정리
  UPDATE profiles SET role = 'member' 
  WHERE role IS NULL OR role NOT IN ('admin', 'moderator', 'verified', 'member');

  -- 마이그레이션 기록
  PERFORM record_migration('003_roles_system', 'Roles and permissions system');
  
EXCEPTION WHEN OTHERS THEN
  PERFORM record_migration('003_roles_system', 'Roles and permissions system', false, SQLERRM);
  RAISE;
END $$;

-- has_permission 함수는 DO 블록 밖에서 생성
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