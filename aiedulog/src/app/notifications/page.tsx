'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/hooks'
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationIcon,
  getNotificationColor,
  getRelativeTime,
} from '@/lib/notifications'
import AppHeader from '@/components/AppHeader'
import {
  Container,
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Button,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material'
import { Notification } from '@/types/notification'
import FavoriteIcon from '@mui/icons-material/Favorite'
import CommentIcon from '@mui/icons-material/Comment'
import ReplyIcon from '@mui/icons-material/Reply'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail'
import InfoIcon from '@mui/icons-material/Info'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CelebrationIcon from '@mui/icons-material/Celebration'
import NotificationsIcon from '@mui/icons-material/Notifications'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import DeleteIcon from '@mui/icons-material/Delete'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import RefreshIcon from '@mui/icons-material/Refresh'
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead'
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread'

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

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`notification-tabpanel-${index}`}
      aria-labelledby={`notification-tab-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  )
}

export default function NotificationsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { user, profile, loading: authLoading, isAuthenticated } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tabValue, setTabValue] = useState(0)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)

  // 알림 목록 가져오기
  const fetchNotifications = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getNotifications(50, 0)
      setNotifications(data)
    } catch (err: any) {
      setError('알림을 불러오는 중 오류가 발생했습니다.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 인증 체크 및 실시간 구독 설정
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (isAuthenticated && !authLoading) {
      fetchNotifications()

      // 실시간 알림 구독
      const subscription = supabase
        .channel('notifications-page')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
          },
          () => {
            // 변경사항이 있으면 목록 새로고침
            fetchNotifications()
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [authLoading, isAuthenticated])

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleNotificationClick = async (notification: Notification) => {
    // 읽지 않은 알림이면 읽음 처리
    if (!notification.is_read) {
      try {
        await markNotificationAsRead(notification.id)
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        )
      } catch (err) {
        console.error('Failed to mark as read:', err)
      }
    }

    // 링크가 있으면 이동
    if (notification.link) {
      router.push(notification.link)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (err) {
      setError('알림 읽음 처리 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotification(id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch (err) {
      setError('알림 삭제 중 오류가 발생했습니다.')
    }
    handleMenuClose()
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, notification: Notification) => {
    setAnchorEl(event.currentTarget)
    setSelectedNotification(notification)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedNotification(null)
  }

  const getIcon = (type: string) => {
    const iconName = getNotificationIcon(type as any)
    const IconComponent = iconComponents[iconName] || NotificationsIcon
    return IconComponent
  }

  // 필터링된 알림
  const unreadNotifications = notifications.filter((n) => !n.is_read)
  const readNotifications = notifications.filter((n) => n.is_read)

  const renderNotificationList = (notificationList: Notification[]) => {
    if (notificationList.length === 0) {
      return (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <NotificationsNoneIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            알림이 없습니다
          </Typography>
        </Box>
      )
    }

    return (
      <List sx={{ p: 0 }}>
        {notificationList.map((notification, index) => {
          const IconComponent = getIcon(notification.type)
          const color = getNotificationColor(notification.type)

          return (
            <React.Fragment key={notification.id}>
              <ListItem
                sx={{
                  p: 0,
                }}
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMenuOpen(e, notification)
                    }}
                    sx={{ mr: 2 }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                }
              >
                <ListItemButton
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    py: 2,
                    px: 3,
                    backgroundColor: !notification.is_read ? 'action.hover' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'action.selected',
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: `${color}.lighter`,
                        color: `${color}.main`,
                      }}
                    >
                      <IconComponent />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="body1"
                          fontWeight={!notification.is_read ? 'bold' : 'normal'}
                        >
                          {notification.title}
                        </Typography>
                        {!notification.is_read && (
                          <Chip label="새 알림" size="small" color="primary" sx={{ height: 20 }} />
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="text.primary">
                          {notification.message}
                        </Typography>
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mt: 0.5 }}
                        >
                          {getRelativeTime(notification.created_at)}
                        </Typography>
                      </>
                    }
                  />
                </ListItemButton>
              </ListItem>
              {index < notificationList.length - 1 && <Divider />}
            </React.Fragment>
          )
        })}
      </List>
    )
  }

  // Show loading state while checking authentication
  if (authLoading) {
    return <CircularProgress />
  }

  // Show unauthenticated state if user is not logged in
  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <>
      <AppHeader user={user} profile={profile} />
      <Container maxWidth="md" sx={{ mt: 2, mb: 4 }}>
        <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          {/* 헤더 */}
          <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography variant="h4" fontWeight="bold">
                알림
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="새로고침">
                  <IconButton onClick={fetchNotifications} disabled={loading}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
                {unreadNotifications.length > 0 && (
                  <Button
                    startIcon={<DoneAllIcon />}
                    onClick={handleMarkAllAsRead}
                    disabled={loading}
                  >
                    모두 읽음
                  </Button>
                )}
              </Box>
            </Box>

            {/* 탭 */}
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    전체
                    {notifications.length > 0 && <Chip label={notifications.length} size="small" />}
                  </Box>
                }
              />
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    읽지 않음
                    {unreadNotifications.length > 0 && (
                      <Chip label={unreadNotifications.length} size="small" color="primary" />
                    )}
                  </Box>
                }
              />
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    읽음
                    {readNotifications.length > 0 && (
                      <Chip label={readNotifications.length} size="small" />
                    )}
                  </Box>
                }
              />
            </Tabs>
          </Box>

          {/* 에러 메시지 */}
          {error && (
            <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* 로딩 */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* 전체 탭 */}
              <TabPanel value={tabValue} index={0}>
                {renderNotificationList(notifications)}
              </TabPanel>

              {/* 읽지 않음 탭 */}
              <TabPanel value={tabValue} index={1}>
                {renderNotificationList(unreadNotifications)}
              </TabPanel>

              {/* 읽음 탭 */}
              <TabPanel value={tabValue} index={2}>
                {renderNotificationList(readNotifications)}
              </TabPanel>
            </>
          )}
        </Paper>
      </Container>

      {/* 개별 알림 메뉴 */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        {selectedNotification && !selectedNotification.is_read && (
          <MenuItem
            onClick={async () => {
              await markNotificationAsRead(selectedNotification.id)
              setNotifications((prev) =>
                prev.map((n) => (n.id === selectedNotification.id ? { ...n, is_read: true } : n))
              )
              handleMenuClose()
            }}
          >
            <MarkEmailReadIcon sx={{ mr: 1 }} />
            읽음으로 표시
          </MenuItem>
        )}
        <MenuItem
          onClick={() => selectedNotification && handleDeleteNotification(selectedNotification.id)}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          삭제
        </MenuItem>
      </Menu>
    </>
  )
}
