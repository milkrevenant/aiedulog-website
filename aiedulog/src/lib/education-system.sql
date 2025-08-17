-- 교육 자료실 시스템 업데이트
-- 1. posts 테이블에 학교급 및 파일 관련 컬럼 추가

-- 학교급 컬럼 추가 (초등/중등/고등/공통)
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS school_level VARCHAR(10) 
CHECK (school_level IN ('ele', 'mid', 'high', 'common', NULL));

-- 파일 URL 배열 추가 (이미지 외 문서 파일들)
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS file_urls JSONB DEFAULT '[]';

-- 파일 메타데이터 저장 (파일명, 크기, 타입 등)
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS file_metadata JSONB DEFAULT '[]';

-- 인덱스 추가 (학교급별 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_posts_school_level 
ON posts(school_level) 
WHERE category = 'education';

-- 파일 스토리지 버킷 생성 (이미 있으면 스킵)
INSERT INTO storage.buckets (id, name, public)
VALUES ('education-files', 'education-files', true)
ON CONFLICT (id) DO NOTHING;

-- 파일 업로드 정책 (50MB 제한)
CREATE POLICY "Users can upload education files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'education-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 파일 다운로드 정책 (모든 인증된 사용자)
CREATE POLICY "Users can download education files" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'education-files');

-- 파일 삭제 정책 (작성자와 관리자만)
CREATE POLICY "Users can delete own education files" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'education-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 샘플 데이터 업데이트 (기존 교육 자료실 게시글에 학교급 추가)
UPDATE posts 
SET school_level = 'common' 
WHERE category = 'education' 
AND school_level IS NULL;

-- 학교급별 뷰 생성 (선택사항)
CREATE OR REPLACE VIEW education_posts_by_level AS
SELECT 
  p.*,
  CASE school_level
    WHEN 'ele' THEN '초등학교'
    WHEN 'mid' THEN '중학교'
    WHEN 'high' THEN '고등학교'
    WHEN 'common' THEN '공통'
    ELSE '미분류'
  END as school_level_name
FROM posts p
WHERE p.category = 'education'
AND p.is_published = true
ORDER BY p.created_at DESC;

COMMENT ON COLUMN posts.school_level IS '학교급: ele(초등), mid(중등), high(고등), common(공통)';
COMMENT ON COLUMN posts.file_urls IS '첨부 파일 URL 배열 (문서, PDF 등)';
COMMENT ON COLUMN posts.file_metadata IS '파일 메타데이터 (이름, 크기, 타입 등)';