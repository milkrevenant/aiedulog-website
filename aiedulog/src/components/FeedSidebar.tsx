'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Paper,
  Divider,
  Typography,
  Stack,
  Avatar,
  Chip,
  IconButton,
  Drawer,
  useTheme,
  alpha,
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
  Event,
  Favorite,
} from '@mui/icons-material'

// Define proper TreeView item types
interface TreeViewItem {
  id: string
  label: string
  icon?: React.ReactNode
  href?: string
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning'
  children?: TreeViewItem[]
}

interface FeedSidebarProps {
  user: any
  profile: any
  mobileOpen?: boolean
  onMobileToggle?: () => void
  isStatic?: boolean
}

export default function FeedSidebar({
  user,
  profile,
  mobileOpen = false,
  onMobileToggle,
  isStatic = false,
}: FeedSidebarProps) {
  const router = useRouter()
  const theme = useTheme()
  const [expandedItems, setExpandedItems] = useState<string[]>(['education', 'trend', 'job'])

  const menuItems: TreeViewItem[] = [
    {
      id: 'feed',
      label: '피드',
      icon: <Home />,
      href: '/feed',
      color: 'primary',
    },
    {
      id: 'trending',
      label: '공감 게시판',
      icon: <Favorite />,
      href: '/board/trending',
      color: 'error',
    },
    {
      id: 'general',
      label: '자유게시판',
      icon: <Forum />,
      href: '/board/general',
      color: 'info',
    },
    {
      id: 'education',
      label: '교육 자료실',
      icon: <School />,
      href: '/board/education/all',
      color: 'success',
      children: [
        { id: 'education-all', label: '전체', href: '/board/education/all' },
        { id: 'education-ele', label: '초등학교', href: '/board/education/ele' },
        { id: 'education-mid', label: '중학교', href: '/board/education/mid' },
        { id: 'education-high', label: '고등학교', href: '/board/education/high' },
        { id: 'education-common', label: '공통', href: '/board/education/common' },
      ],
    },
    {
      id: 'trend',
      label: '교육 트렌드',
      icon: <TrendingUp />,
      href: '/board/tech',
      color: 'warning',
      children: [
        { id: 'trend-all', label: '전체', href: '/board/tech' },
        { id: 'trend-ai', label: 'AI', href: '/board/tech' },
        { id: 'trend-edutech', label: '에듀테크', href: '/board/tech' },
        { id: 'trend-sw', label: 'SW', href: '/board/tech' },
      ],
    },
    {
      id: 'job',
      label: '구인구직',
      icon: <Work />,
      href: '/board/job/all',
      color: 'error',
      children: [
        { id: 'job-all', label: '전체', href: '/board/job/all' },
        { id: 'job-hiring', label: '구인', href: '/board/job/hiring' },
        { id: 'job-seeking', label: '구직', href: '/board/job/seeking' },
      ],
    },
    {
      id: 'lectures',
      label: '강의 홍보',
      icon: <Event />,
      href: '/board/lectures',
      color: 'secondary',
    },
  ]

  const utilityItems: TreeViewItem[] = [
    {
      id: 'bookmarks',
      label: '북마크',
      icon: <BookmarkBorder />,
      href: '/bookmarks',
    },
  ]

  // 관리자 메뉴
  const adminItems: TreeViewItem[] =
    profile?.role === 'admin' || profile?.role === 'moderator'
      ? [
          {
            id: 'admin-dashboard',
            label: '관리자 대시보드',
            icon: <AdminPanelSettings />,
            href: '/admin',
            color: 'error',
          },
          {
            id: 'admin-users',
            label: '사용자 관리',
            icon: <Group />,
            href: '/admin/users',
            color: 'error',
          },
        ]
      : []

  const handleItemClick = (href: string) => {
    router.push(href)
    onMobileToggle?.()
  }

  const handleExpandedItemsChange = (event: React.SyntheticEvent<Element> | null, itemIds: string[]) => {
    setExpandedItems(itemIds)
  }

  // Helper function to find item in tree
  const findItem = (items: TreeViewItem[], id: string): TreeViewItem | null => {
    for (const item of items) {
      if (item.id === id) return item
      if (item.children) {
        const found = findItem(item.children, id)
        if (found) return found
      }
    }
    return null
  }

  // No additional helper functions needed with custom implementation

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
              bgcolor: profile?.avatar_url ? 'transparent' : 'primary.main',
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
          {profile?.role === 'admin' && <Chip label="관리자" color="error" size="small" />}
          {profile?.role === 'moderator' && <Chip label="운영진" color="warning" size="small" />}
          {profile?.role === 'verified' && <Chip label="인증 교사" color="success" size="small" />}
          {profile?.role === 'member' && <Chip label="일반 회원" color="default" size="small" />}
        </Box>
      </Box>

      <Divider />

      {/* TreeView 메뉴 */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {/* Main Menu Items with Custom Rendering */}
        {menuItems.map((item) => (
          <Box key={item.id} sx={{ mb: 0.5 }}>
            <Box
              onClick={() => item.href && handleItemClick(item.href)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1,
                px: 2,
                borderRadius: 2,
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              {/* Left side with icon and label */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                {item.icon && (
                  <Box
                    sx={{
                      color: item.color ? `${item.color}.main` : 'text.primary',
                      display: 'flex',
                      alignItems: 'center',
                      '& svg': {
                        fontSize: '1.25rem',
                      },
                    }}
                  >
                    {item.icon}
                  </Box>
                )}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: item.children ? 600 : 500,
                    color: item.color ? `${item.color}.main` : 'text.primary',
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
              
              {/* Expand/collapse arrow on the right */}
              {item.children && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    const newExpanded = expandedItems.includes(item.id) 
                      ? expandedItems.filter(id => id !== item.id)
                      : [...expandedItems, item.id]
                    setExpandedItems(newExpanded)
                  }}
                  sx={{ ml: 1 }}
                >
                  {expandedItems.includes(item.id) ? (
                    <Box sx={{ transform: 'rotate(180deg)', transition: 'transform 0.2s' }}>
                      ▼
                    </Box>
                  ) : (
                    <Box sx={{ transition: 'transform 0.2s' }}>▼</Box>
                  )}
                </IconButton>
              )}
            </Box>
            
            {/* Sub-menu items */}
            {item.children && expandedItems.includes(item.id) && (
              <Box sx={{ ml: 4, mt: 0.5 }}>
                {item.children.map((child) => (
                  <Box
                    key={child.id}
                    onClick={() => child.href && handleItemClick(child.href)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      py: 0.5,
                      px: 2,
                      borderRadius: 1,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.grey[500], 0.08),
                      },
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: '0.8rem',
                        fontWeight: 400,
                        color: 'text.secondary',
                      }}
                    >
                      {child.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        ))}

        <Divider sx={{ my: 2 }} />

        {/* 유틸리티 메뉴 */}
        {/* Utility Items */}
        {utilityItems.map((item) => (
          <Box
            key={item.id}
            onClick={() => item.href && handleItemClick(item.href)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              py: 1,
              px: 2,
              borderRadius: 2,
              cursor: 'pointer',
              mb: 0.5,
              '&:hover': {
                backgroundColor: alpha(theme.palette.grey[500], 0.08),
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {item.icon && (
                <Box
                  sx={{
                    color: 'text.primary',
                    display: 'flex',
                    alignItems: 'center',
                    '& svg': {
                      fontSize: '1.25rem',
                    },
                  }}
                >
                  {item.icon}
                </Box>
              )}
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: 'text.primary',
                }}
              >
                {item.label}
              </Typography>
            </Box>
          </Box>
        ))}

        {/* 관리자 메뉴 */}
        {adminItems.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ px: 1, py: 1, display: 'block', fontWeight: 600 }}
            >
              관리
            </Typography>
            {/* Admin Items */}
            {adminItems.map((item) => (
              <Box
                key={item.id}
                onClick={() => item.href && handleItemClick(item.href)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  py: 1,
                  px: 2,
                  borderRadius: 2,
                  cursor: 'pointer',
                  mb: 0.5,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.error.main, 0.08),
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {item.icon && (
                    <Box
                      sx={{
                        color: item.color ? `${item.color}.main` : 'error.main',
                        display: 'flex',
                        alignItems: 'center',
                        '& svg': {
                          fontSize: '1.25rem',
                        },
                      }}
                    >
                      {item.icon}
                    </Box>
                  )}
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: item.color ? `${item.color}.main` : 'error.main',
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              </Box>
            ))}
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
        keepMounted: true, // 모바일 성능 향상
      }}
      sx={{
        '& .MuiDrawer-paper': {
          boxSizing: 'border-box',
          width: 260,
          pt: 2,
        },
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