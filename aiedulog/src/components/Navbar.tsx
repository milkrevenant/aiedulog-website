'use client'

import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  useTheme,
  alpha,
  ListItemIcon,
  ListItemText,
  InputBase,
  Paper,
} from '@mui/material'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import {
  AccountCircle,
  Dashboard,
  Logout,
  Login,
  AdminPanelSettings,
  Settings,
  Search,
  Chat,
  Menu as MenuIcon,
} from '@mui/icons-material'
import NotificationIcon from '@/components/NotificationIcon'

export default function Navbar() {
  const theme = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // Identity 시스템을 통한 profile 조회
        const { data: authMethod } = await supabase
          .from('auth_methods')
          .select(`
            identities!inner (
              user_profiles!inner (*)
            )
          `)
          .eq('provider', 'supabase')
          .eq('provider_user_id', user.id)
          .single()
        
        setProfile(authMethod?.identities?.user_profiles || null)
      }
    }
    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        // Identity 시스템을 통한 profile 조회
        const { data: authMethod } = await supabase
          .from('auth_methods')
          .select(`
            identities!inner (
              user_profiles!inner (*)
            )
          `)
          .eq('provider', 'supabase')
          .eq('provider_user_id', session.user.id)
          .single()
        
        setProfile(authMethod?.identities?.user_profiles || null)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget)
  }

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    handleClose()
    window.location.href = '/'
  }

  const menuItems = [
    { label: '자료공유', href: '/posts?category=share' },
    { label: '수업고민', href: '/posts?category=question' },
    { label: '잡담', href: '/posts?category=chat' },
    { label: '강의홍보', href: '/posts?category=lecture' },
    { label: '구인구직', href: '/posts?category=job' },
    { label: '칼럼', href: '/columns' },
  ]

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: 64, height: 64 }}>
            {/* 햄버거 메뉴 버튼 - 모바일/태블릿에서만 표시 */}
            <IconButton
              sx={{
                display: { xs: 'flex', md: 'none' },
                mr: 2,
              }}
              onClick={handleMobileMenuOpen}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>

            {/* Logo */}
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 4 }}>
              <Typography
                variant="h6"
                component={Link}
                href="/main"
                sx={{
                  fontWeight: 700,
                  color: theme.palette.primary.main,
                  textDecoration: 'none',
                }}
              >
                AIedulog
              </Typography>
            </Box>

            {/* Flex spacer for desktop */}
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'block' } }} />

            {/* Desktop Menu Items and Icons - Right aligned with consistent spacing */}
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                gap: 2, // 일정한 간격 설정
              }}
            >
              {/* Menu Items */}
              {menuItems.map((item) => (
                <Button
                  key={item.href}
                  component={Link}
                  href={item.href}
                  sx={{
                    color: pathname.startsWith(item.href.split('?')[0])
                      ? theme.palette.primary.main
                      : theme.palette.text.primary,
                    fontWeight: pathname.startsWith(item.href.split('?')[0]) ? 600 : 400,
                    minWidth: 'auto',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}

              {/* Notification and Chat Icons - 로그인 상태일 때만 표시 */}
              {user && (
                <>
                  <NotificationIcon />
                  <IconButton
                    component={Link}
                    href="/chat"
                    sx={{ color: theme.palette.text.primary }}
                  >
                    <Chat />
                  </IconButton>
                </>
              )}

              {/* User Auth Section */}
              {user ? (
                <IconButton size="large" onClick={handleMenu} sx={{ p: 0.5 }}>
                  <Avatar
                    src={profile?.avatar_url || undefined}
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: profile?.avatar_url ? 'transparent' : theme.palette.primary.main,
                    }}
                  >
                    {!profile?.avatar_url && user.email?.[0].toUpperCase()}
                  </Avatar>
                </IconButton>
              ) : (
                <>
                  <Button
                    component={Link}
                    href="/auth/login"
                    variant="text"
                    sx={{
                      color: theme.palette.text.primary,
                      fontWeight: 400,
                      minWidth: 'auto',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                      },
                    }}
                  >
                    로그인
                  </Button>
                  <Button
                    component={Link}
                    href="/auth/signup"
                    variant="contained"
                    sx={{
                      borderRadius: 8,
                      minWidth: 'auto',
                      bgcolor: theme.palette.primary.main,
                      '&:hover': {
                        bgcolor: theme.palette.primary.dark,
                      },
                    }}
                  >
                    회원가입
                  </Button>
                </>
              )}
            </Box>

            {/* Mobile spacer */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexGrow: 1 }} />

            {/* Mobile User Menu */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
              {user ? (
                <>
                  <NotificationIcon />
                  <IconButton
                    component={Link}
                    href="/chat"
                    sx={{ color: theme.palette.text.primary }}
                  >
                    <Chat />
                  </IconButton>
                  <IconButton size="large" onClick={handleMenu} sx={{ p: 0.5 }}>
                    <Avatar
                      src={profile?.avatar_url || undefined}
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: profile?.avatar_url ? 'transparent' : theme.palette.primary.main,
                      }}
                    >
                      {!profile?.avatar_url && user.email?.[0].toUpperCase()}
                    </Avatar>
                  </IconButton>
                </>
              ) : (
                <>
                  <Button
                    component={Link}
                    href="/auth/login"
                    variant="text"
                    size="small"
                    sx={{
                      minWidth: 'auto',
                      color: theme.palette.text.primary,
                    }}
                  >
                    로그인
                  </Button>
                  <Button
                    component={Link}
                    href="/auth/signup"
                    variant="contained"
                    size="small"
                    sx={{
                      borderRadius: 8,
                      minWidth: 'auto',
                    }}
                  >
                    회원가입
                  </Button>
                </>
              )}
            </Box>

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
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Menu - Menu 컴포넌트로 바로 아래 드롭다운 */}
      <Menu
        anchorEl={mobileMenuAnchor}
        open={Boolean(mobileMenuAnchor)}
        onClose={handleMobileMenuClose}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        sx={{
          display: { xs: 'block', md: 'none' },
          mt: 0.5,
          '& .MuiPaper-root': {
            width: '100vw',
            maxWidth: '100%',
            borderRadius: 0,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          },
        }}
      >
        {menuItems.map((item) => (
          <MenuItem
            key={item.href}
            onClick={() => {
              router.push(item.href)
              handleMobileMenuClose()
            }}
            sx={{
              py: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              '&:last-child': {
                borderBottom: 'none',
              },
            }}
          >
            <Typography variant="body1">{item.label}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
