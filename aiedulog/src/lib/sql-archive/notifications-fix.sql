-- 알림 시스템 누락된 부분만 추가
-- notifications-check.sql 실행 후, 없는 것만 실행하세요

-- 인덱스가 없으면 생성 (IF NOT EXISTS 사용)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- RLS 정책 (없으면 생성)
DO $$ 
BEGIN
  -- RLS 활성화
  ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
  
  -- 정책이 없으면 생성
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'notifications' 
    AND policyname = 'Users can view own notifications'
  ) THEN
    CREATE POLICY "Users can view own notifications" ON notifications
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'notifications' 
    AND policyname = 'Users can update own notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications" ON notifications
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'notifications' 
    AND policyname = 'Users can delete own notifications'
  ) THEN
    CREATE POLICY "Users can delete own notifications" ON notifications
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'notifications' 
    AND policyname = 'System can insert notifications'
  ) THEN
    CREATE POLICY "System can insert notifications" ON notifications
      FOR INSERT WITH CHECK (TRUE);
  END IF;
END $$;

-- 트리거 함수들 (없으면 생성)
-- 게시글 좋아요 알림
CREATE OR REPLACE FUNCTION notify_post_like()
RETURNS TRIGGER AS $$
DECLARE
  v_post_author_id UUID;
  v_post_title TEXT;
  v_liker_name TEXT;
BEGIN
  -- 게시글 작성자 정보 가져오기
  SELECT p.user_id, p.title INTO v_post_author_id, v_post_title
  FROM posts p
  WHERE p.id = NEW.post_id;

  -- 자기 자신의 게시글에 좋아요한 경우 알림 생성 안함
  IF v_post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- 좋아요한 사용자 이름 가져오기
  SELECT COALESCE(nickname, username) INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- 알림 생성
  INSERT INTO notifications (user_id, type, title, message, link, data)
  VALUES (
    v_post_author_id,
    'post_like',
    '게시글 좋아요',
    v_liker_name || '님이 "' || v_post_title || '" 게시글을 좋아합니다.',
    '/post/' || NEW.post_id,
    jsonb_build_object(
      'post_id', NEW.post_id,
      'post_title', v_post_title,
      'liker_id', NEW.user_id,
      'liker_name', v_liker_name
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 댓글 알림
CREATE OR REPLACE FUNCTION notify_post_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_post_author_id UUID;
  v_post_title TEXT;
  v_commenter_name TEXT;
  v_parent_comment_author_id UUID;
BEGIN
  -- 게시글 정보 가져오기
  SELECT p.user_id, p.title INTO v_post_author_id, v_post_title
  FROM posts p
  WHERE p.id = NEW.post_id;

  -- 댓글 작성자 이름 가져오기
  SELECT COALESCE(nickname, username) INTO v_commenter_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- 대댓글인 경우
  IF NEW.parent_id IS NOT NULL THEN
    -- 부모 댓글 작성자 가져오기
    SELECT user_id INTO v_parent_comment_author_id
    FROM comments
    WHERE id = NEW.parent_id;

    -- 자기 자신의 댓글에 답글 단 경우가 아니라면 알림 생성
    IF v_parent_comment_author_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, type, title, message, link, data)
      VALUES (
        v_parent_comment_author_id,
        'comment_reply',
        '댓글 답글',
        v_commenter_name || '님이 회원님의 댓글에 답글을 남겼습니다.',
        '/post/' || NEW.post_id,
        jsonb_build_object(
          'post_id', NEW.post_id,
          'post_title', v_post_title,
          'comment_id', NEW.id,
          'commenter_id', NEW.user_id,
          'commenter_name', v_commenter_name
        )
      );
    END IF;
  END IF;

  -- 게시글 작성자에게 알림 (자기 게시글에 댓글 단 경우 제외)
  IF v_post_author_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, title, message, link, data)
    VALUES (
      v_post_author_id,
      'post_comment',
      '새 댓글',
      v_commenter_name || '님이 "' || v_post_title || '" 게시글에 댓글을 남겼습니다.',
      '/post/' || NEW.post_id,
      jsonb_build_object(
        'post_id', NEW.post_id,
        'post_title', v_post_title,
        'comment_id', NEW.id,
        'commenter_id', NEW.user_id,
        'commenter_name', v_commenter_name
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 환영 메시지 알림
CREATE OR REPLACE FUNCTION send_welcome_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (
    NEW.id,
    'welcome',
    'AIedulog에 오신 것을 환영합니다!',
    '전남에듀테크교육연구회 커뮤니티에 가입하신 것을 환영합니다. 프로필을 설정하고 다양한 활동을 시작해보세요!',
    '/settings/profile'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성 (없으면)
DO $$
BEGIN
  -- 좋아요 알림 트리거
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_schema = 'public' 
    AND trigger_name = 'trigger_notify_post_like'
  ) THEN
    CREATE TRIGGER trigger_notify_post_like
      AFTER INSERT ON post_likes
      FOR EACH ROW
      EXECUTE FUNCTION notify_post_like();
  END IF;

  -- 댓글 알림 트리거
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_schema = 'public' 
    AND trigger_name = 'trigger_notify_post_comment'
  ) THEN
    CREATE TRIGGER trigger_notify_post_comment
      AFTER INSERT ON comments
      FOR EACH ROW
      EXECUTE FUNCTION notify_post_comment();
  END IF;

  -- 환영 알림 트리거
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_schema = 'public' 
    AND trigger_name = 'trigger_send_welcome_notification'
  ) THEN
    CREATE TRIGGER trigger_send_welcome_notification
      AFTER INSERT ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION send_welcome_notification();
  END IF;
END $$;