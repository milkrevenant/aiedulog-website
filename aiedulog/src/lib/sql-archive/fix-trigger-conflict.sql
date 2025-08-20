-- ============================================
-- 트리거 충돌 해결 스크립트
-- 기존 트리거 및 함수 완전 제거 후 재생성
-- ============================================

-- 1. 기존 트리거 제거
DROP TRIGGER IF EXISTS update_lecture_participants_trigger ON lecture_registrations;
DROP TRIGGER IF EXISTS update_lectures_updated_at ON lectures;

-- 2. 기존 함수 제거
DROP FUNCTION IF EXISTS update_lecture_participants() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 3. 확인 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ 기존 트리거 및 함수 제거 완료';
  RAISE NOTICE '이제 lectures-system-safe.sql을 실행하세요';
END $$;