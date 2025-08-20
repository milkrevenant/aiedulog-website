-- ============================================
-- 002: 기본 테이블 생성
-- ============================================

DO $$
BEGIN
  -- 이미 실행됐는지 확인
  IF is_migration_executed('002_base_tables') THEN
    RAISE NOTICE 'Migration 002_base_tables already executed. Skipping.';
    RETURN;
  END IF;

  -- profiles 테이블 확장
  ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS nickname TEXT,
  ADD COLUMN IF NOT EXISTS school TEXT,
  ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

  -- nickname 기본값 설정 (기존 값이 없는 경우에만)
  UPDATE profiles 
  SET nickname = SPLIT_PART(email, '@', 1)
  WHERE nickname IS NULL OR nickname = '';

  -- 인덱스 생성 (기존 인덱스와 충돌 방지)
  CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON profiles(nickname);
  CREATE INDEX IF NOT EXISTS idx_profiles_school ON profiles(school);
  CREATE INDEX IF NOT EXISTS idx_profiles_interests ON profiles USING GIN(interests);
  
  -- 기존 데이터 검증 및 정리
  UPDATE profiles SET interests = '{}' WHERE interests IS NULL;
  UPDATE profiles SET is_active = true WHERE is_active IS NULL;

  -- 마이그레이션 기록
  PERFORM record_migration('002_base_tables', 'Base tables and profile extensions');
  
EXCEPTION WHEN OTHERS THEN
  -- 에러 기록
  PERFORM record_migration('002_base_tables', 'Base tables and profile extensions', false, SQLERRM);
  RAISE;
END $$;