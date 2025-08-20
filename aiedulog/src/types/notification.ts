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

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  link?: string
  is_read: boolean
  read_at?: string
  data?: Record<string, any>
  created_at: string
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

  // Generic
  [key: string]: any
}
