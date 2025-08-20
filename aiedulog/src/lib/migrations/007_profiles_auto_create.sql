-- ============================================
-- 007: Profiles 자동 생성 트리거
-- ============================================

DO $$
BEGIN
  -- 이미 실행됐는지 확인
  IF is_migration_executed('007_profiles_auto_create') THEN
    RAISE NOTICE 'Migration 007_profiles_auto_create already executed. Skipping.';
    RETURN;
  END IF;

  -- 1. 기존 auth.users에 대해 누락된 profiles 생성
  INSERT INTO profiles (id, email, name, nickname, role, created_at, updated_at, is_active)
  SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
    COALESCE(u.raw_user_meta_data->>'nickname', split_part(u.email, '@', 1)),
    COALESCE(u.raw_user_meta_data->>'role', 'member'),
    u.created_at,
    NOW(),
    true
  FROM auth.users u
  LEFT JOIN profiles p ON u.id = p.id
  WHERE p.id IS NULL;

  -- 2. 기존 profiles에서 누락된 필드 업데이트
  UPDATE profiles
  SET 
    nickname = COALESCE(nickname, split_part(email, '@', 1)),
    role = COALESCE(role, 'member'),
    is_active = COALESCE(is_active, true),
    updated_at = NOW()
  WHERE nickname IS NULL OR role IS NULL OR is_active IS NULL;

  -- 마이그레이션 기록
  PERFORM record_migration('007_profiles_auto_create', 'Auto-create profiles for users and trigger');
  
EXCEPTION WHEN OTHERS THEN
  PERFORM record_migration('007_profiles_auto_create', 'Auto-create profiles for users and trigger', false, SQLERRM);
  RAISE;
END $$;

-- 3. 새 사용자 생성 시 자동으로 profile 생성하는 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- profiles 테이블에 새 레코드 생성
  INSERT INTO public.profiles (
    id, 
    email, 
    name,
    nickname,
    school,
    interests,
    role,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'school',
    CASE 
      WHEN new.raw_user_meta_data->>'interests' IS NOT NULL 
      THEN string_to_array(new.raw_user_meta_data->>'interests', ',')
      ELSE '{}'::text[]
    END,
    COALESCE(new.raw_user_meta_data->>'role', 'member'),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = NOW();
    
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 트리거 생성 (기존 트리거 제거 후 재생성)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- 5. 마이그레이션 완료 확인
DO $$
BEGIN
  -- 누락된 profiles가 있는지 확인
  IF EXISTS (
    SELECT 1 FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE p.id IS NULL
  ) THEN
    RAISE WARNING 'Some users still missing profiles after migration';
  ELSE
    RAISE NOTICE 'All users have profiles created successfully';
  END IF;
END $$;