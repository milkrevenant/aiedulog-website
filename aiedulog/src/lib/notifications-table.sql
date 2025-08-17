-- 알림 시스템 전체 설치 SQL
-- 주의: 이미 설치된 경우 notifications-fix.sql을 사용하세요
-- 
-- 이 파일은 알림 시스템을 처음 설치할 때 사용합니다.
-- 이미 일부가 설치된 경우에는:
-- 1. notifications-check.sql로 현재 상태 확인
-- 2. notifications-fix.sql로 누락된 부분만 추가

-- 테이블 삭제 (초기화가 필요한 경우만)
-- DROP TABLE IF EXISTS notifications CASCADE;

-- 알림 테이블 생성
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 알림 타입 ENUM (참고용, 앱에서 관리)
-- 'post_like' - 게시글 좋아요
-- 'post_comment' - 게시글 댓글
-- 'comment_reply' - 댓글 답글
-- 'follow' - 팔로우
-- 'mention' - 멘션
-- 'system' - 시스템 알림
-- 'role_change' - 권한 변경
-- 'post_approved' - 게시글 승인
-- 'welcome' - 환영 메시지

-- 인덱스
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- RLS 정책
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 알림만 볼 수 있음
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 알림만 업데이트할 수 있음 (읽음 처리)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 사용자는 자신의 알림만 삭제할 수 있음
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- 시스템은 알림을 생성할 수 있음 (service role 필요)
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (TRUE);

-- 읽지 않은 알림 수를 반환하는 함수
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM notifications
    WHERE user_id = p_user_id AND is_read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 알림 읽음 처리 함수
CREATE OR REPLACE FUNCTION mark_notification_as_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 모든 알림 읽음 처리 함수
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE user_id = auth.uid() AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 알림 생성 트리거 함수 (게시글 좋아요)
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

-- 알림 생성 트리거 함수 (댓글)
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

-- 트리거 생성
CREATE TRIGGER trigger_notify_post_like
  AFTER INSERT ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_like();

CREATE TRIGGER trigger_notify_post_comment
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_comment();

-- 권한 변경 알림 함수 (관리자가 호출)
CREATE OR REPLACE FUNCTION notify_role_change(
  p_user_id UUID,
  p_new_role TEXT
)
RETURNS VOID AS $$
DECLARE
  v_role_label TEXT;
BEGIN
  -- 역할 레이블 설정
  CASE p_new_role
    WHEN 'admin' THEN v_role_label := '관리자';
    WHEN 'moderator' THEN v_role_label := '운영진';
    WHEN 'verified' THEN v_role_label := '인증교사';
    ELSE v_role_label := '일반회원';
  END CASE;

  -- 알림 생성
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    p_user_id,
    'role_change',
    '권한 변경',
    '회원님의 권한이 ' || v_role_label || '(으)로 변경되었습니다.',
    jsonb_build_object('new_role', p_new_role, 'role_label', v_role_label)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 환영 메시지 알림 함수
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

-- 프로필 생성 시 환영 알림 트리거
CREATE TRIGGER trigger_send_welcome_notification
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_notification();