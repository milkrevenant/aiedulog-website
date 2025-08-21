-- Add 'solo' type to chat_rooms for personal memo/notes functionality
ALTER TABLE chat_rooms 
DROP CONSTRAINT IF EXISTS chat_rooms_type_check;

ALTER TABLE chat_rooms 
ADD CONSTRAINT chat_rooms_type_check 
CHECK (type IN ('direct', 'group', 'collaboration', 'solo'));

-- Function to create a solo chat room
CREATE OR REPLACE FUNCTION create_solo_chat(user_id UUID)
RETURNS UUID AS $$
DECLARE
  new_room_id UUID;
BEGIN
  -- Create a new solo chat room
  INSERT INTO chat_rooms (type, created_by, name)
  VALUES ('solo', user_id, '나만의 메모')
  RETURNING id INTO new_room_id;
  
  -- Add the user as the only participant
  INSERT INTO chat_participants (room_id, user_id)
  VALUES (new_room_id, user_id);
  
  RETURN new_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;