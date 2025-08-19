-- 강의 홍보 시스템 테이블 생성

-- lectures 테이블 생성
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

-- lecture_registrations 테이블 생성 (강의 신청자 관리)
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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_lectures_start_date ON lectures(start_date);
CREATE INDEX IF NOT EXISTS idx_lectures_status ON lectures(status);
CREATE INDEX IF NOT EXISTS idx_lectures_category ON lectures(category);
CREATE INDEX IF NOT EXISTS idx_registrations_lecture_id ON lecture_registrations(lecture_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON lecture_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON lecture_registrations(status);

-- RLS 정책 설정
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_registrations ENABLE ROW LEVEL SECURITY;

-- lectures 테이블 정책
-- 모든 사용자가 published 상태의 강의를 볼 수 있음
CREATE POLICY "Public can view published lectures"
  ON lectures FOR SELECT
  USING (status = 'published');

-- 관리자만 모든 강의를 볼 수 있음
CREATE POLICY "Admin can view all lectures"
  ON lectures FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

-- 관리자만 강의를 생성할 수 있음
CREATE POLICY "Admin can create lectures"
  ON lectures FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- 관리자만 강의를 수정할 수 있음
CREATE POLICY "Admin can update lectures"
  ON lectures FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin');

-- 관리자만 강의를 삭제할 수 있음
CREATE POLICY "Admin can delete lectures"
  ON lectures FOR DELETE
  USING (auth.jwt() ->> 'role' = 'admin');

-- lecture_registrations 테이블 정책
-- 사용자는 자신의 신청 내역만 볼 수 있음
CREATE POLICY "Users can view own registrations"
  ON lecture_registrations FOR SELECT
  USING (auth.uid() = user_id);

-- 관리자는 모든 신청 내역을 볼 수 있음
CREATE POLICY "Admin can view all registrations"
  ON lecture_registrations FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

-- 로그인한 사용자는 강의를 신청할 수 있음
CREATE POLICY "Authenticated users can register"
  ON lecture_registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 신청을 수정할 수 있음
CREATE POLICY "Users can update own registrations"
  ON lecture_registrations FOR UPDATE
  USING (auth.uid() = user_id);

-- 관리자는 모든 신청을 수정할 수 있음
CREATE POLICY "Admin can update all registrations"
  ON lecture_registrations FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin');

-- 트리거 함수: 신청자 수 자동 업데이트
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

-- 트리거 생성
CREATE TRIGGER update_lecture_participants_trigger
AFTER INSERT OR UPDATE OR DELETE ON lecture_registrations
FOR EACH ROW
EXECUTE FUNCTION update_lecture_participants();

-- 트리거 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER update_lectures_updated_at
BEFORE UPDATE ON lectures
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 코멘트 추가
COMMENT ON TABLE lectures IS '강의 및 교육 프로그램 정보';
COMMENT ON TABLE lecture_registrations IS '강의 신청 및 참가자 정보';
COMMENT ON COLUMN lectures.title IS '강의 제목';
COMMENT ON COLUMN lectures.description IS '강의 상세 설명';
COMMENT ON COLUMN lectures.instructor IS '강사명';
COMMENT ON COLUMN lectures.instructor_bio IS '강사 소개';
COMMENT ON COLUMN lectures.category IS '강의 분류';
COMMENT ON COLUMN lectures.start_date IS '강의 시작 일시';
COMMENT ON COLUMN lectures.end_date IS '강의 종료 일시';
COMMENT ON COLUMN lectures.location IS '오프라인 강의 장소';
COMMENT ON COLUMN lectures.is_online IS '온라인 강의 여부';
COMMENT ON COLUMN lectures.online_link IS '온라인 강의 링크';
COMMENT ON COLUMN lectures.max_participants IS '최대 참가 인원';
COMMENT ON COLUMN lectures.current_participants IS '현재 신청 인원';
COMMENT ON COLUMN lectures.registration_deadline IS '신청 마감일';
COMMENT ON COLUMN lectures.fee IS '수강료 (원)';
COMMENT ON COLUMN lectures.image_url IS '강의 대표 이미지 URL';
COMMENT ON COLUMN lectures.attachment_url IS '첨부 파일 URL';
COMMENT ON COLUMN lectures.status IS '강의 상태 (draft, published, cancelled, completed)';