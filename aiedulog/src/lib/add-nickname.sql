-- profiles 테이블에 nickname 컬럼 추가
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS nickname TEXT;

-- 기본값으로 이메일의 @ 앞부분을 닉네임으로 설정
UPDATE profiles 
SET nickname = SPLIT_PART(email, '@', 1)
WHERE nickname IS NULL;

-- 닉네임 중복 방지를 위한 유니크 제약 추가 (선택사항)
-- ALTER TABLE profiles ADD CONSTRAINT unique_nickname UNIQUE (nickname);

-- 확인용 쿼리
SELECT id, email, nickname, role, avatar_url
FROM profiles
LIMIT 10;