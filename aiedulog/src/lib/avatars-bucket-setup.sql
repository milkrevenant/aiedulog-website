-- Avatars Storage 버킷 설정
-- Supabase Dashboard > Storage에서 실행

-- 1. Storage 버킷 생성 (Dashboard에서)
-- 버킷명: avatars
-- Public 버킷으로 설정

-- 2. Storage 정책 (RLS) 설정
-- 이 부분은 Supabase Dashboard > Storage > Policies에서 설정

-- avatars 버킷 정책:
-- 1. Public read: 모든 사용자 읽기 가능
--    - SELECT 권한: true

-- 2. User upload: 자신의 아바타만 업로드/수정
--    - INSERT 권한: 
--    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]

-- 3. User delete: 자신의 아바타만 삭제
--    - DELETE 권한:
--    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]

-- 4. profiles 테이블에 avatar_url 컬럼 확인 (이미 있으면 skip)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 5. 확인용 쿼리
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'avatar_url';