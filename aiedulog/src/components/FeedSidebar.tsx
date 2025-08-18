'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Stack,
  Avatar,
  Chip,
  IconButton,
  Drawer,
  useTheme,
  alpha,
  Collapse
} from '@mui/material'
import {
  Home,
  Forum,
  School,
  TrendingUp,
  Work,
  Notifications,
  BookmarkBorder,
  Settings,
  Dashboard,
  AdminPanelSettings,
  Menu as MenuIcon,
  Close,
  Chat,
  Article,
  Group,
  Person,
  ExpandLess,
  ExpandMore,
  Event
} from '@mui/icons-material'

interface FeedSidebarProps {
  user: any
  profile: any
  mobileOpen?: boolean
  onMobileToggle?: () => void
  isStatic?: boolean
}

export default function FeedSidebar({ user, profile, mobileOpen = false, onMobileToggle, isStatic = false }: FeedSidebarProps) {
  const router = useRouter()
  const theme = useTheme()
  const [educationOpen, setEducationOpen] = useState(false)
  const [jobOpen, setJobOpen] = useState(false)

  const menuItems = [
    { 
      label: '홈', 
      icon: <Home />, 
      href: '/feed',
      color: 'primary' as const
    },
    { 
      label: '자유게시판', 
      icon: <Forum />, 
      href: '/board/general',
      color: 'info' as const
    },
    { 
      label: '교육 자료실', 
      icon: <School />, 
      href: '/board/education/all',
      color: 'success' as const,
      subItems: [
        { label: '전체', href: '/board/education/all' },
        { label: '초등학교', href: '/board/education/ele' },
        { label: '중학교', href: '/board/education/mid' },
        { label: '고등학교', href: '/board/education/high' },
        { label: '공통', href: '/board/education/common' }
      ]
    },
    { 
      label: '에듀테크 트렌드', 
      icon: <TrendingUp />, 
      href: '/board/tech',
      color: 'warning' as const
    },
    { 
      label: '구인구직', 
      icon: <Work />, 
      href: '/board/job/all',
      color: 'error' as const,
      subItems: [
        { label: '전체', href: '/board/job/all' },
        { label: '구인', href: '/board/job/hiring' },
        { label: '구직', href: '/board/job/seeking' }
      ]
    },
    { 
      label: '강의 홍보', 
      icon: <Event />, 
      href: '/board/lectures',
      color: 'secondary' as const
    },
  ]

  const utilityItems = [
    { 
      label: '채팅', 
      icon: <Chat />, 
      href: '/chat' 
    },
    { 
      label: '알림', 
      icon: <Notifications />, 
      href: '/notifications' 
    },
    { 
      label: '북마크', 
      icon: <BookmarkBorder />, 
      href: '/bookmarks' 
    },
  ]

  const profileItems = [
    { 
      label: '마이페이지', 
      icon: <Dashboard />, 
      href: '/dashboard' 
    },
    { 
      label: '프로필 설정', 
      icon: <Settings />, 
      href: '/settings/profile' 
    },
  ]

  // 관리자 메뉴
  const adminItems = (profile?.role === 'admin' || profile?.role === 'moderator') ? [
    { 
      label: '관리자 대시보드', 
      icon: <AdminPanelSettings />, 
      href: '/admin',
      color: 'error' as const
    },
    { 
      label: '사용자 관리', 
      icon: <Group />, 
      href: '/admin/users',
      color: 'error' as const
    },
  ] : []

  const sidebarContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 프로필 섹션 */}
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar
            src={profile?.avatar_url || undefined}
            sx={{ 
              width: 48, 
              height: 48,
              bgcolor: profile?.avatar_url ? 'transparent' : 'primary.main'
            }}
          >
            {!profile?.avatar_url && profile?.email?.[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight="bold" noWrap>
              {profile?.nickname || profile?.email?.split('@')[0]}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {profile?.email}
            </Typography>
          </Box>
        </Stack>
        
        {/* 역할 배지 */}
        <Box sx={{ mt: 2 }}>
          {profile?.role === 'admin' && (
            <Chip label="관리자" color="error" size="small" />
          )}
          {profile?.role === 'moderator' && (
            <Chip label="운영진" color="warning" size="small" />
          )}
          {profile?.role === 'verified' && (
            <Chip label="인증 교사" color="success" size="small" />
          )}
          {profile?.role === 'member' && (
            <Chip label="일반 회원" color="default" size="small" />
          )}
        </Box>
      </Box>

      <Divider />

      {/* 메뉴 리스트 */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {/* 메인 메뉴 */}
        <List sx={{ px: 1, py: 1 }}>
          {menuItems.map((item) => (
            <Box key={item.href}>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => {
                    if (item.subItems) {
                      if (item.label === '교육 자료실') {
                        setEducationOpen(!educationOpen)
                      } else if (item.label === '구인구직') {
                        setJobOpen(!jobOpen)
                      }
                    } else {
                      router.push(item.href)
                      onMobileToggle?.()
                    }
                  }}
                  sx={{
                    borderRadius: 2,
                    '&:hover': {
                      bgcolor: alpha(theme.palette[item.color].main, 0.08)
                    }
                  }}
                >
                  <ListItemIcon sx={{ color: `${item.color}.main`, minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500
                    }}
                  />
                  {item.subItems && (
                    item.label === '교육 자료실' 
                      ? (educationOpen ? <ExpandLess /> : <ExpandMore />)
                      : item.label === '구인구직'
                      ? (jobOpen ? <ExpandLess /> : <ExpandMore />)
                      : null
                  )}
                </ListItemButton>
              </ListItem>
              {item.subItems && (
                <Collapse 
                  in={item.label === '교육 자료실' ? educationOpen : item.label === '구인구직' ? jobOpen : false} 
                  timeout="auto" 
                  unmountOnExit>
                  <List component="div" disablePadding>
                    {item.subItems.map((subItem) => (
                      <ListItem key={subItem.href} disablePadding sx={{ pl: 2 }}>
                        <ListItemButton
                          onClick={() => {
                            router.push(subItem.href)
                            onMobileToggle?.()
                          }}
                          sx={{
                            borderRadius: 2,
                            py: 0.5,
                            '&:hover': {
                              bgcolor: alpha(theme.palette[item.color].main, 0.04)
                            }
                          }}
                        >
                          <ListItemText 
                            primary={subItem.label}
                            primaryTypographyProps={{
                              fontSize: '0.85rem'
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              )}
            </Box>
          ))}
        </List>

        <Divider sx={{ mx: 2 }} />

        {/* 유틸리티 메뉴 */}
        <List sx={{ px: 1, py: 1 }}>
          {utilityItems.map((item) => (
            <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  router.push(item.href)
                  onMobileToggle?.()
                }}
                sx={{ borderRadius: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.9rem'
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ mx: 2 }} />

        {/* 프로필 메뉴 */}
        <List sx={{ px: 1, py: 1 }}>
          {profileItems.map((item) => (
            <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  router.push(item.href)
                  onMobileToggle?.()
                }}
                sx={{ borderRadius: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.9rem'
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {/* 관리자 메뉴 */}
        {adminItems.length > 0 && (
          <>
            <Divider sx={{ mx: 2 }} />
            <List sx={{ px: 1, py: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ px: 2, py: 1, display: 'block', fontWeight: 600 }}
              >
                관리
              </Typography>
              {adminItems.map((item) => (
                <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => {
                      router.push(item.href)
                      onMobileToggle?.()
                    }}
                    sx={{ 
                      borderRadius: 2,
                      '&:hover': {
                        bgcolor: alpha(theme.palette.error.main, 0.08)
                      }
                    }}
                  >
                    <ListItemIcon sx={{ color: 'error.main', minWidth: 40 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: '0.9rem',
                        color: 'error.main'
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Box>

      {/* 하단 정보 */}
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          © 2025 AIedulog
        </Typography>
      </Box>
    </Box>
  )

  // 정적 모드 (데스크탑/태블릿용)
  if (isStatic) {
    return sidebarContent
  }

  // 모바일 Drawer 모드
  return (
    <Drawer
      variant="temporary"
      anchor="left"
      open={mobileOpen}
      onClose={onMobileToggle}
      ModalProps={{
        keepMounted: true // 모바일 성능 향상
      }}
      sx={{
        '& .MuiDrawer-paper': { 
          boxSizing: 'border-box', 
          width: 260,
          pt: 2
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, pb: 1 }}>
        <IconButton onClick={onMobileToggle}>
          <Close />
        </IconButton>
      </Box>
      {sidebarContent}
    </Drawer>
  )
}