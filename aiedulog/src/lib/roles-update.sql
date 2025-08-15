-- 회원 유형별 권한 시스템 추가
-- AIedulog 커뮤니티 플랫폼

-- 1. profiles 테이블에 role 컬럼 추가 (이미 있으면 수정)
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS role;

ALTER TABLE public.profiles 
ADD COLUMN role TEXT DEFAULT 'member' 
CHECK (role IN ('admin', 'moderator', 'verified', 'member'));

-- 2. 권한 관리 테이블 생성
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  granted_by UUID REFERENCES public.profiles(id),
  UNIQUE(user_id, permission)
);

-- 3. 역할별 권한 정의
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'verified', 'member')),
  permission TEXT NOT NULL,
  description TEXT,
  UNIQUE(role, permission)
);

-- 4. 기본 권한 삽입
INSERT INTO public.role_permissions (role, permission, description) VALUES
-- Admin 권한 (모든 권한)
('admin', 'manage_users', '사용자 관리'),
('admin', 'manage_content', '모든 콘텐츠 관리'),
('admin', 'manage_columns', '칼럼 작성자 인증'),
('admin', 'manage_settings', '시스템 설정 관리'),
('admin', 'view_analytics', '통계 조회'),
('admin', 'delete_any_post', '모든 게시글 삭제'),
('admin', 'delete_any_comment', '모든 댓글 삭제'),
('admin', 'pin_posts', '게시글 고정'),
('admin', 'send_announcements', '공지사항 발송'),

-- Moderator 권한
('moderator', 'manage_content', '콘텐츠 관리'),
('moderator', 'delete_any_post', '게시글 삭제'),
('moderator', 'delete_any_comment', '댓글 삭제'),
('moderator', 'pin_posts', '게시글 고정'),
('moderator', 'manage_reports', '신고 관리'),

-- Verified 권한 (인증된 교사)
('verified', 'write_columns', '칼럼 작성'),
('verified', 'create_lectures', '강의 등록'),
('verified', 'upload_resources', '자료 업로드'),
('verified', 'create_job_posts', '구인구직 게시'),
('verified', 'increased_upload_limit', '업로드 용량 증가'),

-- Member 권한 (기본 회원)
('member', 'create_posts', '게시글 작성'),
('member', 'create_comments', '댓글 작성'),
('member', 'like_posts', '좋아요'),
('member', 'bookmark_posts', '북마크'),
('member', 'view_content', '콘텐츠 조회'),
('member', 'edit_own_content', '자신의 콘텐츠 수정'),
('member', 'delete_own_content', '자신의 콘텐츠 삭제')
ON CONFLICT (role, permission) DO NOTHING;

-- 5. 권한 확인 함수
CREATE OR REPLACE FUNCTION public.has_permission(user_id UUID, required_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- 사용자의 role 가져오기
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  
  -- role이 없으면 false
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- admin은 모든 권한 허용
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- role_permissions 테이블에서 권한 확인
  RETURN EXISTS (
    SELECT 1 FROM public.role_permissions 
    WHERE role = user_role AND permission = required_permission
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 사용자 역할 변경 함수 (admin만 가능)
CREATE OR REPLACE FUNCTION public.change_user_role(
  target_user_id UUID,
  new_role TEXT,
  admin_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- admin 권한 확인
  IF NOT has_permission(admin_user_id, 'manage_users') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can change user roles';
  END IF;
  
  -- 역할 업데이트
  UPDATE public.profiles 
  SET role = new_role,
      updated_at = TIMEZONE('utc', NOW())
  WHERE id = target_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS 정책 업데이트
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- user_permissions 정책
CREATE POLICY "Admins can manage permissions" ON public.user_permissions
  FOR ALL USING (has_permission(auth.uid(), 'manage_users'));

CREATE POLICY "Users can view own permissions" ON public.user_permissions
  FOR SELECT USING (auth.uid() = user_id);

-- role_permissions 정책 (모두 읽기 가능)
CREATE POLICY "Everyone can view role permissions" ON public.role_permissions
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage role permissions" ON public.role_permissions
  FOR ALL USING (has_permission(auth.uid(), 'manage_settings'));

-- 8. 기존 정책 업데이트 예시 (posts 테이블)
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.posts;
CREATE POLICY "Users with permission can create posts" ON public.posts
  FOR INSERT WITH CHECK (has_permission(auth.uid(), 'create_posts'));

DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
CREATE POLICY "Users can delete posts based on permission" ON public.posts
  FOR DELETE USING (
    auth.uid() = author_id OR 
    has_permission(auth.uid(), 'delete_any_post')
  );

-- 9. 칼럼 작성 권한 업데이트
DROP POLICY IF EXISTS "Verified authors can create columns" ON public.columns;
CREATE POLICY "Users with column permission can create" ON public.columns
  FOR INSERT WITH CHECK (has_permission(auth.uid(), 'write_columns'));

-- 10. 초기 admin 계정 설정 (이메일 변경 필요)
-- UPDATE public.profiles 
-- SET role = 'admin' 
-- WHERE email = 'admin@aiedulog.com';

-- 11. 권한 상속 뷰 (어떤 role이 어떤 권한을 가지는지 쉽게 보기)
CREATE OR REPLACE VIEW public.role_permissions_view AS
SELECT 
  role,
  array_agg(permission ORDER BY permission) as permissions,
  count(*) as permission_count
FROM public.role_permissions
GROUP BY role
ORDER BY 
  CASE role
    WHEN 'admin' THEN 1
    WHEN 'moderator' THEN 2
    WHEN 'verified' THEN 3
    WHEN 'member' THEN 4
  END;

-- 12. 사용자별 권한 조회 함수
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id UUID)
RETURNS TABLE(permission TEXT, description TEXT) AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  
  RETURN QUERY
  SELECT rp.permission, rp.description
  FROM public.role_permissions rp
  WHERE rp.role = user_role
  ORDER BY rp.permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;