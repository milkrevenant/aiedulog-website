// 권한 관리 시스템
export type UserRole = 'admin' | 'moderator' | 'verified' | 'member'

export type Permission = 
  // Admin 권한
  | 'manage_users'
  | 'manage_content'
  | 'manage_columns'
  | 'manage_settings'
  | 'view_analytics'
  | 'delete_any_post'
  | 'delete_any_comment'
  | 'pin_posts'
  | 'send_announcements'
  // Moderator 권한
  | 'manage_reports'
  // Verified 권한
  | 'write_columns'
  | 'create_lectures'
  | 'upload_resources'
  | 'create_job_posts'
  | 'increased_upload_limit'
  // Member 권한
  | 'create_posts'
  | 'create_comments'
  | 'like_posts'
  | 'bookmark_posts'
  | 'view_content'
  | 'edit_own_content'
  | 'delete_own_content'

// 역할별 권한 매핑
export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    'manage_users',
    'manage_content',
    'manage_columns',
    'manage_settings',
    'view_analytics',
    'delete_any_post',
    'delete_any_comment',
    'pin_posts',
    'send_announcements',
    'manage_reports',
    'write_columns',
    'create_lectures',
    'upload_resources',
    'create_job_posts',
    'increased_upload_limit',
    'create_posts',
    'create_comments',
    'like_posts',
    'bookmark_posts',
    'view_content',
    'edit_own_content',
    'delete_own_content',
  ],
  moderator: [
    'manage_content',
    'delete_any_post',
    'delete_any_comment',
    'pin_posts',
    'manage_reports',
    'create_posts',
    'create_comments',
    'like_posts',
    'bookmark_posts',
    'view_content',
    'edit_own_content',
    'delete_own_content',
    'upload_resources',
  ],
  verified: [
    'write_columns',
    'create_lectures',
    'upload_resources',
    'create_job_posts',
    'increased_upload_limit',
    'create_posts',
    'create_comments',
    'like_posts',
    'bookmark_posts',
    'view_content',
    'edit_own_content',
    'delete_own_content',
  ],
  member: [
    'create_posts',
    'create_comments',
    'like_posts',
    'bookmark_posts',
    'view_content',
    'edit_own_content',
    'delete_own_content',
  ],
}

// 권한 확인 함수
export function hasPermission(userRole: UserRole | null, permission: Permission): boolean {
  if (!userRole) return false
  return rolePermissions[userRole].includes(permission)
}

// 역할 레벨 (높을수록 권한이 많음)
export const roleLevel: Record<UserRole, number> = {
  admin: 4,
  moderator: 3,
  verified: 2,
  member: 1,
}

// 역할 비교 함수
export function hasHigherRole(userRole: UserRole, targetRole: UserRole): boolean {
  return roleLevel[userRole] > roleLevel[targetRole]
}

// 역할 표시 정보
export const roleDisplay: Record<UserRole, { label: string; color: string; description: string }> = {
  admin: {
    label: '관리자',
    color: '#f44336',
    description: '시스템 전체 관리 권한',
  },
  moderator: {
    label: '운영진',
    color: '#ff9800',
    description: '커뮤니티 운영 및 관리',
  },
  verified: {
    label: '인증회원',
    color: '#4caf50',
    description: '인증된 교사 회원',
  },
  member: {
    label: '일반회원',
    color: '#2196f3',
    description: '기본 회원',
  },
}

// 권한 설명
export const permissionDisplay: Record<Permission, { label: string; description: string }> = {
  // Admin
  manage_users: { label: '사용자 관리', description: '사용자 역할 및 권한 관리' },
  manage_content: { label: '콘텐츠 관리', description: '모든 콘텐츠 수정/삭제' },
  manage_columns: { label: '칼럼 관리', description: '칼럼 작성자 인증 관리' },
  manage_settings: { label: '설정 관리', description: '시스템 설정 변경' },
  view_analytics: { label: '통계 조회', description: '사이트 통계 및 분석 조회' },
  delete_any_post: { label: '게시글 삭제', description: '모든 게시글 삭제 가능' },
  delete_any_comment: { label: '댓글 삭제', description: '모든 댓글 삭제 가능' },
  pin_posts: { label: '게시글 고정', description: '중요 게시글 상단 고정' },
  send_announcements: { label: '공지 발송', description: '전체 공지사항 발송' },
  // Moderator
  manage_reports: { label: '신고 관리', description: '신고된 콘텐츠 처리' },
  // Verified
  write_columns: { label: '칼럼 작성', description: '전문 칼럼 작성 권한' },
  create_lectures: { label: '강의 등록', description: '강의 정보 등록' },
  upload_resources: { label: '자료 업로드', description: '교육 자료 업로드' },
  create_job_posts: { label: '구인구직 게시', description: '구인구직 정보 게시' },
  increased_upload_limit: { label: '업로드 용량 증가', description: '파일 업로드 용량 제한 증가' },
  // Member
  create_posts: { label: '게시글 작성', description: '게시글 작성 권한' },
  create_comments: { label: '댓글 작성', description: '댓글 작성 권한' },
  like_posts: { label: '좋아요', description: '게시글 좋아요 표시' },
  bookmark_posts: { label: '북마크', description: '게시글 북마크 저장' },
  view_content: { label: '콘텐츠 조회', description: '게시글 및 자료 조회' },
  edit_own_content: { label: '자신의 콘텐츠 수정', description: '본인 작성 콘텐츠 수정' },
  delete_own_content: { label: '자신의 콘텐츠 삭제', description: '본인 작성 콘텐츠 삭제' },
}