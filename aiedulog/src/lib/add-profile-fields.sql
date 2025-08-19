-- profiles 테이블에 school과 interests 필드 추가

-- school 필드 추가 (이미 있을 수 있음)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS school text;

-- interests 필드 추가 (관심 분야 배열)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';

-- 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_profiles_school ON profiles(school);
CREATE INDEX IF NOT EXISTS idx_profiles_interests ON profiles USING GIN(interests);

-- 코멘트 추가
COMMENT ON COLUMN profiles.school IS '사용자 소속 학교 또는 기관';
COMMENT ON COLUMN profiles.interests IS '사용자 관심 분야 목록';