'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSession } from 'next-auth/react'
import { getUnreadNotificationCount } from '@/lib/notifications'
import { IconButton, Badge, Menu, MenuItem, Typography, Box, Divider, Button } from '@mui/material'
import NotificationsIcon from '@mui/icons-material/Notifications'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import { Notification } from '@/types/notification'
import { getNotificationIcon, getNotificationColor, getRelativeTime } from '@/lib/notifications'
import FavoriteIcon from '@mui/icons-material/Favorite'
import CommentIcon from '@mui/icons-material/Comment'
import ReplyIcon from '@mui/icons-material/Reply'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail'
import InfoIcon from '@mui/icons-material/Info'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CelebrationIcon from '@mui/icons-material/Celebration'

const iconComponents: Record<string, React.ElementType> = {
  Favorite: FavoriteIcon,
  Comment: CommentIcon,
  Reply: ReplyIcon,
  PersonAdd: PersonAddIcon,
  AlternateEmail: AlternateEmailIcon,
  Info: InfoIcon,
  AdminPanelSettings: AdminPanelSettingsIcon,
  CheckCircle: CheckCircleIcon,
  Celebration: CelebrationIcon,
  Notifications: NotificationsIcon,
}

export default function NotificationIcon() {
  const router = useRouter()
  const supabase = createClient()
  const { data: session } = useSession()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  // 읽지 않은 알림 수 가져오기
  const fetchUnreadCount = async () => {
    try {
      const providerUserId = (session?.user as any)?.sub || (session?.user as any)?.id
      const count = await getUnreadNotificationCount(providerUserId)
      setUnreadCount(count)
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }

  // 최근 알림 가져오기
  const fetchRecentNotifications = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (data) {
        setNotifications(data)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // 실시간 구독 설정
  useEffect(() => {
    fetchUnreadCount()

    // 실시간 알림 구독
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          // 새 알림이 추가되면 카운트 업데이트
          fetchUnreadCount()
          // 알림 목록에 새 알림 추가
          if (payload.new) {
            setNotifications((prev) => [payload.new as Notification, ...prev.slice(0, 4)])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          // 알림이 읽혔을 때 카운트 업데이트
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [session])

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
    fetchRecentNotifications()
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleNotificationClick = async (notification: Notification) => {
    // 읽음 처리
    if (!notification.is_read) {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notification.id)

      fetchUnreadCount()
    }

    // 링크가 있으면 이동
    if (notification.link) {
      router.push(notification.link)
    }

    handleClose()
  }

  const handleViewAll = () => {
    router.push('/notifications')
    handleClose()
  }

  const open = Boolean(anchorEl)

  const getIcon = (type: string) => {
    const iconName = getNotificationIcon(type as any)
    const IconComponent = iconComponents[iconName] || NotificationsIcon
    return IconComponent
  }

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          color: unreadCount > 0 ? 'primary.main' : 'text.secondary',
        }}
      >
        <Badge badgeContent={unreadCount} color="error">
          {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 360,
            maxHeight: 480,
            mt: 1.5,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="h6" fontWeight="bold">
            알림
          </Typography>
          {unreadCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              읽지 않은 알림 {unreadCount}개
            </Typography>
          )}
        </Box>

        <Divider />

        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              로딩 중...
            </Typography>
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <NotificationsNoneIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              새로운 알림이 없습니다
            </Typography>
          </Box>
        ) : (
          <>
            {notifications.map((notification) => {
              const IconComponent = getIcon(notification.type)
              const color = getNotificationColor(notification.type)

              return (
                <MenuItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    backgroundColor: !notification.is_read ? 'action.hover' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'action.selected',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', width: '100%', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: `${color}.lighter`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <IconComponent sx={{ fontSize: 20, color: `${color}.main` }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        fontWeight={!notification.is_read ? 'bold' : 'normal'}
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {notification.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {getRelativeTime(notification.created_at)}
                      </Typography>
                    </Box>
                    {!notification.is_read && (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: 'primary.main',
                          flexShrink: 0,
                          alignSelf: 'center',
                        }}
                      />
                    )}
                  </Box>
                </MenuItem>
              )
            })}
          </>
        )}

        <Divider />

        <Box sx={{ p: 1 }}>
          <Button fullWidth size="small" onClick={handleViewAll}>
            모든 알림 보기
          </Button>
        </Box>
      </Menu>
    </>
  )
}
