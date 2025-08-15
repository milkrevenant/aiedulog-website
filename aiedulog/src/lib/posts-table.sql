-- AIedulog 게시판 시스템
-- posts, comments, likes 테이블 생성

-- 1. 게시글 테이블
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'education', 'tech', 'job', 'column')),
  tags TEXT[],
  images TEXT[],
  view_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. 댓글 테이블
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. 좋아요 테이블
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(post_id, user_id)
);

-- 4. 북마크 테이블
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(post_id, user_id)
);

-- 5. 조회 기록 테이블
CREATE TABLE IF NOT EXISTS public.post_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(post_id, user_id)
);

-- 6. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_is_pinned ON public.posts(is_pinned DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON public.comments(author_id);
CREATE INDEX IF NOT EXISTS idx_likes_post ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON public.bookmarks(user_id);

-- 7. RLS (Row Level Security) 정책
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

-- Posts 정책
CREATE POLICY "모든 사용자가 게시글 조회 가능" ON public.posts
  FOR SELECT USING (is_published = true);

CREATE POLICY "권한 있는 사용자만 게시글 작성" ON public.posts
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    has_permission(auth.uid(), 'create_posts')
  );

CREATE POLICY "작성자와 관리자만 게시글 수정" ON public.posts
  FOR UPDATE USING (
    auth.uid() = author_id OR 
    has_permission(auth.uid(), 'manage_content')
  );

CREATE POLICY "작성자와 관리자만 게시글 삭제" ON public.posts
  FOR DELETE USING (
    auth.uid() = author_id OR 
    has_permission(auth.uid(), 'delete_any_post')
  );

-- Comments 정책
CREATE POLICY "모든 사용자가 댓글 조회 가능" ON public.comments
  FOR SELECT USING (true);

CREATE POLICY "로그인 사용자만 댓글 작성" ON public.comments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    has_permission(auth.uid(), 'create_comments')
  );

CREATE POLICY "작성자와 관리자만 댓글 수정" ON public.comments
  FOR UPDATE USING (
    auth.uid() = author_id OR 
    has_permission(auth.uid(), 'delete_any_comment')
  );

CREATE POLICY "작성자와 관리자만 댓글 삭제" ON public.comments
  FOR DELETE USING (
    auth.uid() = author_id OR 
    has_permission(auth.uid(), 'delete_any_comment')
  );

-- Likes 정책
CREATE POLICY "모든 사용자가 좋아요 조회 가능" ON public.post_likes
  FOR SELECT USING (true);

CREATE POLICY "로그인 사용자만 좋아요 가능" ON public.post_likes
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    auth.uid() = user_id
  );

CREATE POLICY "본인만 좋아요 취소 가능" ON public.post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Bookmarks 정책
CREATE POLICY "본인의 북마크만 조회 가능" ON public.bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "로그인 사용자만 북마크 가능" ON public.bookmarks
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    auth.uid() = user_id
  );

CREATE POLICY "본인만 북마크 삭제 가능" ON public.bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- Post Views 정책
CREATE POLICY "조회 기록 생성 가능" ON public.post_views
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "조회 기록 조회 가능" ON public.post_views
  FOR SELECT USING (true);

-- 8. 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 9. 조회수 증가 함수
CREATE OR REPLACE FUNCTION public.increment_post_view(post_id UUID, viewer_id UUID)
RETURNS VOID AS $$
BEGIN
  -- 조회 기록 추가 (중복 무시)
  INSERT INTO public.post_views (post_id, user_id)
  VALUES (post_id, viewer_id)
  ON CONFLICT (post_id, user_id) DO NOTHING;
  
  -- 조회수 증가
  UPDATE public.posts 
  SET view_count = view_count + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 게시글 통계 뷰
CREATE OR REPLACE VIEW public.posts_with_stats AS
SELECT 
  p.*,
  profiles.email as author_email,
  profiles.role as author_role,
  COALESCE(likes.count, 0) as like_count,
  COALESCE(comments.count, 0) as comment_count,
  EXISTS(
    SELECT 1 FROM public.post_likes 
    WHERE post_id = p.id AND user_id = auth.uid()
  ) as is_liked,
  EXISTS(
    SELECT 1 FROM public.bookmarks 
    WHERE post_id = p.id AND user_id = auth.uid()
  ) as is_bookmarked
FROM public.posts p
LEFT JOIN public.profiles ON p.author_id = profiles.id
LEFT JOIN (
  SELECT post_id, COUNT(*) as count 
  FROM public.post_likes 
  GROUP BY post_id
) likes ON p.id = likes.post_id
LEFT JOIN (
  SELECT post_id, COUNT(*) as count 
  FROM public.comments 
  GROUP BY post_id
) comments ON p.id = comments.post_id;

-- 11. 권한 체크 함수 (이미 있으면 스킵)
-- has_permission 함수는 roles-update.sql에서 이미 생성됨

-- 12. 샘플 카테고리 설명
COMMENT ON COLUMN public.posts.category IS '게시글 카테고리: general(자유게시판), education(교육자료실), tech(에듀테크트렌드), job(구인구직), column(칼럼)';