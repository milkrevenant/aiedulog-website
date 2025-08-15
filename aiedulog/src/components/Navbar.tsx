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
} from '@mui/material'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import {
  Menu as MenuIcon,
  AccountCircle,
  Dashboard,
  Logout,
  Login,
  AdminPanelSettings,
  Settings,
} from '@mui/icons-material'

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
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(profileData)
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(profileData)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMobileMenu = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
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
        <Toolbar disableGutters sx={{ height: 64 }}>
          {/* Logo - 햄버거 메뉴 다음에 위치 */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 4 }}>
            <Typography
              variant="h6"
              component={Link}
              href="/"
              sx={{
                fontWeight: 700,
                color: theme.palette.primary.main,
                textDecoration: 'none',
              }}
            >
              AIedulog
            </Typography>
          </Box>

          {/* Desktop Menu */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 1 }}>
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
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Mobile Menu Icon */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexGrow: 1 }}>
            <IconButton
              size="large"
              onClick={handleMobileMenu}
              color="inherit"
              sx={{ color: theme.palette.text.primary }}
            >
              <MenuIcon />
            </IconButton>
          </Box>

          {/* User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {user ? (
              <>
                <IconButton
                  size="large"
                  onClick={handleMenu}
                  sx={{ color: theme.palette.text.primary }}
                >
                  <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main }}>
                    {user.email?.[0].toUpperCase()}
                  </Avatar>
                </IconButton>
              </>
            ) : (
              <Button
                component={Link}
                href="/auth/login"
                variant="contained"
                startIcon={<Login />}
                sx={{ borderRadius: 8 }}
              >
                로그인
              </Button>
            )}
          </Box>

          {/* Mobile Menu */}
          <Menu
            anchorEl={mobileMenuAnchor}
            open={Boolean(mobileMenuAnchor)}
            onClose={handleClose}
            sx={{ display: { xs: 'block', md: 'none' } }}
          >
            {menuItems.map((item) => (
              <MenuItem
                key={item.href}
                component={Link}
                href={item.href}
                onClick={handleClose}
              >
                {item.label}
              </MenuItem>
            ))}
          </Menu>

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
              }
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
  )
}