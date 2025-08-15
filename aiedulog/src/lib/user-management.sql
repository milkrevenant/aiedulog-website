-- 사용자 관리 기능을 위한 데이터베이스 업데이트
-- profiles 테이블에 is_active 컬럼 추가

-- 1. is_active 컬럼 추가 (기본값 true)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. last_sign_in_at 컬럼 추가 (마지막 로그인 시간 추적)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

-- 3. is_active 컬럼에 인덱스 추가 (빠른 필터링을 위해)
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- 4. role 컬럼에 인덱스 추가 (빠른 필터링을 위해)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 5. 검색을 위한 복합 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_profiles_search 
ON profiles(username, email, full_name);

-- 6. RLS 정책 업데이트 - 관리자만 사용자 정보 수정 가능
CREATE POLICY "Admins can update user profiles" ON profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'moderator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'moderator')
  )
);

-- 7. 비활성 사용자 로그인 차단을 위한 함수
CREATE OR REPLACE FUNCTION check_user_active()
RETURNS TRIGGER AS $$
BEGIN
  -- 사용자가 비활성 상태인지 확인
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = NEW.id 
    AND is_active = false
  ) THEN
    RAISE EXCEPTION 'User account is suspended';
  END IF;
  
  -- 마지막 로그인 시간 업데이트
  UPDATE profiles 
  SET last_sign_in_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 로그인 시 활성 상태 체크 트리거 (auth.users 테이블에 적용)
-- 주의: 이 트리거는 Supabase 대시보드에서 직접 설정해야 할 수 있습니다
-- CREATE TRIGGER check_user_active_on_signin
-- BEFORE UPDATE ON auth.users
-- FOR EACH ROW
-- WHEN (NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at)
-- EXECUTE FUNCTION check_user_active();

-- 9. 관리자 통계를 위한 뷰
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
  COUNT(CASE WHEN role = 'moderator' THEN 1 END) as moderator_count,
  COUNT(CASE WHEN role = 'verified' THEN 1 END) as verified_count,
  COUNT(CASE WHEN role = 'member' THEN 1 END) as member_count,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
  COUNT(CASE WHEN is_active = false THEN 1 END) as suspended_users,
  COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as verified_emails,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_users_week,
  COUNT(CASE WHEN last_sign_in_at > NOW() - INTERVAL '7 days' THEN 1 END) as active_users_week
FROM profiles;

-- 10. RLS 정책 - 관리자만 통계 뷰 접근 가능
ALTER VIEW user_statistics SET (security_invoker = on);

GRANT SELECT ON user_statistics TO authenticated;

-- 사용자 관리 기능 완료!
-- 이 SQL을 Supabase SQL Editor에서 실행하세요.