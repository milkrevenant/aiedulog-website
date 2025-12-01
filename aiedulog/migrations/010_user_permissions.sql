-- =============================================================================
-- Migration 010: User Permissions (세분화된 권한 시스템)
-- Created: 2025-12-01
-- Purpose: 사용자별 세부 편집 권한 관리
-- =============================================================================

-- 권한 영역 정의 테이블
CREATE TABLE IF NOT EXISTS permission_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_code VARCHAR(50) UNIQUE NOT NULL,
    area_name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE permission_areas IS '권한 영역 정의';
COMMENT ON COLUMN permission_areas.area_code IS '권한 코드 (예: posts, training_materials, research_members)';

-- 기본 권한 영역 데이터 삽입
INSERT INTO permission_areas (area_code, area_name, description, display_order) VALUES
    ('posts', '게시글 관리', '게시글 작성, 수정, 삭제', 1),
    ('comments', '댓글 관리', '댓글 수정, 삭제', 2),
    ('users', '사용자 관리', '사용자 권한 변경, 정지, 삭제', 3),
    ('training_materials', '연수자료 관리', '연수자료 등록, 수정, 삭제', 4),
    ('research_members', '연구회원 관리', '연구회 소개 페이지 멤버 관리', 5),
    ('lectures', '강의 관리', '강의 등록, 수정, 삭제', 6),
    ('reports', '신고 관리', '신고된 콘텐츠 처리', 7),
    ('notifications', '알림 관리', '시스템 알림 발송', 8),
    ('settings', '시스템 설정', '사이트 설정 변경', 9)
ON CONFLICT (area_code) DO NOTHING;

-- 사용자별 세부 권한 테이블
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    area_code VARCHAR(50) NOT NULL REFERENCES permission_areas(area_code) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT true,
    can_create BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    granted_by UUID REFERENCES user_profiles(user_id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    notes TEXT,
    UNIQUE(user_id, area_code)
);

CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_area ON user_permissions(area_code);

COMMENT ON TABLE user_permissions IS '사용자별 세부 권한';
COMMENT ON COLUMN user_permissions.can_view IS '조회 권한';
COMMENT ON COLUMN user_permissions.can_create IS '생성 권한';
COMMENT ON COLUMN user_permissions.can_edit IS '수정 권한';
COMMENT ON COLUMN user_permissions.can_delete IS '삭제 권한';
COMMENT ON COLUMN user_permissions.expires_at IS '권한 만료일 (NULL이면 무기한)';

