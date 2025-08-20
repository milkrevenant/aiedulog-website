-- ============================================
-- 006: Profiles 테이블 RLS 정책
-- ============================================

DO $$
BEGIN
  -- 이미 실행됐는지 확인
  IF is_migration_executed('006_profiles_rls') THEN
    RAISE NOTICE 'Migration 006_profiles_rls already executed. Skipping.';
    RETURN;
  END IF;

  -- RLS 활성화
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

  -- 마이그레이션 기록
  PERFORM record_migration('006_profiles_rls', 'Profiles table RLS policies');
  
EXCEPTION WHEN OTHERS THEN
  PERFORM record_migration('006_profiles_rls', 'Profiles table RLS policies', false, SQLERRM);
  RAISE;
END $$;

-- RLS 정책은 DO 블록 밖에서 생성 (DROP IF EXISTS로 안전하게)

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

-- 1. 모든 사용자가 프로필을 볼 수 있음 (공개 프로필)
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

-- 2. 인증된 사용자는 자신의 프로필을 수정할 수 있음
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. 인증된 사용자는 자신의 프로필을 생성할 수 있음
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 4. 인증된 사용자는 자신의 프로필을 삭제할 수 있음
CREATE POLICY "Users can delete own profile" 
ON profiles FOR DELETE 
USING (auth.uid() = id);

-- 마이그레이션 완료 확인
DO $$
BEGIN
  UPDATE schema_migrations 
  SET success = true, error_message = NULL 
  WHERE version = '006_profiles_rls';
END $$;