-- Landing Page Content Management System Tables
-- 랜딩 페이지(/main) 및 관련 페이지들의 콘텐츠 관리를 위한 테이블

-- 네비게이션 메뉴 아이템 (간소화)
CREATE TABLE IF NOT EXISTS navigation_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  key TEXT UNIQUE NOT NULL,
  href TEXT,
  parent_key TEXT,
  order_index INTEGER DEFAULT 0,
  is_dropdown BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 연혁 데이터
CREATE TABLE IF NOT EXISTS history_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER,
  content TEXT NOT NULL,
  is_milestone BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 정기 모임 일정
CREATE TABLE IF NOT EXISTS regular_meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  meeting_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  online_link TEXT,
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  registration_deadline DATE,
  status TEXT DEFAULT 'scheduled', -- scheduled, ongoing, completed, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 연수 프로그램
CREATE TABLE IF NOT EXISTS training_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  training_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  duration_hours INTEGER,
  location TEXT,
  online_link TEXT,
  instructor_name TEXT NOT NULL,
  instructor_title TEXT,
  instructor_bio TEXT,
  instructor_image TEXT,
  program_content JSONB, -- 세부 커리큘럼
  materials_link TEXT,
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  registration_deadline DATE,
  fee INTEGER DEFAULT 0,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 뉴스 (공지사항과 분리)
CREATE TABLE IF NOT EXISTS news_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  thumbnail_image TEXT,
  category TEXT DEFAULT 'news', -- 'news', 'event', 'achievement'
  author_id UUID REFERENCES profiles(id),
  view_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 공지사항 (뉴스와 분리)
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general', -- 'general', 'urgent', 'event', 'maintenance'
  priority INTEGER DEFAULT 0, -- 0: normal, 1: important, 2: urgent
  author_id UUID REFERENCES profiles(id),
  is_pinned BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 자료공유 태그 (교육자료실 확장)
CREATE TABLE IF NOT EXISTS resource_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL, -- 'tool', 'plan', 'evaluation', 'paper', 'seminar'
  color TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- resources 테이블에 태그 연결 테이블
CREATE TABLE IF NOT EXISTS resource_tag_relations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES resource_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resource_id, tag_id)
);

-- 페이지 콘텐츠 (정적 페이지용)
CREATE TABLE IF NOT EXISTS static_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_key TEXT UNIQUE NOT NULL, -- 'about', 'organization', 'vision'
  title TEXT NOT NULL,
  content TEXT, -- HTML 또는 Markdown
  meta_title TEXT,
  meta_description TEXT,
  last_updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE navigation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE regular_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_tag_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE static_pages ENABLE ROW LEVEL SECURITY;

-- 읽기 권한은 모두에게
CREATE POLICY "public_read" ON navigation_items FOR SELECT USING (true);
CREATE POLICY "public_read" ON history_items FOR SELECT USING (true);
CREATE POLICY "public_read" ON regular_meetings FOR SELECT USING (true);
CREATE POLICY "public_read" ON training_programs FOR SELECT USING (true);
CREATE POLICY "public_read" ON news_posts FOR SELECT USING (is_published = true);
CREATE POLICY "public_read" ON announcements FOR SELECT USING (is_published = true);
CREATE POLICY "public_read" ON resource_tags FOR SELECT USING (true);
CREATE POLICY "public_read" ON resource_tag_relations FOR SELECT USING (true);
CREATE POLICY "public_read" ON static_pages FOR SELECT USING (true);

-- 쓰기 권한은 관리자/운영진만
CREATE POLICY "admin_write" ON navigation_items FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "admin_write" ON history_items FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "admin_write" ON regular_meetings FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "admin_write" ON training_programs FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "admin_write" ON news_posts FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "admin_write" ON announcements FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "admin_write" ON resource_tags FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "admin_write" ON static_pages FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'moderator')
  )
);

-- 기본 네비게이션 데이터
INSERT INTO navigation_items (label, key, is_dropdown, order_index) VALUES
('소개', 'intro', true, 1),
('자료공유', 'share', true, 2),
('비전', 'vision', false, 3),
('뉴스', 'news', false, 4),
('공지사항', 'announcements', false, 5)
ON CONFLICT (key) DO NOTHING;

-- 소개 드롭다운 메뉴
INSERT INTO navigation_items (label, key, parent_key, href, order_index) VALUES
('연구회 소개', 'intro-about', 'intro', '/intro/about', 1),
('조직도', 'intro-organization', 'intro', '/intro/organization', 2),
('연혁', 'intro-history', 'intro', '/intro/history', 3),
('정기 모임', 'intro-meetings', 'intro', '/intro/meetings', 4),
('연수 프로그램', 'intro-training', 'intro', '/intro/training', 5)
ON CONFLICT (key) DO NOTHING;

-- 자료공유 드롭다운 메뉴
INSERT INTO navigation_items (label, key, parent_key, href, order_index) VALUES
('AI 도구 활용', 'share-ai', 'share', '/board/education?tag=ai-tools', 1),
('수업 지도안', 'share-lesson', 'share', '/board/education?tag=lesson-plan', 2),
('평가 자료', 'share-evaluation', 'share', '/board/education?tag=evaluation', 3),
('논문 및 보고서', 'share-paper', 'share', '/board/education?tag=paper', 4),
('세미나 자료', 'share-seminar', 'share', '/board/education?tag=seminar', 5)
ON CONFLICT (key) DO NOTHING;

-- 자료공유 태그 기본 데이터
INSERT INTO resource_tags (name, slug, category, color) VALUES
('AI 도구 활용', 'ai-tools', 'tool', '#4CAF50'),
('수업 지도안', 'lesson-plan', 'plan', '#2196F3'),
('평가 자료', 'evaluation', 'evaluation', '#FF9800'),
('논문 및 보고서', 'paper', 'paper', '#9C27B0'),
('세미나 자료', 'seminar', 'seminar', '#F44336')
ON CONFLICT (slug) DO NOTHING;

-- 정적 페이지 기본 데이터
INSERT INTO static_pages (page_key, title, content) VALUES
('about', '전남에듀테크교육연구회 소개', '# 전남에듀테크교육연구회\n\n우리는 전남 지역 교사들의 AI 교육 혁신을 선도합니다.'),
('organization', '조직도', '# 조직도\n\n## 회장단\n- 회장: OOO\n- 부회장: OOO\n\n## 운영위원회\n- 총무: OOO\n- 기획: OOO'),
('vision', '비전', '# 우리의 비전\n\nAI 시대를 선도하는 교육 혁신')
ON CONFLICT (page_key) DO NOTHING;