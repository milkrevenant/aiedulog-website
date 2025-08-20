-- ============================================
-- 강의 시스템 안전 설치 스크립트
-- 이미 존재하는 객체는 건너뛰고 진행
-- ============================================

-- lectures 테이블 (이미 있으면 건너뜀)
CREATE TABLE IF NOT EXISTS lectures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  instructor TEXT NOT NULL,
  instructor_bio TEXT,
  category TEXT CHECK (category IN ('AI', '교육', '기술', '워크샵', '세미나', '기타')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  is_online BOOLEAN DEFAULT false,
  online_link TEXT,
  max_participants INTEGER DEFAULT 50,
  current_participants INTEGER DEFAULT 0,
  registration_deadline TIMESTAMPTZ,
  fee INTEGER DEFAULT 0,
  image_url TEXT,
  attachment_url TEXT,
  status TEXT CHECK (status IN ('draft', 'published', 'cancelled', 'completed')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- lecture_registrations 테이블 (이미 있으면 건너뜀)
CREATE TABLE IF NOT EXISTS lecture_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  organization TEXT,
  notes TEXT,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'attended')) DEFAULT 'pending',
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded')) DEFAULT 'pending',
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  UNIQUE(lecture_id, user_id)
);

-- 인덱스 (이미 있으면 건너뜀)
CREATE INDEX IF NOT EXISTS idx_lectures_start_date ON lectures(start_date);
CREATE INDEX IF NOT EXISTS idx_lectures_status ON lectures(status);
CREATE INDEX IF NOT EXISTS idx_lectures_category ON lectures(category);
CREATE INDEX IF NOT EXISTS idx_registrations_lecture_id ON lecture_registrations(lecture_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON lecture_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON lecture_registrations(status);

-- RLS 활성화
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_registrations ENABLE ROW LEVEL SECURITY;

-- RLS 정책들 (DROP & CREATE로 갱신)
-- lectures 정책
DROP POLICY IF EXISTS "Public can view published lectures" ON lectures;
CREATE POLICY "Public can view published lectures"
  ON lectures FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Admin can view all lectures" ON lectures;
CREATE POLICY "Admin can view all lectures"
  ON lectures FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Admin can create lectures" ON lectures;
CREATE POLICY "Admin can create lectures"
  ON lectures FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Admin can update lectures" ON lectures;
CREATE POLICY "Admin can update lectures"
  ON lectures FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Admin can delete lectures" ON lectures;
CREATE POLICY "Admin can delete lectures"
  ON lectures FOR DELETE
  USING (auth.jwt() ->> 'role' = 'admin');

-- lecture_registrations 정책
DROP POLICY IF EXISTS "Users can view own registrations" ON lecture_registrations;
CREATE POLICY "Users can view own registrations"
  ON lecture_registrations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can view all registrations" ON lecture_registrations;
CREATE POLICY "Admin can view all registrations"
  ON lecture_registrations FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Authenticated users can register" ON lecture_registrations;
CREATE POLICY "Authenticated users can register"
  ON lecture_registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own registrations" ON lecture_registrations;
CREATE POLICY "Users can update own registrations"
  ON lecture_registrations FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can update all registrations" ON lecture_registrations;
CREATE POLICY "Admin can update all registrations"
  ON lecture_registrations FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin');

-- 트리거 함수 (DROP & CREATE로 갱신)
DROP FUNCTION IF EXISTS update_lecture_participants() CASCADE;
CREATE OR REPLACE FUNCTION update_lecture_participants()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lectures 
    SET current_participants = current_participants + 1
    WHERE id = NEW.lecture_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE lectures 
    SET current_participants = current_participants - 1
    WHERE id = OLD.lecture_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
      UPDATE lectures 
      SET current_participants = current_participants - 1
      WHERE id = NEW.lecture_id;
    ELSIF OLD.status = 'cancelled' AND NEW.status != 'cancelled' THEN
      UPDATE lectures 
      SET current_participants = current_participants + 1
      WHERE id = NEW.lecture_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 (DROP & CREATE로 갱신)
DROP TRIGGER IF EXISTS update_lecture_participants_trigger ON lecture_registrations;
CREATE TRIGGER update_lecture_participants_trigger
AFTER INSERT OR UPDATE OR DELETE ON lecture_registrations
FOR EACH ROW
EXECUTE FUNCTION update_lecture_participants();

-- updated_at 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거
DROP TRIGGER IF EXISTS update_lectures_updated_at ON lectures;
CREATE TRIGGER update_lectures_updated_at
BEFORE UPDATE ON lectures
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 성공 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ 강의 시스템 설치/업데이트 완료';
  RAISE NOTICE '- lectures 테이블 준비됨';
  RAISE NOTICE '- lecture_registrations 테이블 준비됨';
  RAISE NOTICE '- RLS 정책 설정됨';
  RAISE NOTICE '- 트리거 설정됨';
END $$;