-- ============================================
-- Supabase Security Issues Fix
-- Date: 2025-08-20
-- Description: Supabase Security Lints에서 발견된 보안 이슈 수정
-- ============================================

-- ============================================
-- PART 1: SECURITY DEFINER Views 수정 (ERROR 레벨)
-- ============================================

-- 1. education_posts_by_level 뷰 재생성
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
-- SECURITY DEFINER 제거 (기본값은 SECURITY INVOKER)

-- 2. role_permissions_view 뷰 재생성
DROP VIEW IF EXISTS public.role_permissions_view CASCADE;

CREATE VIEW public.role_permissions_view AS
SELECT 
  r.name as role_name,
  p.name as permission_name,
  p.description
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id;
-- SECURITY DEFINER 제거

-- 3. posts_with_stats 뷰 재생성
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
-- SECURITY DEFINER 제거

-- ============================================
-- PART 2: Function Search Path 설정 (WARN 레벨)
-- ============================================

-- 1. update_lecture_participants 함수
ALTER FUNCTION public.update_lecture_participants()
SET search_path = public, pg_catalog;

-- 2. generate_lecture_slug 함수 (존재하는 경우)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'generate_lecture_slug' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    ALTER FUNCTION public.generate_lecture_slug()
    SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 3. notify_post_like 함수
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'notify_post_like' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    ALTER FUNCTION public.notify_post_like()
    SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 4. notify_post_comment 함수
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'notify_post_comment' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    ALTER FUNCTION public.notify_post_comment()
    SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 5. send_welcome_notification 함수
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'send_welcome_notification' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    ALTER FUNCTION public.send_welcome_notification()
    SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 6. handle_updated_at 함수
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_updated_at' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    ALTER FUNCTION public.handle_updated_at()
    SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 7. increment_view_count 함수
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'increment_view_count' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    ALTER FUNCTION public.increment_view_count()
    SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 8. update_like_counts 함수
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_like_counts' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    ALTER FUNCTION public.update_like_counts()
    SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 9. has_permission 함수
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'has_permission' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    ALTER FUNCTION public.has_permission(text)
    SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 10. change_user_role 함수
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'change_user_role' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    ALTER FUNCTION public.change_user_role(uuid, text)
    SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 11. get_user_permissions 함수
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_user_permissions' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    ALTER FUNCTION public.get_user_permissions(uuid)
    SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 12. update_updated_at 함수
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_updated_at' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    ALTER FUNCTION public.update_updated_at()
    SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 13. increment_post_view 함수
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'increment_post_view' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    ALTER FUNCTION public.increment_post_view(uuid)
    SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 14. update_updated_at_column 함수 (lectures 테이블용)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_updated_at_column' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    ALTER FUNCTION public.update_updated_at_column()
    SET search_path = public, pg_catalog;
  END IF;
END $$;

-- ============================================
-- PART 3: 추가 보안 강화 (선택사항)
-- ============================================

-- RLS 정책 재확인 (뷰가 재생성되었으므로 관련 테이블의 RLS 확인)
-- posts 테이블 RLS 확인
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'posts' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- profiles 테이블 RLS 확인
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'profiles' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================
-- 실행 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '보안 이슈 수정 완료:';
  RAISE NOTICE '1. SECURITY DEFINER 뷰 3개 수정됨';
  RAISE NOTICE '2. Function search_path 설정 완료';
  RAISE NOTICE '3. RLS 정책 확인 완료';
  RAISE NOTICE '';
  RAISE NOTICE '다음 단계:';
  RAISE NOTICE '1. Supabase Dashboard에서 Security Advisor 재실행';
  RAISE NOTICE '2. Authentication → Settings에서 MFA 설정';
  RAISE NOTICE '3. Leaked Password Protection 활성화';
END $$;