-- ============================================
-- 004: 강의 시스템
-- ============================================

-- 먼저 DO 블록으로 테이블 처리
DO $$
BEGIN
  -- 이미 실행됐는지 확인
  IF is_migration_executed('004_lectures_system') THEN
    RAISE NOTICE 'Migration 004_lectures_system already executed. Skipping.';
    RETURN;
  END IF;

  -- lectures 테이블 (이미 존재하는 경우 누락된 컬럼만 추가)
  DO $lectures_table$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'lectures' AND table_schema = 'public') THEN
      CREATE TABLE lectures (
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
    ELSE
      -- 이미 존재하는 테이블에 누락된 컬럼 추가
      ALTER TABLE lectures 
      ADD COLUMN IF NOT EXISTS attachment_url TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
  END $lectures_table$;

  -- lecture_registrations 테이블 (이미 존재하는 경우 누락된 컬럼만 추가)
  DO $registrations_table$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'lecture_registrations' AND table_schema = 'public') THEN
      CREATE TABLE lecture_registrations (
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
    ELSE
      -- 이미 존재하는 테이블에 누락된 컬럼 추가
      ALTER TABLE lecture_registrations 
      ADD COLUMN IF NOT EXISTS payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded')) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
    END IF;
  END $registrations_table$;

  -- RLS 활성화
  ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
  ALTER TABLE lecture_registrations ENABLE ROW LEVEL SECURITY;

  -- 마이그레이션 기록
  PERFORM record_migration('004_lectures_system', 'Lectures and registrations system');
  
EXCEPTION WHEN OTHERS THEN
  PERFORM record_migration('004_lectures_system', 'Lectures and registrations system', false, SQLERRM);
  RAISE;
END $$;

-- 트리거 함수와 트리거는 DO 블록 밖에서 생성
-- 트리거 제거 (중복 방지)
DROP TRIGGER IF EXISTS update_lecture_participants_trigger ON lecture_registrations;
DROP FUNCTION IF EXISTS update_lecture_participants() CASCADE;

-- 트리거 함수 재생성
CREATE OR REPLACE FUNCTION update_lecture_participants()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lectures SET current_participants = current_participants + 1
    WHERE id = NEW.lecture_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE lectures SET current_participants = current_participants - 1
    WHERE id = OLD.lecture_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 트리거 생성
CREATE TRIGGER update_lecture_participants_trigger
AFTER INSERT OR DELETE ON lecture_registrations
FOR EACH ROW
EXECUTE FUNCTION update_lecture_participants();