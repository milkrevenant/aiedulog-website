-- 채팅 시스템 데이터베이스 스키마
-- ================================

-- 1. 채팅방 테이블
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255),
  type VARCHAR(50) DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- 2. 채팅방 참가자 테이블
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  is_active BOOLEAN DEFAULT true,
  notifications_enabled BOOLEAN DEFAULT true,
  UNIQUE(room_id, user_id)
);

-- 3. 채팅 메시지 테이블
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'system')),
  file_url TEXT,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 4. 메시지 읽음 상태 테이블
CREATE TABLE IF NOT EXISTS message_read_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(message_id, user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON chat_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_participants_room_id ON chat_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_read_status_message_id ON message_read_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_user_id ON message_read_status(user_id);

-- 채팅방 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_chat_room_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_room_updated_at
  BEFORE UPDATE ON chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_room_updated_at();

-- 마지막 메시지 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_last_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type != 'system' AND NEW.is_deleted = false THEN
    UPDATE chat_rooms
    SET 
      last_message = NEW.content,
      last_message_at = NEW.created_at
    WHERE id = NEW.room_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_last_message();

-- 새 메시지 알림 트리거
CREATE OR REPLACE FUNCTION create_chat_notification()
RETURNS TRIGGER AS $$
DECLARE
  participant RECORD;
  sender_name TEXT;
BEGIN
  -- 발신자 이름 가져오기
  SELECT COALESCE(nickname, email) INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- 채팅방의 모든 참가자에게 알림 생성 (발신자 제외)
  FOR participant IN 
    SELECT user_id 
    FROM chat_participants 
    WHERE room_id = NEW.room_id 
      AND user_id != NEW.sender_id 
      AND is_active = true
      AND notifications_enabled = true
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      related_id,
      related_type
    ) VALUES (
      participant.user_id,
      'chat',
      '새 메시지',
      sender_name || ': ' || LEFT(NEW.content, 100),
      NEW.room_id,
      'chat_room'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_chat_notification
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  WHEN (NEW.type != 'system')
  EXECUTE FUNCTION create_chat_notification();

-- Direct Message 채팅방 생성 함수
CREATE OR REPLACE FUNCTION create_or_get_direct_chat(
  user1_id UUID,
  user2_id UUID
)
RETURNS UUID AS $$
DECLARE
  room_id UUID;
BEGIN
  -- 기존 DM 채팅방 확인
  SELECT cr.id INTO room_id
  FROM chat_rooms cr
  WHERE cr.type = 'direct'
    AND EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE room_id = cr.id AND user_id = user1_id
    )
    AND EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE room_id = cr.id AND user_id = user2_id
    );
  
  -- 채팅방이 없으면 새로 생성
  IF room_id IS NULL THEN
    INSERT INTO chat_rooms (type, created_by)
    VALUES ('direct', user1_id)
    RETURNING id INTO room_id;
    
    -- 참가자 추가
    INSERT INTO chat_participants (room_id, user_id)
    VALUES 
      (room_id, user1_id),
      (room_id, user2_id);
  END IF;
  
  RETURN room_id;
END;
$$ LANGUAGE plpgsql;

-- 안읽은 메시지 수 계산 뷰
CREATE OR REPLACE VIEW unread_messages_count AS
SELECT 
  cp.user_id,
  cp.room_id,
  COUNT(DISTINCT cm.id) AS unread_count
FROM chat_participants cp
INNER JOIN chat_messages cm ON cm.room_id = cp.room_id
LEFT JOIN message_read_status mrs ON mrs.message_id = cm.id AND mrs.user_id = cp.user_id
WHERE cm.created_at > cp.last_read_at
  AND cm.sender_id != cp.user_id
  AND cm.is_deleted = false
  AND mrs.id IS NULL
GROUP BY cp.user_id, cp.room_id;

-- RLS 정책
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;

-- 채팅방 정책: 참가자만 볼 수 있음
CREATE POLICY "Users can view their chat rooms" ON chat_rooms
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE room_id = chat_rooms.id
        AND user_id = auth.uid()
        AND is_active = true
    )
  );

-- 채팅방 생성 정책: 로그인한 사용자만
CREATE POLICY "Authenticated users can create chat rooms" ON chat_rooms
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 참가자 정책: 같은 채팅방 참가자만 볼 수 있음
CREATE POLICY "Users can view participants in their rooms" ON chat_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.room_id = chat_participants.room_id
        AND cp.user_id = auth.uid()
        AND cp.is_active = true
    )
  );

-- 메시지 정책: 채팅방 참가자만 볼 수 있음
CREATE POLICY "Users can view messages in their rooms" ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE room_id = chat_messages.room_id
        AND user_id = auth.uid()
        AND is_active = true
    )
  );

-- 메시지 작성 정책: 채팅방 참가자만
CREATE POLICY "Participants can send messages" ON chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE room_id = chat_messages.room_id
        AND user_id = auth.uid()
        AND is_active = true
    )
  );

-- 메시지 수정 정책: 본인이 작성한 메시지만
CREATE POLICY "Users can edit their own messages" ON chat_messages
  FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- 읽음 상태 정책
CREATE POLICY "Users can mark messages as read" ON message_read_status
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their read status" ON message_read_status
  FOR SELECT
  USING (user_id = auth.uid());