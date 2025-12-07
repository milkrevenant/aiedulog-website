-- =============================================================================
-- Migration 011: Seed Test Admin User
-- Created: 2025-12-07
-- Purpose: 테스트 관리자 계정 생성 및 Cognito 매핑
-- =============================================================================

-- 1. 사용자 프로필 생성
INSERT INTO user_profiles (
    user_id,
    email,
    username,
    full_name,
    role,
    is_active,
    created_at
) VALUES (
    '64189d1c-6081-705d-bd6e-07e122b56600',
    'stillalice@njgs.hs.jne.kr',
    'stillalicetest',
    'Test Admin',
    'admin',
    true,
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    role = EXCLUDED.role,
    updated_at = NOW();

-- 2. Cognito 인증 방식 매핑
INSERT INTO auth_methods (
    user_id,
    provider,
    auth_provider_id,
    is_primary,
    is_verified,
    created_at
) VALUES (
    '64189d1c-6081-705d-bd6e-07e122b56600',
    'cognito',
    '64189d1c-6081-705d-bd6e-07e122b56600',
    true,
    true,
    NOW()
) ON CONFLICT (provider, auth_provider_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    is_verified = true,
    updated_at = NOW();

-- 3. 운영진 등록 (회장 역할 → 트리거가 자동으로 모든 권한 부여)
INSERT INTO staff_members (
    user_id,
    staff_role,
    staff_title,
    department,
    is_active,
    appointed_at
) VALUES (
    '64189d1c-6081-705d-bd6e-07e122b56600',
    '회장',
    '테스트 관리자',
    '개발팀',
    true,
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
    staff_role = EXCLUDED.staff_role,
    is_active = true,
    updated_at = NOW();

-- 확인용 쿼리
-- SELECT * FROM user_profiles WHERE email = 'stillalice@njgs.hs.jne.kr';
-- SELECT * FROM auth_methods WHERE auth_provider_id = '64189d1c-6081-705d-bd6e-07e122b56600';
-- SELECT * FROM staff_members WHERE user_id = '64189d1c-6081-705d-bd6e-07e122b56600';
-- SELECT * FROM user_permissions WHERE user_id = '64189d1c-6081-705d-bd6e-07e122b56600';
