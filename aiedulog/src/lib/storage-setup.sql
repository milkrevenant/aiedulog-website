-- Storage bucket 생성 및 정책 설정
-- Supabase Dashboard > Storage에서 실행

-- 1. Storage bucket 생성 (Dashboard에서)
-- 버킷명: post-images (게시글 이미지)
-- 버킷명: avatars (프로필 이미지)
-- 버킷명: resources (교육 자료)

-- 2. posts 테이블에 이미지 URL 컬럼 추가
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- 3. profiles 테이블에 아바타 URL 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 4. Storage 정책 (RLS) 설정
-- 이 부분은 Supabase Dashboard > Storage > Policies에서 설정

-- post-images 버킷 정책:
-- 1. Public read: 모든 사용자 읽기 가능
-- 2. Authenticated upload: 로그인한 사용자만 업로드
-- 3. Owner delete: 업로드한 사용자만 삭제

-- avatars 버킷 정책:
-- 1. Public read: 모든 사용자 읽기 가능
-- 2. User upload: 자신의 아바타만 업로드/수정
-- 3. User delete: 자신의 아바타만 삭제

-- resources 버킷 정책:
-- 1. Public read: 모든 사용자 읽기 가능
-- 2. Verified upload: 인증된 교사 이상만 업로드
-- 3. Owner/Admin delete: 업로드한 사용자 또는 관리자만 삭제