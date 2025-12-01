-- 008_research_members.sql
-- 연구회 멤버 테이블

CREATE TABLE IF NOT EXISTS research_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    position VARCHAR(50) NOT NULL, -- '회장', '부회장', '중심연구회원'
    role_title VARCHAR(100), -- 직책 (예: 'AI교육연구팀장')
    organization VARCHAR(200) NOT NULL, -- 소속 학교/기관
    specialty VARCHAR(500), -- 전문 분야
    photo_url TEXT, -- 프로필 사진 URL
    display_order INT DEFAULT 0, -- 표시 순서
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_research_members_position ON research_members(position);
CREATE INDEX IF NOT EXISTS idx_research_members_display_order ON research_members(display_order);
CREATE INDEX IF NOT EXISTS idx_research_members_active ON research_members(is_active);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_research_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_research_members_updated_at ON research_members;
CREATE TRIGGER trigger_research_members_updated_at
    BEFORE UPDATE ON research_members
    FOR EACH ROW
    EXECUTE FUNCTION update_research_members_updated_at();

COMMENT ON TABLE research_members IS '연구회 멤버 정보';
COMMENT ON COLUMN research_members.position IS '직위: 회장, 부회장, 중심연구회원';
COMMENT ON COLUMN research_members.role_title IS '담당 직책/팀';
COMMENT ON COLUMN research_members.specialty IS '전문 분야';
