-- ============================================
-- 협업 기능 및 댓글 좋아요 추가
-- ============================================

-- 1. 댓글 좋아요 테이블 생성
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- 댓글 좋아요 인덱스
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user ON comment_likes(user_id);

-- 2. comments 테이블에 like_count 컬럼 추가 (안전하게 처리)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'comments' 
    AND column_name = 'like_count'
  ) THEN
    ALTER TABLE comments ADD COLUMN like_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- 2-1. posts 테이블에 image_urls 컬럼 추가 (안전하게 처리)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'posts' 
    AND column_name = 'image_urls'
  ) THEN
    ALTER TABLE posts ADD COLUMN image_urls TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- 3. 채팅방 테이블 처리
DO $$
BEGIN
  -- 테이블이 없으면 created_by 포함하여 생성
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'chat_rooms'
  ) THEN
    CREATE TABLE public.chat_rooms (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT,
      type TEXT CHECK (type IN ('direct', 'group', 'collaboration')),
      last_message TEXT,
      last_message_at TIMESTAMPTZ,
      created_by UUID REFERENCES profiles(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  ELSE
    -- 테이블이 있으면 필요한 컬럼들만 추가
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'chat_rooms' 
      AND column_name = 'created_by'
    ) THEN
      ALTER TABLE chat_rooms ADD COLUMN created_by UUID REFERENCES profiles(id);
    END IF;
  END IF;
END $$;

-- 4. 채팅 참가자 테이블 (없으면 생성)
CREATE TABLE IF NOT EXISTS public.chat_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  last_read_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- 5. 채팅 메시지 테이블 (없으면 생성)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  type TEXT CHECK (type IN ('text', 'image', 'file', 'system')),
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 협업 보드 테이블
CREATE TABLE IF NOT EXISTS public.collaboration_boards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT CHECK (type IN ('kanban', 'table', 'whiteboard')),
  data JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 협업 작업 테이블
CREATE TABLE IF NOT EXISTS public.collaboration_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES collaboration_boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assignees UUID[] DEFAULT '{}',
  start_date DATE,
  due_date DATE,
  reviewer UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  position INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 협업 작업 인덱스
CREATE INDEX IF NOT EXISTS idx_tasks_board ON collaboration_tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignees ON collaboration_tasks USING GIN(assignees);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON collaboration_tasks(status);

-- 9. RLS 정책들

-- Comment likes RLS
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- 정책이 이미 존재하지 않는 경우에만 생성
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'comment_likes' 
    AND policyname = 'Comment likes are viewable by everyone'
  ) THEN
    CREATE POLICY "Comment likes are viewable by everyone"
    ON comment_likes FOR SELECT
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'comment_likes' 
    AND policyname = 'Users can like comments'
  ) THEN
    CREATE POLICY "Users can like comments"
    ON comment_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'comment_likes' 
    AND policyname = 'Users can unlike comments'
  ) THEN
    CREATE POLICY "Users can unlike comments"
    ON comment_likes FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Chat rooms RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

-- 정책이 이미 존재하는지 확인하고 생성
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_rooms' 
    AND policyname = 'Chat rooms viewable by participants'
  ) THEN
    CREATE POLICY "Chat rooms viewable by participants"
    ON chat_rooms FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM chat_participants
        WHERE chat_participants.room_id = chat_rooms.id
        AND chat_participants.user_id = auth.uid()
        AND chat_participants.is_active = true
      )
    );
  END IF;

  -- created_by가 있는 경우에만 이 정책들을 생성
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'chat_rooms' 
    AND column_name = 'created_by'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'chat_rooms' 
      AND policyname = 'Users can create chat rooms'
    ) THEN
      CREATE POLICY "Users can create chat rooms"
      ON chat_rooms FOR INSERT
      WITH CHECK (auth.uid() = created_by);
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'chat_rooms' 
      AND policyname = 'Room creator can update room'
    ) THEN
      CREATE POLICY "Room creator can update room"
      ON chat_rooms FOR UPDATE
      USING (auth.uid() = created_by);
    END IF;
  END IF;
END $$;

-- Chat participants RLS
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_participants' 
    AND policyname = 'Participants can view room members'
  ) THEN
    CREATE POLICY "Participants can view room members"
    ON chat_participants FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM chat_participants cp
        WHERE cp.room_id = chat_participants.room_id
        AND cp.user_id = auth.uid()
        AND cp.is_active = true
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_participants' 
    AND policyname = 'Users can join rooms'
  ) THEN
    CREATE POLICY "Users can join rooms"
    ON chat_participants FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_participants' 
    AND policyname = 'Users can update own participation'
  ) THEN
    CREATE POLICY "Users can update own participation"
    ON chat_participants FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Chat messages RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_messages' 
    AND policyname = 'Messages viewable by room participants'
  ) THEN
    CREATE POLICY "Messages viewable by room participants"
    ON chat_messages FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM chat_participants
        WHERE chat_participants.room_id = chat_messages.room_id
        AND chat_participants.user_id = auth.uid()
        AND chat_participants.is_active = true
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_messages' 
    AND policyname = 'Participants can send messages'
  ) THEN
    CREATE POLICY "Participants can send messages"
    ON chat_messages FOR INSERT
    WITH CHECK (
      auth.uid() = sender_id AND
      EXISTS (
        SELECT 1 FROM chat_participants
        WHERE chat_participants.room_id = room_id
        AND chat_participants.user_id = auth.uid()
        AND chat_participants.is_active = true
      )
    );
  END IF;
