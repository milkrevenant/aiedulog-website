'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Paper,
  Toolbar,
  IconButton,
  Typography,
  InputBase,
  Stack,
  Avatar,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  useTheme,
  alpha,
  Box,
  Collapse,
} from '@mui/material'
import {
  Search,
  AccountCircle,
  Settings,
  Dashboard,
  AdminPanelSettings,
  Logout,
  Close,
  CalendarToday,
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'
import { getUserIdentity } from '@/lib/identity/helpers'
import NotificationIcon from '@/components/NotificationIcon'

interface AppHeaderProps {
  user?: any
  profile?: any
}

export default function AppHeader({ user: propsUser, profile: propsProfile }: AppHeaderProps = {}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [user, setUser] = useState<any>(propsUser || null)
  const [profile, setProfile] = useState<any>(propsProfile || null)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const router = useRouter()
  const theme = useTheme()
  const supabase = createClient()

  // Fetch user and profile if not provided via props
  useEffect(() => {
    const fetchUserData = async () => {
      if (!propsUser) {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()
        if (authUser) {
          setUser(authUser)

          // Use standardized identity helper
          const identity = await getUserIdentity(authUser)
          if (identity?.profile) {
            setProfile(identity.profile)
          }
        }
      }
    }

    fetchUserData()
  }, [propsUser, propsProfile])

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    handleClose()
    router.push('/main')
  }

  return (
    <>
      {/* Material 3 스타일 상단 헤더 */}
      <Paper
        elevation={0}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          borderRadius: 0,
          backdropFilter: 'blur(20px)',
          bgcolor: alpha(theme.palette.background.paper, 0.95),
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Toolbar sx={{ px: 3, minHeight: 64 }}>
          {/* 로고 */}
          <Typography
            variant="h6"
            fontWeight="bold"
            color="primary"
            onClick={() => router.push('/feed')}
            sx={{
              cursor: 'pointer',
              mr: { xs: 2, sm: 3 },
              ml: 1,
              '&:hover': {
                opacity: 0.8,
              },
            }}
          >
            AIedulog
          </Typography>

          {/* Material 3 검색창 */}
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <Paper
              elevation={0}
              sx={{
                p: '2px 4px',
                display: { xs: 'none', sm: 'flex' }, // 모바일에서 숨김
                alignItems: 'center',
                width: '100%',
                maxWidth: 600,
                borderRadius: 10,
                bgcolor: alpha(theme.palette.action.selected, 0.04),
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                transition: 'all 0.2s', // 빠른 페이드
                '&:hover': {
                  bgcolor: alpha(theme.palette.action.selected, 0.08),
                  borderColor: alpha(theme.palette.primary.main, 0.2),
                },
                '&:focus-within': {
                  bgcolor: 'background.paper',
                  borderColor: theme.palette.primary.main,
                  boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`,
                },
              }}
            >
              <IconButton
                sx={{ p: '10px' }}
                aria-label="search"
                onClick={() => {
                  if (searchQuery.trim()) {
                    router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
                    setSearchQuery('')
                  }
                }}
              >
                <Search />
              </IconButton>
              <InputBase
                sx={{ ml: 1, flex: 1 }}
                placeholder="게시글, 사용자, 태그 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
                    setSearchQuery('')
                  }
                }}
                inputProps={{ 'aria-label': 'search' }}
              />
            </Paper>
          </Box>

          {/* 우측 아이콘들 */}
          <Stack direction="row" spacing={1} sx={{ ml: 'auto', alignItems: 'center' }}>
            {/* 모바일 검색 아이콘 */}
            <IconButton
              sx={{
                display: { xs: 'inline-flex', sm: 'none' },
              }}
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            >
              {mobileSearchOpen ? <Close /> : <Search />}
            </IconButton>

            <NotificationIcon />
            <IconButton onClick={handleMenu}>
              {profile?.avatar_url ? (
                <Avatar src={profile.avatar_url} sx={{ width: 32, height: 32 }} />
              ) : (
                <AccountCircle />
              )}
            </IconButton>
          </Stack>
        </Toolbar>
      </Paper>

      {/* 모바일 검색창 - 검색 아이콘 위치에서 왼쪽으로 확장 */}
      <Paper
        elevation={0}
        sx={{
          position: 'sticky',
          top: 64,
          zIndex: 1099,
          borderRadius: 0,
          backdropFilter: 'blur(20px)',
          bgcolor: alpha(theme.palette.background.paper, 0.95),
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          display: { xs: 'block', sm: 'none' },
        }}
      >
        <Box
          sx={{
            display: { xs: 'flex', sm: 'none' },
            position: 'absolute',
            top: '50%',
            right: 88, // 검색 아이콘 위치 (노티 + 프로필 아이콘 너비 고려)
            transform: 'translateY(-50%)',
            width: mobileSearchOpen ? 'calc(80% - 100px)' : 0, // 0.8배로 줄임
            transition: 'width 0.3s ease-in-out',
            overflow: 'hidden',
            zIndex: 10,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              borderRadius: 10,
              bgcolor: 'background.paper',
              border: `1px solid ${theme.palette.primary.main}`,
              boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <IconButton
              sx={{ p: '10px' }}
              aria-label="search"
              onClick={() => {
                if (searchQuery.trim()) {
                  router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
                  setSearchQuery('')
                  setMobileSearchOpen(false)
                }
              }}
            >
              <Search />
            </IconButton>
            <InputBase
              sx={{ ml: 1, flex: 1 }}
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
                  setSearchQuery('')
                  setMobileSearchOpen(false)
                }
              }}
              autoFocus
              inputProps={{ 'aria-label': 'search' }}
            />
            <IconButton
              sx={{ p: '10px' }}
              onClick={() => {
                setMobileSearchOpen(false)
                setSearchQuery('')
              }}
            >
              <Close />
            </IconButton>
          </Paper>
        </Box>
      </Paper>

      {/* User Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        sx={{
          mt: 1,
          '& .MuiPaper-root': {
            minWidth: 200,
          },
        }}
      >
        <MenuItem
          onClick={() => {
            handleClose()
            router.push('/dashboard')
          }}
        >
          <ListItemIcon>
            <Dashboard fontSize="small" />
          </ListItemIcon>
          <ListItemText>마이페이지</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleClose()
            router.push('/scheduling')
          }}
        >
          <ListItemIcon>
            <CalendarToday fontSize="small" />
          </ListItemIcon>
          <ListItemText>강사 예약하기</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleClose()
            router.push('/settings/profile')
          }}
        >
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>프로필 설정</ListItemText>
        </MenuItem>

        {(profile?.role === 'admin' || profile?.role === 'moderator') && (
          <MenuItem
            onClick={() => {
              handleClose()
              router.push('/admin')
            }}
          >
            <ListItemIcon>
              <AdminPanelSettings fontSize="small" />
            </ListItemIcon>
            <ListItemText>사이트 관리</ListItemText>
          </MenuItem>
        )}

        <Divider />

        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          <ListItemText>로그아웃</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}
