-- 알림 시스템 확인 및 누락된 부분만 생성
-- Supabase SQL Editor에서 단계별로 실행하세요

-- 1. 먼저 notifications 테이블이 있는지 확인
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'notifications'
);

-- 2. 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'notifications'
ORDER BY ordinal_position;

-- 3. 인덱스 확인
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'notifications';

-- 4. RLS 정책 확인
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'notifications';

-- 5. 트리거 확인
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND (event_object_table = 'post_likes' OR event_object_table = 'comments' OR event_object_table = 'profiles');

-- 6. 함수 확인
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_unread_notification_count',
  'mark_notification_as_read',
  'mark_all_notifications_as_read',
  'notify_post_like',
  'notify_post_comment',
  'notify_role_change',
  'send_welcome_notification'
);