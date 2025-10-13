import { createClient } from '@/lib/supabase/client'
import { NotificationType, Notification } from '@/types/notification'

// 알림 생성 함수 (서버사이드용)
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  data?: Record<string, any>
) {
  const supabase = createClient()

  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message,
    link,
    data,
  })

  if (error) {
    console.error('Failed to create notification:', error)
    throw error
  }
}

// 알림 목록 가져오기
export async function getNotifications(limit = 20, offset = 0) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Failed to fetch notifications:', error)
    throw error
  }

  return data as Notification[]
}

// 읽지 않은 알림 수 가져오기
export async function getUnreadNotificationCount(providerUserId?: string) {
  const supabase = createClient()

  try {
    if (!providerUserId) {
      // Without Supabase auth, require explicit providerUserId (e.g., Cognito sub)
      return 0
    }

    // First get the user's user_id from auth_methods table
    const { data: authMethod, error: authError } = await supabase
      .from('auth_methods')
      .select('user_id')
      .eq('provider_user_id', providerUserId)
      .single()
    
    if (authError || !authMethod) {
      console.warn('No user found for auth, returning 0 notifications')
      return 0
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authMethod.user_id)
      .eq('is_read', false)

    if (error) {
      console.error('Failed to fetch unread count:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('Error in getUnreadNotificationCount:', error)
    return 0
  }
}

// 알림 읽음 처리
export async function markNotificationAsRead(notificationId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)

  if (error) {
    console.error('Failed to mark notification as read:', error)
    throw error
  }
}

// 모든 알림 읽음 처리
export async function markAllNotificationsAsRead(providerUserId?: string) {
  const supabase = createClient()
  if (!providerUserId) throw new Error('User not authenticated')

  // Map provider user (e.g., Cognito sub) to internal user_id
  const { data: authMethod, error: authError } = await supabase
    .from('auth_methods')
    .select('user_id')
    .eq('provider_user_id', providerUserId)
    .single()
  if (authError || !authMethod) throw new Error('User not found')

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', authMethod.user_id)
    .eq('is_read', false)

  if (error) {
    console.error('Failed to mark all notifications as read:', error)
    throw error
  }
}

// 알림 삭제
export async function deleteNotification(notificationId: string) {
  const supabase = createClient()

  const { error } = await supabase.from('notifications').delete().eq('id', notificationId)

  if (error) {
    console.error('Failed to delete notification:', error)
    throw error
  }
}

// 권한 변경 알림 생성 (관리자용)
export async function notifyRoleChange(userId: string, newRole: string) {
  const roleLabels: Record<string, string> = {
    admin: '관리자',
    moderator: '운영진',
    verified: '인증교사',
    member: '일반회원',
  }

  const roleLabel = roleLabels[newRole] || '일반회원'

  await createNotification(
    userId,
    'role_change',
    '권한 변경',
    `회원님의 권한이 ${roleLabel}(으)로 변경되었습니다.`,
    undefined,
    { new_role: newRole, role_label: roleLabel }
  )
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
    content_published: 'Publish',
    content_updated: 'Edit',
    security_alert: 'Security',
    admin_notification: 'AdminPanelSettings',
    marketing_notification: 'Campaign',
    appointment_created: 'Event',
    appointment_confirmed: 'EventAvailable',
    appointment_reminder_24h: 'Schedule',
    appointment_reminder_1h: 'Schedule',
    appointment_reminder_15m: 'Schedule',
    appointment_cancelled: 'EventBusy',
    appointment_rescheduled: 'Update',
    appointment_completed: 'CheckCircle',
    appointment_no_show: 'EventBusy',
    instructor_new_booking: 'Person',
    waitlist_available: 'NotificationImportant',
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
    content_published: 'success',
    content_updated: 'info',
    security_alert: 'error',
    admin_notification: 'warning',
    marketing_notification: 'primary',
    appointment_created: 'info',
    appointment_confirmed: 'success',
    appointment_reminder_24h: 'info',
    appointment_reminder_1h: 'warning',
    appointment_reminder_15m: 'error',
    appointment_cancelled: 'error',
    appointment_rescheduled: 'warning',
    appointment_completed: 'success',
    appointment_no_show: 'error',
    instructor_new_booking: 'primary',
    waitlist_available: 'success',
  }

  return colorMap[type] || 'primary'
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
