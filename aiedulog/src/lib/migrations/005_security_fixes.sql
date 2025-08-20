-- ============================================
-- 005: 보안 수정
-- ============================================

-- 먼저 DO 블록으로 마이그레이션 체크
DO $$
BEGIN
  -- 이미 실행됐는지 확인
  IF is_migration_executed('005_security_fixes') THEN
    RAISE NOTICE 'Migration 005_security_fixes already executed. Skipping.';
    RETURN;
  END IF;

  -- 마이그레이션 기록
  PERFORM record_migration('005_security_fixes', 'Security definer views and function search paths');
  
EXCEPTION WHEN OTHERS THEN
  PERFORM record_migration('005_security_fixes', 'Security definer views and function search paths', false, SQLERRM);
  RAISE;
END $$;

-- 뷰는 DO 블록 밖에서 생성
-- SECURITY DEFINER 뷰 수정
DROP VIEW IF EXISTS public.education_posts_by_level CASCADE;
CREATE VIEW public.education_posts_by_level AS
SELECT 
  p.*,
  pr.email as author_email,
  pr.nickname as author_nickname,
  pr.avatar_url as author_avatar
FROM posts p
LEFT JOIN profiles pr ON p.author_id = pr.id
WHERE p.category = 'education';

DROP VIEW IF EXISTS public.posts_with_stats CASCADE;
CREATE VIEW public.posts_with_stats AS
SELECT 
  p.*,
  COALESCE(l.like_count, 0) as like_count,
  COALESCE(c.comment_count, 0) as comment_count,
  pr.email as author_email,
  pr.nickname as author_nickname,
  pr.avatar_url as author_avatar
FROM posts p
LEFT JOIN profiles pr ON p.author_id = pr.id
LEFT JOIN (
  SELECT post_id, COUNT(*) as like_count
  FROM post_likes
  GROUP BY post_id
) l ON p.id = l.post_id
LEFT JOIN (
  SELECT post_id, COUNT(*) as comment_count
  FROM comments
  GROUP BY post_id
) c ON p.id = c.post_id;

-- Function search paths 설정
-- update_lecture_participants 함수가 있는 경우 search_path 설정
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_lecture_participants') THEN
    ALTER FUNCTION update_lecture_participants() SET search_path = public, pg_catalog;
  END IF;
END $$;

-- has_permission 함수가 있는 경우 search_path 설정
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_permission') THEN
    EXECUTE 'ALTER FUNCTION has_permission(uuid, text) SET search_path = public, pg_catalog';
  END IF;
END $$;