export type NotificationType =
  | 'post_like'
  | 'post_comment'
  | 'comment_reply'
  | 'follow'
  | 'mention'
  | 'system'
  | 'role_change'
  | 'post_approved'
  | 'welcome'
  | 'schedule_created'
  | 'schedule_executed'
  | 'schedule_failed'
  | 'schedule_reminder'
  | 'content_published'
  | 'content_updated'
  | 'security_alert'
  | 'admin_notification'
  | 'marketing_notification'
  // Scheduling-specific notifications
  | 'appointment_created'
  | 'appointment_confirmed'
  | 'appointment_reminder_24h'
  | 'appointment_reminder_1h'
  | 'appointment_reminder_15m'
  | 'appointment_cancelled'
  | 'appointment_rescheduled'
  | 'appointment_completed'
  | 'appointment_no_show'
  | 'instructor_new_booking'
  | 'waitlist_available'

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms' | 'webhook';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical' | 'urgent';

export type NotificationCategory = 'schedule' | 'content' | 'system' | 'security' | 'user' | 'admin' | 'marketing';

export type DeliveryStatus = 'pending' | 'processing' | 'delivered' | 'failed' | 'bounced' | 'clicked' | 'expired';

export interface Notification {
  id: string
  user_id: string
  user_group?: string
  type: NotificationType
  category: NotificationCategory
  priority: NotificationPriority
  title: string
  message: string
  link?: string
  is_read: boolean
  is_archived: boolean
  read_at?: string
  archived_at?: string
  channels: NotificationChannel[]
  schedule_id?: string
  related_content_type?: string
  related_content_id?: string
  action_data?: Record<string, any>
  metadata?: Record<string, any>
  delivery_attempts: number
  max_delivery_attempts: number
  scheduled_for?: string
  expires_at?: string
  created_at: string
  updated_at: string
  created_by?: string
}

export interface NotificationData {
  // For post_like
  post_id?: string
  post_title?: string
  liker_id?: string
  liker_name?: string

  // For post_comment and comment_reply
  comment_id?: string
  commenter_id?: string
  commenter_name?: string

  // For role_change
  new_role?: string
  role_label?: string

  // For follow
  follower_id?: string
  follower_name?: string

  // For mention
  mentioner_id?: string
  mentioner_name?: string

  // For scheduling
  schedule_id?: string
  content_title?: string
  schedule_type?: string
  scheduled_time?: string
  error_message?: string

  // For appointment notifications
  appointment_id?: string
  appointment_reference?: string
  appointment_title?: string
  appointment_date?: string
  appointment_time?: string
  appointment_duration?: string
  appointment_type?: string
  user_name?: string
  user_email?: string
  instructor_name?: string
  instructor_email?: string
  meeting_type?: string
  meeting_link?: string
  meeting_location?: string
  cancellation_reason?: string
  reschedule_from?: string
  rating?: number
  feedback?: string
  requires_confirmation?: boolean
  preparation_notes?: string

  // For content management
  content_id?: string
  content_type?: string
  author_id?: string
  author_name?: string

  // Template variables
  template_key?: string
  template_data?: Record<string, any>

  // Generic
  [key: string]: any
}

export interface NotificationTemplate {
  id: string
  template_key: string
  template_name: string
  template_type: 'email_html' | 'email_text' | 'push_notification' | 'in_app_notification' | 'sms_message' | 'webhook_payload'
  category: NotificationCategory
  subject_template?: string
  content_template: string
  variables: Record<string, string>
  language: string
  is_active: boolean
  created_at: string
  updated_at: string
  created_by?: string
}

export interface NotificationPreferences {
  id: string
  user_id: string
  category: NotificationCategory
  channels: NotificationChannel[]
  quiet_hours_start?: string
  quiet_hours_end?: string
  timezone: string
  digest_frequency: 'immediate' | 'daily' | 'weekly' | 'never'
  max_notifications_per_hour: number
  schedule_notifications: boolean
  content_notifications: boolean
  system_notifications: boolean
  marketing_notifications: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  
  // Scheduling-specific preferences
  appointment_confirmations?: boolean
  appointment_reminders_24h?: boolean
  appointment_reminders_1h?: boolean
  appointment_reminders_15m?: boolean
  appointment_changes?: boolean
  instructor_notifications?: boolean
  waitlist_notifications?: boolean
}