-- 연구회 운영진 테이블 (사이트 회원 중 운영진으로 지정된 사람)
-- research_members는 소개 페이지용, 이것은 실제 사이트 운영진
CREATE TABLE IF NOT EXISTS staff_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    staff_role VARCHAR(50) NOT NULL CHECK (staff_role IN ('회장', '부회장', '운영위원', '연구위원', '일반운영진')),
    staff_title VARCHAR(100),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    appointed_at TIMESTAMPTZ DEFAULT NOW(),
    appointed_by UUID REFERENCES user_profiles(user_id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staff_members_user ON staff_members(user_id);
CREATE INDEX idx_staff_members_role ON staff_members(staff_role);
CREATE INDEX idx_staff_members_active ON staff_members(is_active) WHERE is_active = true;

COMMENT ON TABLE staff_members IS '사이트 운영진 (실제 관리 권한을 가진 회원)';
COMMENT ON COLUMN staff_members.staff_role IS '운영진 직위: 회장, 부회장, 운영위원, 연구위원, 일반운영진';
COMMENT ON COLUMN staff_members.staff_title IS '세부 직책 (예: AI교육연구팀장)';

-- 운영진 지정 시 자동으로 기본 권한 부여하는 함수
CREATE OR REPLACE FUNCTION grant_staff_default_permissions()
RETURNS TRIGGER AS $$
BEGIN
    -- 운영진 지정 시 기본적으로 모든 콘텐츠 영역에 편집 권한 부여
    IF NEW.staff_role IN ('회장', '부회장') THEN
        -- 회장/부회장은 모든 권한
        INSERT INTO user_permissions (user_id, area_code, can_view, can_create, can_edit, can_delete, granted_by)
        SELECT NEW.user_id, area_code, true, true, true, true, NEW.appointed_by
        FROM permission_areas
        ON CONFLICT (user_id, area_code) DO UPDATE SET
            can_view = true, can_create = true, can_edit = true, can_delete = true;

        -- user_profiles의 role도 업데이트
        UPDATE user_profiles SET role = 'admin' WHERE user_id = NEW.user_id;
    ELSIF NEW.staff_role IN ('운영위원', '연구위원') THEN
        -- 운영위원/연구위원은 콘텐츠 관리 권한
        INSERT INTO user_permissions (user_id, area_code, can_view, can_create, can_edit, can_delete, granted_by)
        SELECT NEW.user_id, area_code, true, true, true,
            CASE WHEN area_code IN ('posts', 'comments', 'training_materials', 'research_members', 'lectures') THEN true ELSE false END,
            NEW.appointed_by
        FROM permission_areas
        WHERE area_code NOT IN ('users', 'settings')
        ON CONFLICT (user_id, area_code) DO UPDATE SET
            can_view = true, can_create = true, can_edit = true;

        UPDATE user_profiles SET role = 'moderator' WHERE user_id = NEW.user_id;
    ELSE
        -- 일반운영진은 기본 콘텐츠 편집만
        INSERT INTO user_permissions (user_id, area_code, can_view, can_create, can_edit, can_delete, granted_by)
        SELECT NEW.user_id, area_code, true, true, true, false, NEW.appointed_by
        FROM permission_areas
        WHERE area_code IN ('posts', 'comments', 'training_materials')
        ON CONFLICT (user_id, area_code) DO UPDATE SET
            can_view = true, can_create = true, can_edit = true;

        UPDATE user_profiles SET role = 'moderator' WHERE user_id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER staff_member_permissions_trigger
    AFTER INSERT ON staff_members
    FOR EACH ROW
    EXECUTE FUNCTION grant_staff_default_permissions();

-- 운영진 해제 시 권한 회수
CREATE OR REPLACE FUNCTION revoke_staff_permissions()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_active = true AND NEW.is_active = false THEN
        -- 권한 삭제하지 않고 비활성화만 (기록 유지)
        -- 필요시 DELETE FROM user_permissions WHERE user_id = OLD.user_id;
        UPDATE user_profiles SET role = 'member' WHERE user_id = OLD.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER staff_member_deactivate_trigger
    AFTER UPDATE ON staff_members
    FOR EACH ROW
    WHEN (OLD.is_active = true AND NEW.is_active = false)
    EXECUTE FUNCTION revoke_staff_permissions();

-- 권한 확인 함수
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_area_code VARCHAR(50),
    p_action VARCHAR(10) -- 'view', 'create', 'edit', 'delete'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_role TEXT;
    v_has_permission BOOLEAN := false;
BEGIN
    -- 먼저 사용자 role 확인 (admin은 모든 권한)
    SELECT role INTO v_user_role FROM user_profiles WHERE user_id = p_user_id;

    IF v_user_role = 'super_admin' OR v_user_role = 'admin' THEN
        RETURN true;
    END IF;

    -- 세부 권한 테이블에서 확인
    SELECT
        CASE p_action
            WHEN 'view' THEN can_view
            WHEN 'create' THEN can_create
            WHEN 'edit' THEN can_edit
            WHEN 'delete' THEN can_delete
            ELSE false
        END INTO v_has_permission
    FROM user_permissions
    WHERE user_id = p_user_id
        AND area_code = p_area_code
        AND (expires_at IS NULL OR expires_at > NOW());

    RETURN COALESCE(v_has_permission, false);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_user_permission IS '사용자의 특정 영역/행동 권한 확인';

-- updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_staff_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_staff_members_updated_at
    BEFORE UPDATE ON staff_members
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_members_updated_at();
