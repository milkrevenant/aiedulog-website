-- 기존 테이블 삭제 스크립트
-- 이전에 생성한 잘못된 스키마를 삭제합니다

-- 트리거 삭제
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at_classes ON public.classes;
DROP TRIGGER IF EXISTS set_updated_at_students ON public.students;
DROP TRIGGER IF EXISTS set_updated_at_learning_records ON public.learning_records;
DROP TRIGGER IF EXISTS set_updated_at_comments ON public.comments;

-- 함수 삭제
DROP FUNCTION IF EXISTS public.handle_updated_at();

-- 테이블 삭제 (CASCADE로 관련 제약조건도 함께 삭제)
DROP TABLE IF EXISTS public.attachments CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.learning_records CASCADE;
DROP TABLE IF EXISTS public.class_enrollments CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.classes CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;