export interface NotificationDelivery {
  id: string
  notification_id: string
  channel: NotificationChannel
  recipient: string
  status: DeliveryStatus
  external_id?: string
  provider_name?: string
  sent_at?: string
  delivered_at?: string
  opened_at?: string
  clicked_at?: string
  failed_at?: string
  error_message?: string
  retry_count: number
  next_retry_at?: string
  provider_response?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface NotificationAnalytics {
  id: string
  date: string
  hour?: number
  category?: NotificationCategory
  channel?: NotificationChannel
  template_key?: string
  total_sent: number
  total_delivered: number
  total_opened: number
  total_clicked: number
  total_failed: number
  total_bounced: number
  avg_delivery_time_seconds: number
  delivery_rate: number
  open_rate: number
  click_rate: number
  created_at: string
  updated_at: string
}

// 알림 타입별 아이콘 이름 반환
export function getNotificationIcon(type: NotificationType): string {
  const iconMap: Record<NotificationType, string> = {
    post_like: 'Favorite',
    post_comment: 'Comment',
    comment_reply: 'Reply',
    follow: 'PersonAdd',
    mention: 'AlternateEmail',
    system: 'Info',
    role_change: 'AdminPanelSettings',
    post_approved: 'CheckCircle',
    welcome: 'Celebration',
    schedule_created: 'Schedule',
    schedule_executed: 'CheckCircle',
    schedule_failed: 'Error',
    schedule_reminder: 'Alarm',
    // Scheduling-specific icons
    appointment_created: 'Event',
    appointment_confirmed: 'CheckCircle',
    appointment_reminder_24h: 'Schedule',
    appointment_reminder_1h: 'Alarm',
    appointment_reminder_15m: 'NotificationImportant',
    appointment_cancelled: 'Cancel',
    appointment_rescheduled: 'Update',
    appointment_completed: 'TaskAlt',
    appointment_no_show: 'PersonOff',
    instructor_new_booking: 'PersonAdd',
    waitlist_available: 'Notifications',
    content_published: 'Publish',
    content_updated: 'Edit',
    security_alert: 'Security',
    admin_notification: 'AdminPanelSettings',
    marketing_notification: 'Campaign',
  }

  return iconMap[type] || 'Notifications'
}

// 알림 타입별 색상 반환
export function getNotificationColor(
  type: NotificationType
): 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' {
  const colorMap: Record<
    NotificationType,
    'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'
  > = {
    post_like: 'error',
    post_comment: 'primary',
    comment_reply: 'info',
    follow: 'success',
    mention: 'secondary',
    system: 'info',
    role_change: 'warning',
    post_approved: 'success',
    welcome: 'primary',
    schedule_created: 'info',
    schedule_executed: 'success',
    schedule_failed: 'error',
    schedule_reminder: 'warning',
    // Scheduling-specific colors
    appointment_created: 'success',
    appointment_confirmed: 'success',
    appointment_reminder_24h: 'info',
    appointment_reminder_1h: 'warning',
    appointment_reminder_15m: 'error',
    appointment_cancelled: 'error',
    appointment_rescheduled: 'warning',
    appointment_completed: 'success',
    appointment_no_show: 'error',
    instructor_new_booking: 'primary',
    waitlist_available: 'warning',
    content_published: 'success',
    content_updated: 'info',
    security_alert: 'error',
    admin_notification: 'warning',
    marketing_notification: 'secondary',
  }

  return colorMap[type] || 'primary'
}

// 우선순위별 색상 반환
export function getPriorityColor(
  priority: NotificationPriority
): 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' {
  const colorMap: Record<
    NotificationPriority,
    'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'
  > = {
    low: 'info',
    normal: 'primary',
    high: 'warning',
    critical: 'error',
    urgent: 'error',
  }

  return colorMap[priority] || 'primary'
}

// 카테고리별 색상 반환
export function getCategoryColor(
  category: NotificationCategory
): 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' {
  const colorMap: Record<
    NotificationCategory,
    'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'
  > = {
    schedule: 'info',
    content: 'primary',
    system: 'info',
    security: 'error',
    user: 'success',
    admin: 'warning',
    marketing: 'secondary',
  }

  return colorMap[category] || 'primary'
}

// 상대 시간 표시
export function getRelativeTime(date: string): string {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  if (diffDay < 7) return `${diffDay}일 전`
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}주 전`
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}개월 전`
  return `${Math.floor(diffDay / 365)}년 전`
}