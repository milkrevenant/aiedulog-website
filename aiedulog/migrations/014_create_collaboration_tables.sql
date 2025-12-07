-- Migration: 014_create_collaboration_tables
-- Description: Create collaboration boards and tasks tables for Kanban functionality
-- Date: 2025-12-08

-- Collaboration Boards (for Kanban)
CREATE TABLE IF NOT EXISTS collaboration_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    chat_room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    created_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Collaboration Tasks (Kanban cards)
CREATE TABLE IF NOT EXISTS collaboration_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES collaboration_boards(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'todo',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    position INTEGER NOT NULL DEFAULT 0,
    assignees UUID[] DEFAULT '{}',
    due_date DATE,
    created_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_collaboration_boards_chat_room ON collaboration_boards(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_tasks_board ON collaboration_tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_tasks_status ON collaboration_tasks(status);
CREATE INDEX IF NOT EXISTS idx_collaboration_tasks_position ON collaboration_tasks(board_id, position);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_collaboration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_collaboration_boards_updated_at ON collaboration_boards;
CREATE TRIGGER trigger_collaboration_boards_updated_at
    BEFORE UPDATE ON collaboration_boards
    FOR EACH ROW EXECUTE FUNCTION update_collaboration_updated_at();

DROP TRIGGER IF EXISTS trigger_collaboration_tasks_updated_at ON collaboration_tasks;
CREATE TRIGGER trigger_collaboration_tasks_updated_at
    BEFORE UPDATE ON collaboration_tasks
    FOR EACH ROW EXECUTE FUNCTION update_collaboration_updated_at();
