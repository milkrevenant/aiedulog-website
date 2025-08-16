-- posts 테이블에 image_urls 컬럼 추가
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- profiles 테이블에 avatar_url 컬럼 추가 (프로필 이미지용)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 확인용 쿼리
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'posts' 
AND column_name = 'image_urls';