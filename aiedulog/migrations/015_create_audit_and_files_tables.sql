-- Migration: 015_create_audit_and_files_tables
-- Description: Create security audit log, user deletion audit, and file uploads tables
-- Date: 2025-12-08

-- Security Audit Log (for core-security.ts logging)
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    success BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Deletion Audit (for admin user management)
CREATE TABLE IF NOT EXISTS user_deletion_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deleted_user_id UUID NOT NULL,
    deleted_user_email VARCHAR(255),
    deleted_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    deletion_type VARCHAR(20) NOT NULL CHECK (deletion_type IN ('soft', 'hard')),
    reason TEXT,
    content_action VARCHAR(20) NOT NULL CHECK (content_action IN ('preserve', 'anonymize', 'delete')),
    stats JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- File Uploads (for tracking uploaded files)
CREATE TABLE IF NOT EXISTS file_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(500) NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    storage_path TEXT NOT NULL,
    bucket VARCHAR(100) NOT NULL,
    uploaded_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created ON security_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_deletion_audit_deleted_by ON user_deletion_audit(deleted_by);
CREATE INDEX IF NOT EXISTS idx_user_deletion_audit_created ON user_deletion_audit(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_file_uploads_uploaded_by ON file_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_uploads_related ON file_uploads(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_created ON file_uploads(created_at DESC);