END $$;

-- Collaboration boards RLS
ALTER TABLE collaboration_boards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'collaboration_boards' 
    AND policyname = 'Boards viewable by room participants'
  ) THEN
    CREATE POLICY "Boards viewable by room participants"
    ON collaboration_boards FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM chat_participants
        WHERE chat_participants.room_id = collaboration_boards.room_id
        AND chat_participants.user_id = auth.uid()
        AND chat_participants.is_active = true
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'collaboration_boards' 
    AND policyname = 'Room participants can create boards'
  ) THEN
    CREATE POLICY "Room participants can create boards"
    ON collaboration_boards FOR INSERT
    WITH CHECK (
      auth.uid() = created_by AND
      EXISTS (
        SELECT 1 FROM chat_participants
        WHERE chat_participants.room_id = room_id
        AND chat_participants.user_id = auth.uid()
        AND chat_participants.is_active = true
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'collaboration_boards' 
    AND policyname = 'Room participants can update boards'
  ) THEN
    CREATE POLICY "Room participants can update boards"
    ON collaboration_boards FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM chat_participants
        WHERE chat_participants.room_id = collaboration_boards.room_id
        AND chat_participants.user_id = auth.uid()
        AND chat_participants.is_active = true
      )
    );
  END IF;
END $$;

-- Collaboration tasks RLS
ALTER TABLE collaboration_tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'collaboration_tasks' 
    AND policyname = 'Tasks viewable by board participants'
  ) THEN
    CREATE POLICY "Tasks viewable by board participants"
    ON collaboration_tasks FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM collaboration_boards b
        JOIN chat_participants p ON p.room_id = b.room_id
        WHERE b.id = collaboration_tasks.board_id
        AND p.user_id = auth.uid()
        AND p.is_active = true
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'collaboration_tasks' 
    AND policyname = 'Board participants can manage tasks'
  ) THEN
    CREATE POLICY "Board participants can manage tasks"
    ON collaboration_tasks FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM collaboration_boards b
        JOIN chat_participants p ON p.room_id = b.room_id
        WHERE b.id = collaboration_tasks.board_id
        AND p.user_id = auth.uid()
        AND p.is_active = true
      )
    );
  END IF;
END $$;

-- 10. 트리거 함수 - 댓글 좋아요 수 자동 업데이트
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments 
    SET like_count = like_count + 1 
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments 
    SET like_count = GREATEST(0, like_count - 1) 
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성 (기존 트리거 먼저 삭제)
DROP TRIGGER IF EXISTS update_comment_likes_count ON comment_likes;
CREATE TRIGGER update_comment_likes_count
AFTER INSERT OR DELETE ON comment_likes
FOR EACH ROW
EXECUTE FUNCTION update_comment_like_count();

-- 11. 조회수 증가 함수 (이미 있을 수 있음)
CREATE OR REPLACE FUNCTION increment_post_view_count(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts 
  SET view_count = view_count + 1 
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Storage 버킷 추가 (게시글 이미지용)
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage 정책 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Post images are publicly accessible'
  ) THEN
    CREATE POLICY "Post images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'post-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Authenticated users can upload post images'
  ) THEN
    CREATE POLICY "Authenticated users can upload post images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'post-images' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can update own post images'
  ) THEN
    CREATE POLICY "Users can update own post images"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can delete own post images'
  ) THEN
    CREATE POLICY "Users can delete own post images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- 13. create_or_get_direct_chat 함수 추가
CREATE OR REPLACE FUNCTION create_or_get_direct_chat(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  room_id UUID;
BEGIN
  -- 기존 채팅방 찾기
  SELECT cr.id INTO room_id
  FROM chat_rooms cr
  WHERE cr.type = 'direct'
  AND EXISTS (
    SELECT 1 FROM chat_participants cp1 
    WHERE cp1.room_id = cr.id AND cp1.user_id = user1_id
  )
  AND EXISTS (
    SELECT 1 FROM chat_participants cp2 
    WHERE cp2.room_id = cr.id AND cp2.user_id = user2_id
  )
  LIMIT 1;

  -- 없으면 생성
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. 마이그레이션 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '협업 기능 및 댓글 좋아요 마이그레이션 완료!';
END $$;