'use client'

import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  useTheme,
  alpha,
  AppBar,
  Toolbar,
  IconButton,
  Link as MuiLink,
  Popper,
  Paper,
  Grow,
  Collapse,
  Divider,
  GridLegacy as Grid,
  Fab,
  Menu as MuiMenu,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
} from '@mui/material'
import Link from 'next/link'
import {
  ArrowForward,
  ArrowOutward,
  Menu as MenuIcon,
  KeyboardArrowDown,
  YouTube,
  LinkedIn,
  Twitter,
  Login,
  Chat,
  CalendarMonth,
  Logout,
  Groups,
  FolderShared,
  RemoveRedEye,
  Newspaper,
  Notifications,
  Message,
  ExpandLess,
  ExpandMore,
  EventAvailable,
} from '@mui/icons-material'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import NotificationIcon from '@/components/NotificationIcon'
import FeedSidebar from '@/components/FeedSidebar'
import DynamicFooter from '@/components/DynamicFooter'
import { createClient } from '@/lib/supabase/client'
import { getUserIdentity } from '@/lib/identity/helpers'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export default function Home() {
  const theme = useTheme()
  const router = useRouter()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<HTMLElement | null>(null)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [mobileAboutOpen, setMobileAboutOpen] = useState(false)
  const [mobileShareOpen, setMobileShareOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // 표준화된 identity helper 사용
        const identity = await getUserIdentity(user)
        setProfile(identity?.profile || null)
      }
    }
    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        // Identity 시스템을 통한 profile 조회
        const identity = await getUserIdentity(session.user, supabase)
        setProfile(identity?.profile || null)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, menu: string) => {
    // 타이머가 있으면 취소
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setAnchorEl(event.currentTarget)
    setOpenMenu(menu)
  }

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, menu: string) => {
    if (openMenu === menu) {
      setOpenMenu(null)
      setAnchorEl(null)
    } else {
      handleMenuOpen(event, menu)
    }
  }

  const handleMenuClose = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setOpenMenu(null)
      setAnchorEl(null)
    }, 100)
  }

  const navigationItems = [
    {
      label: '연구회',
      key: 'about',
      dropdown: {
        sections: [
          {
            items: [
              { label: '연구회 소개', href: '/introduction' },
              { label: '조직도', href: '/organization' },
              { label: '연혁', href: '/organization#history' },
            ],
          },
          {
            items: [
              { label: '정기 모임', href: '/regular-meetings' },
              { label: '연수 프로그램', href: '/annual-lecture' },
            ],
          },
        ],
        featured: {
          label: '공지사항',
          title: '2025년 상반기 연수 일정',
          href: '/notice',
        },
      },
    },
    {
      label: '자료공유',
      key: 'share',
      dropdown: {
        sections: [
          {
            items: [
              { label: 'AI 도구 활용', href: '/tools' },
              { label: '수업 지도안', href: '/curriculum' },
              { label: '평가 자료', href: '/evaluation' },
            ],
          },
          {
            items: [
              { label: '논문 및 보고서', href: '/board/education' },
              { label: '세미나 자료', href: '/board/lectures' },
            ],
          },
        ],
        featured: {
          label: '인기 자료',
          title: 'AI 활용 수업 사례집',
          href: '/board/education',
        },
      },
    },
    {
      label: '비전',
      key: 'vision',
      dropdown: null,
      href: '/vision',
    },
    {
      label: '뉴스',
      key: 'news',
      dropdown: null,
      href: '/news',
    },
    {
      label: '1:1 상담 예약',
      key: 'scheduling',
      dropdown: null,
      href: '/scheduling',
    },
  ]

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#FAFCFE', // Material Theme: background
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* Navbar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: '#F7F9FF', // Material Theme: surface
          borderBottom: '1px solid',
          borderColor: '#C0C7CD', // Material Theme: outlineVariant
          backdropFilter: 'blur(10px)',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar sx={{ height: 64, px: { xs: 0 } }}>
            {/* Logo */}
            <Typography
              variant="h6"
              component={Link}
              href="/"
              sx={{
                fontWeight: 600,
                fontSize: '1.25rem',
                color: '#2E86AB', // Material Theme: primary
                textDecoration: 'none',
                letterSpacing: '-0.02em',
              }}
            >
              AIEDULOG
            </Typography>

            {/* Spacer to push navigation to right */}
            <Box sx={{ flex: 1 }} />

            {/* Navigation Links - Desktop */}
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                gap: 2,
                mr: 3,
              }}
            >
              {navigationItems.map((item) => (
                <Box
                  key={item.key}
                  onMouseEnter={(e) => item.dropdown && handleMenuOpen(e, item.key)}
                  onMouseLeave={handleMenuClose}
                >
                  <MuiLink
                    href={item.href || "#"}
                    underline="none"
                    component={item.href ? Link : 'a'}
                    onClick={(e) => {
                      if (item.dropdown) {
                        e.preventDefault()
                        handleMenuClick(e, item.key)
                      }
                    }}
                    sx={{
                      color: '#191C20', // Material Theme: onBackground
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1.5,
                      py: 1,
                      borderRadius: 1,
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: alpha('#2E86AB', 0.08), // Material Theme: primary with alpha
                      },
                    }}
                  >
                    {item.label}
                    {item.dropdown && (
                      <KeyboardArrowDown
                        sx={{
                          fontSize: 16,
                          transition: 'transform 0.2s',
                          transform: openMenu === item.key ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      />
                    )}
                  </MuiLink>

                  {/* Dropdown Menu */}
                  {item.dropdown && (
                    <Popper
                      open={openMenu === item.key}
                      anchorEl={anchorEl}
                      placement="bottom"
                      transition
                      modifiers={[
                        {
                          name: 'offset',
                          options: {
                            offset: [0, 8], // [수평 오프셋, 수직 오프셋]
                          },
                        },
                      ]}
                      sx={{ zIndex: 1300 }}
                    >
                      {({ TransitionProps }) => (
                        <Grow
                          {...TransitionProps}
                          timeout={{
                            enter: 350,
                            exit: 0, // 사라질 때는 즉시
                          }}
                          style={{
                            transformOrigin: 'top center',
                          }}
                        >
                          <Paper
                            sx={{
                              mt: 1,
                              bgcolor: '#fff',
                              borderRadius: 2,
                              boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                              minWidth: 450,
                              overflow: 'hidden',
                              animation: openMenu === item.key ? 'slideDown 0.3s ease-out' : 'none',
                              '@keyframes slideDown': {
                                '0%': {
                                  opacity: 0,
                                  transform: 'translateY(-10px)',
                                },
                                '100%': {
                                  opacity: 1,
                                  transform: 'translateY(0)',
                                },
                              },
                            }}
                            onMouseEnter={() => {
                              // 타이머가 있으면 취소
                              if (closeTimeoutRef.current) {
                                clearTimeout(closeTimeoutRef.current)
                                closeTimeoutRef.current = null
                              }
                            }}
                            onMouseLeave={handleMenuClose}
                          >
                            <Grid container>
                              <Grid item xs={12} md={5}>
                                <Box sx={{ p: 3 }}>
                                  {item.dropdown.sections.map((section, idx) => (
                                    <Box
                                      key={idx}
                                      sx={{ mb: idx < item.dropdown.sections.length - 1 ? 2 : 0 }}
                                    >
                                      <Stack spacing={1}>
                                        {section.items.map((subItem, subIdx) => (
                                          <MuiLink
                                            key={subIdx}
                                            href={subItem.href}
                                            underline="none"
                                            sx={{
                                              color: '#000',
                                              fontSize: '0.875rem',
                                              py: 0.5,
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 0.5,
                                              '&:hover': {
                                                color: theme.palette.primary.main,
                                              },
                                            }}
                                          >
                                            {subItem.label}
                                            {(subItem as any).external && (
                                              <ArrowOutward sx={{ fontSize: 14 }} />
                                            )}
                                          </MuiLink>
                                        ))}
                                      </Stack>
                                    </Box>
                                  ))}
                                </Box>
                              </Grid>
                              {item.dropdown.featured && (
                                <Grid item xs={12} md={7}>
                                  <Box
                                    sx={{
                                      bgcolor: '#FFFFFF', // 흰색 배경
                                      height: '100%',
                                      p: 3,
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      border: '1px solid #E0E0E0',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 2,
                                      '&:hover': {
                                        bgcolor: '#F5F5F5',
                                      },
                                    }}
                                  >
                                    <CalendarMonth
                                      sx={{
                                        fontSize: 40,
                                        color: '#2E86AB', // Material Theme: primary
                                      }}
                                    />
                                    <Box sx={{ textAlign: 'center' }}>
                                      <Typography
                                        variant="overline"
                                        sx={{
                                          fontSize: '0.7rem',
                                          fontWeight: 600,
                                          color: '#666',
                                          letterSpacing: '0.08em',
                                          display: 'block',
                                        }}
                                      >
                                        {item.dropdown.featured.label}
                                      </Typography>
                                      <Typography
                                        variant="h6"
                                        sx={{
                                          mt: 0.5,
                                          fontSize: '0.9rem',
                                          fontWeight: 600,
                                          lineHeight: 1.3,
                                        }}
                                      >
                                        {item.dropdown.featured.title}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </Grid>
                              )}
                            </Grid>
                          </Paper>
                        </Grow>
                      )}
                    </Popper>
                  )}
                </Box>
              ))}
            </Box>

            {/* Right side icons and login */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              {/* Mobile menu - 햄버거 메뉴 */}
              <IconButton
                onClick={(e) => setMobileMenuAnchor(e.currentTarget)}
                sx={{
                  display: { xs: 'flex', md: 'none' },
                  color: '#191C20', // Material Theme: onBackground
                }}
              >
                <MenuIcon />
              </IconButton>

              {user ? (
                <>
                  {/* Desktop: Notification and Chat Icons */}
                  <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
                    <NotificationIcon />
                    <IconButton
                      component={Link}
                      href="/chat"
                      sx={{
                        color: '#191C20', // Material Theme: onBackground
                      }}
                    >
                      <Chat />
                    </IconButton>
                  </Box>

                  {/* Logout Button */}
                  <Button
                    onClick={async () => {
                      await supabase.auth.signOut()
                      router.push('/')
                    }}
                    variant="text"
                    sx={{
                      color: '#191C20',
                      textTransform: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                    }}
                    startIcon={<Logout />}
                  >
                    로그아웃
                  </Button>
                </>
              ) : (
                /* Login and Signup Buttons */
                (<>
                  <Button
                    component={Link}
                    href="/auth/login"
                    variant="contained"
                    startIcon={<Login />}
                    sx={{
                      bgcolor: '#2E86AB', // Material Theme: primary
                      color: '#FFFFFF', // Material Theme: onPrimary
                      borderRadius: '20px',
                      px: 3,
                      py: 1,
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      textTransform: 'none',
                      boxShadow: 'none',
                      '&:hover': {
                        bgcolor: '#204876', // Material Theme: onPrimaryContainer
                        boxShadow: 'none',
                      },
                    }}
                  >
                    로그인
                  </Button>
                  <Button
                    component={Link}
                    href="/auth/signup"
                    variant="outlined"
                    sx={{
                      borderColor: '#2E86AB',
                      color: '#2E86AB',
                      borderRadius: '20px',
                      px: 3,
                      py: 1,
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      textTransform: 'none',
                      '&:hover': {
                        borderColor: '#204876',
                        bgcolor: alpha('#2E86AB', 0.04),
                      },
                    }}
                  >
                    회원가입
                  </Button>
                </>)
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      {/* Mobile Menu - Menu 컴포넌트로 변경 */}
      <MuiMenu
        anchorEl={mobileMenuAnchor}
        open={Boolean(mobileMenuAnchor)}
        onClose={() => setMobileMenuAnchor(null)}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            position: 'fixed',
            left: '0 !important',
            right: 0,
            width: '100vw',
            maxWidth: '100vw',
            borderRadius: 0,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxHeight: '70vh',
            overflow: 'auto',
            mt: 0.5,
          },
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
        }}
      >
        <List sx={{ py: 0 }}>
          {/* 연구회 */}
          <ListItem disablePadding>
            <ListItemButton onClick={() => setMobileAboutOpen(!mobileAboutOpen)}>
              <ListItemIcon>
                <Groups sx={{ color: '#2E86AB' }} />
              </ListItemIcon>
              <ListItemText
                primary="연구회"
                primaryTypographyProps={{
                  fontSize: '1rem',
                  fontWeight: 500,
                }}
              />
              {mobileAboutOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>
          <Collapse in={mobileAboutOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ py: 0 }}>
              <ListItem sx={{ pl: 4, py: 0 }}>
                <ListItemButton 
                  component={Link}
                  href="/introduction"
                  onClick={() => setMobileMenuAnchor(null)} 
                  sx={{ py: 1 }}
                >
                  <ListItemText
                    primary="연구회 소개"
                    primaryTypographyProps={{ fontSize: '0.9rem' }}
                  />
                </ListItemButton>
              </ListItem>
              <ListItem sx={{ pl: 4, py: 0 }}>
                <ListItemButton 
                  component={Link}
                  href="/organization"
                  onClick={() => setMobileMenuAnchor(null)} 
                  sx={{ py: 1 }}
                >
                  <ListItemText primary="조직도" primaryTypographyProps={{ fontSize: '0.9rem' }} />
                </ListItemButton>
              </ListItem>
              <ListItem sx={{ pl: 4, py: 0 }}>
                <ListItemButton 
                  component={Link}
                  href="/organization#history"
                  onClick={() => setMobileMenuAnchor(null)} 
                  sx={{ py: 1 }}
                >
                  <ListItemText primary="연혁" primaryTypographyProps={{ fontSize: '0.9rem' }} />
                </ListItemButton>
              </ListItem>
              <ListItem sx={{ pl: 4, py: 0 }}>
                <ListItemButton 
                  component={Link}
                  href="/regular-meetings"
                  onClick={() => setMobileMenuAnchor(null)} 
                  sx={{ py: 1 }}
                >
                  <ListItemText
                    primary="정기 모임"
                    primaryTypographyProps={{ fontSize: '0.9rem' }}
                  />
                </ListItemButton>
              </ListItem>
              <ListItem sx={{ pl: 4, py: 0 }}>
                <ListItemButton 
                  component={Link}
                  href="/annual-lecture"
                  onClick={() => setMobileMenuAnchor(null)} 
                  sx={{ py: 1 }}
                >
                  <ListItemText
                    primary="연수 프로그램"
                    primaryTypographyProps={{ fontSize: '0.9rem' }}
                  />
                </ListItemButton>
              </ListItem>
            </List>
          </Collapse>

          <Divider />

          {/* 자료공유 */}
          <ListItem disablePadding>
            <ListItemButton onClick={() => setMobileShareOpen(!mobileShareOpen)}>
              <ListItemIcon>
                <FolderShared sx={{ color: '#2E86AB' }} />
              </ListItemIcon>
              <ListItemText
                primary="자료공유"
                primaryTypographyProps={{
                  fontSize: '1rem',
                  fontWeight: 500,
                }}
              />
              {mobileShareOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>
          <Collapse in={mobileShareOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ py: 0 }}>
              <ListItem sx={{ pl: 4, py: 0 }}>
                <ListItemButton 
                  component={Link}
                  href="/tools"
                  onClick={() => setMobileMenuAnchor(null)} 
                  sx={{ py: 1 }}
                >
                  <ListItemText
                    primary="AI 도구 활용"
                    primaryTypographyProps={{ fontSize: '0.9rem' }}
                  />
                </ListItemButton>
              </ListItem>
              <ListItem sx={{ pl: 4, py: 0 }}>
                <ListItemButton 
                  component={Link}
                  href="/curriculum"
                  onClick={() => setMobileMenuAnchor(null)} 
                  sx={{ py: 1 }}
                >
                  <ListItemText
                    primary="수업 지도안"
                    primaryTypographyProps={{ fontSize: '0.9rem' }}
                  />
                </ListItemButton>
              </ListItem>
              <ListItem sx={{ pl: 4, py: 0 }}>
                <ListItemButton 
                  component={Link}
                  href="/evaluation"
                  onClick={() => setMobileMenuAnchor(null)} 
                  sx={{ py: 1 }}
                >
                  <ListItemText
                    primary="평가 자료"
                    primaryTypographyProps={{ fontSize: '0.9rem' }}
                  />
                </ListItemButton>
              </ListItem>
              <ListItem sx={{ pl: 4, py: 0 }}>
                <ListItemButton 
                  component={Link}
                  href="/board/education"
                  onClick={() => setMobileMenuAnchor(null)} 
                  sx={{ py: 1 }}
                >
                  <ListItemText
                    primary="논문 및 보고서"
                    primaryTypographyProps={{ fontSize: '0.9rem' }}
                  />
                </ListItemButton>
              </ListItem>
              <ListItem sx={{ pl: 4, py: 0 }}>
                <ListItemButton 
                  component={Link}
                  href="/board/lectures"
                  onClick={() => setMobileMenuAnchor(null)} 
                  sx={{ py: 1 }}
                >
                  <ListItemText
                    primary="세미나 자료"
                    primaryTypographyProps={{ fontSize: '0.9rem' }}
                  />
                </ListItemButton>
              </ListItem>
            </List>
          </Collapse>

          <Divider />

          {/* 비전 */}
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              href="/vision"
              onClick={() => setMobileMenuAnchor(null)}
            >
              <ListItemIcon>
                <RemoveRedEye sx={{ color: '#2E86AB' }} />
              </ListItemIcon>
              <ListItemText
                primary="비전"
                primaryTypographyProps={{
                  fontSize: '1rem',
                  fontWeight: 500,
                }}
              />
            </ListItemButton>
          </ListItem>

          <Divider />

          {/* 뉴스 */}
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              href="/news"
              onClick={() => setMobileMenuAnchor(null)}
            >
              <ListItemIcon>
                <Newspaper sx={{ color: '#2E86AB' }} />
              </ListItemIcon>
              <ListItemText
                primary="뉴스"
                primaryTypographyProps={{
                  fontSize: '1rem',
                  fontWeight: 500,
                }}
              />
            </ListItemButton>
          </ListItem>

          <Divider />

          {/* 1:1 상담 예약 */}
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              href="/scheduling"
              onClick={() => setMobileMenuAnchor(null)}
            >
              <ListItemIcon>
                <EventAvailable sx={{ color: '#2E86AB' }} />
              </ListItemIcon>
              <ListItemText
                primary="1:1 상담 예약"
                primaryTypographyProps={{
                  fontSize: '1rem',
                  fontWeight: 500,
                }}
              />
            </ListItemButton>
          </ListItem>

          {user && (
            <>
              <Divider sx={{ my: 1 }} />

              {/* 알림 */}
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  href="/notifications"
                  onClick={() => setMobileMenuAnchor(null)}
                >
                  <ListItemIcon>
                    <Notifications sx={{ color: '#2E86AB' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="알림"
                    primaryTypographyProps={{
                      fontSize: '1rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              </ListItem>

              {/* 메시지 */}
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  href="/messages"
                  onClick={() => setMobileMenuAnchor(null)}
                >
                  <ListItemIcon>
                    <Message sx={{ color: '#2E86AB' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="메시지"
                    primaryTypographyProps={{
                      fontSize: '1rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            </>
          )}
        </List>
      </MuiMenu>
      {/* Hero Section - Grid Layout */}
      <Container maxWidth="xl" sx={{ pt: 8, pb: 8 }}>
        {/* Grid Container */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr', // 모바일: 1열
              sm: 'repeat(2, 1fr)', // 태블릿: 2열
              md: 'repeat(3, 1fr)', // 중간: 3열
              lg: 'repeat(3, 1fr)', // 데스크톱: 3열
            },
            gridTemplateRows: {
              xs: 'auto', // 모바일: 자동
              sm: 'auto auto', // 태블릿: 2행
              md: 'auto auto', // 중간: 2행
              lg: 'auto auto', // 데스크톱: 2행
            },
            gap: 3,
          }}
        >
          {/* Typography 영역 (2칸 차지) */}
          <Box
            sx={{
              gridColumn: {
                xs: '1', // 모바일: 1칸
                sm: 'span 2', // 태블릿: 2칸 차지
                md: 'span 2', // 중간: 2칸 차지
                lg: 'span 2', // 데스크톱: 2칸 차지
              },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Typography
              variant="h1"
              sx={{
                fontSize: 'clamp(2.8rem, 6vw, 5rem)',
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: '-0.03em',
                color: '#191C20', // Material Theme: onBackground
              }}
            >
              <Box
                component="span"
                sx={{
                  textDecoration: 'underline',
                  textDecorationThickness: '2px',
                  textUnderlineOffset: '8px',
                }}
              >
                교육
              </Box>
              을 바꾸는{' '}
              <Box
                component="span"
                sx={{
                  textDecoration: 'underline',
                  textDecorationThickness: '2px',
                  textUnderlineOffset: '8px',
                }}
              >
                AI
              </Box>
              를
              <br />
              함께 설계하는{' '}
              <Box
                component="span"
                sx={{
                  textDecoration: 'underline',
                  textDecorationThickness: '2px',
                  textUnderlineOffset: '8px',
                }}
              >
                사람
              </Box>
              들
            </Typography>
          </Box>

          {/* 이미지 영역 (md 이상에서 표시, 2행 차지) */}
          <Box
            sx={{
              gridColumn: {
                md: '3', // 중간: 3번째 열
                lg: '3', // 데스크톱: 3번째 열
              },
              gridRow: {
                md: 'span 2', // 중간: 2행 차지
                lg: 'span 2', // 데스크톱: 2행 차지
              },
              display: {
                xs: 'none', // 모바일: 숨김
                sm: 'none', // 태블릿: 숨김
                md: 'flex', // 중간: 표시
                lg: 'flex', // 데스크톱: 표시
              },
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#FAFCFE', // Material Theme: background
              borderRadius: 3,
              overflow: 'hidden',
              minHeight: 400,
              position: 'relative',
            }}
          >
            <Image
              src="/img_F8F9FF.png"
              alt="AI Education"
              fill
              style={{
                objectFit: 'contain',
              }}
            />
          </Box>

          {/* Card 1 */}
          <Card
            sx={{
              bgcolor: '#E3F2FD', // 그리드 안 카드 색상
              borderRadius: 3,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 200,
            }}
          >
            <CardContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography
                variant="overline"
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  color: '#41484D', // Material Theme: onSurfaceVariant
                  mb: 1,
                }}
              >
                금성고등학교 곽수창
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  fontSize: '1.5rem',
                  mb: 1,
                }}
              >
                학교 문화와 AI의 만남
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: '#41484D', // Material Theme: onSurfaceVariant
                  mb: 3,
                  lineHeight: 1.6,
                  flex: 1,
                }}
              >
                적극적인 AI 도구 활용을 통한 학교 업무 과정의 혁신을 이끌어내다.
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                sx={{
                  borderColor: '#A23B72', // Material Theme: secondary
                  color: '#A23B72', // Material Theme: secondary
                  borderRadius: '20px',
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    borderColor: '#7A2959', // Material Theme: onSecondaryContainer
                    bgcolor: alpha('#A23B72', 0.08), // Material Theme: secondary with alpha
                  },
                }}
              >
                게시글 읽기
              </Button>
            </CardContent>
          </Card>

          {/* Card 2 */}
          <Card
            sx={{
              bgcolor: '#E3F2FD', // 그리드 안 카드 색상
              borderRadius: 3,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 200,
            }}
          >
            <CardContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography
                variant="overline"
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  color: '#41484D', // Material Theme: onSurfaceVariant
                  mb: 1,
                }}
              >
                완도고등학교 공지훈
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  fontSize: '1.5rem',
                  mb: 1,
                }}
              >
                교육의 본질은 학생의 성장을 돕는 일
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: '#41484D', // Material Theme: onSurfaceVariant
                  mb: 3,
                  lineHeight: 1.6,
                  flex: 1,
                }}
              >
                모든 교육적 행위와 기술의 활용은 학생의 성장을 지원해야 합니다.
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                sx={{
                  borderColor: '#A23B72', // Material Theme: secondary
                  color: '#A23B72', // Material Theme: secondary
                  borderRadius: '20px',
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    borderColor: '#7A2959', // Material Theme: onSecondaryContainer
                    bgcolor: alpha('#A23B72', 0.08), // Material Theme: secondary with alpha
                  },
                }}
              >
                게시글 읽기
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Container>
      {/* Announcement Section */}
      <Box
        sx={{
          bgcolor: '#FAFCFE', // Material Theme: background
          pt: 4,
          pb: 4,
        }}
      >
        <Container maxWidth="xl">
          <Card
            sx={{
              bgcolor: '#E3F2FD', // 그리드 안 카드 색상
              borderRadius: 3,
              p: 5,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: '2fr 1fr', // 태블릿: 2:1 비율
                  md: '3fr 2fr', // 데스크톱: 3:2 비율
                },
                gridTemplateRows: {
                  xs: 'auto',
                  sm: 'auto', // 태블릿: 1행
                  md: 'auto', // 데스크톱: 1행
                },
                gap: 4,
                alignItems: 'stretch', // center -> stretch로 변경
              }}
            >
              <Box
                sx={{
                  gridColumn: {
                    xs: '1',
                    sm: '1', // 태블릿: 첫 번째 칸
                    md: '1', // 데스크톱: 첫 번째 칸 (3fr)
                  },
                  gridRow: {
                    xs: '1',
                    sm: '1', // 태블릿: 1행
                    md: '1', // 데스크톱: 1행
                  },
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center', // 세로 중앙 정렬
                }}
              >
                <Typography
                  variant="h3"
                  sx={{
                    fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                    fontWeight: 700,
                    mb: 2,
                    lineHeight: 1.2,
                  }}
                >
                  2025년 전남에듀테크교육연구회 연수
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: '#41484D', // Material Theme: onSurfaceVariant
                    lineHeight: 1.6,
                    mb: 3,
                  }}
                >
                  전남에서 가장 혁신적이고 선도적으로 교육을 만들어나가는 연수 과정에서 당신의
                  역량과 비전을 같이 실천해보세요. 연수 참여와 연수에 대한 의견 개진은 언제나 열려
                  있습니다.
                </Typography>
                <Button
                  variant="outlined"
                  endIcon={<ArrowForward />}
                  sx={{
                    borderColor: '#5A5891', // Material Theme: tertiary
                    color: '#5A5891', // Material Theme: tertiary
                    borderRadius: '20px',
                    px: 3,
                    py: 1,
                    textTransform: 'none',
                    fontWeight: 500,
                    '&:hover': {
                      borderColor: '#434078', // Material Theme: onTertiaryContainer
                      bgcolor: alpha('#5A5891', 0.08), // Material Theme: tertiary with alpha
                    },
                  }}
                >
                  공지글 확인하기
                </Button>
              </Box>

              <Box
                sx={{
                  gridColumn: {
                    xs: '1',
                    sm: '2', // 태블릿: 두 번째 칸
                    md: '2', // 데스크톱: 두 번째 칸 (2fr)
                  },
                  gridRow: {
                    xs: '2',
                    sm: '1', // 태블릿: 1행
                    md: '1', // 데스크톱: 1행
                  },
                  height: { md: '100%' }, // 데스크톱에서 높이 100%
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    flexDirection: {
                      xs: 'column',
                      sm: 'column', // 태블릿: 세로 배치
                      md: 'row', // 데스크톱: 가로 배치
                    },
                    height: '100%',
                  }}
                >
                  <Card
                    sx={{
                      flex: 1,
                      minWidth: { xs: 140, sm: 0, md: 'auto' },
                      minHeight: { md: 0 }, // 데스크톱에서 높이 자동 조절
                      bgcolor: '#F5C2DD', // Material Theme: secondaryContainer
                      borderRadius: 2,
                      p: 3,
                      boxShadow: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      },
                    }}
                  >
                    <Typography
                      variant="overline"
                      sx={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#7A2959', // Material Theme: onSecondaryContainer
                      }}
                    >
                      Model details
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        mt: 1,
                        fontSize: { xs: '1rem', sm: '1.25rem' },
                      }}
                    >
                      2025년 상반기 연수 : MCP
                    </Typography>
                    <ArrowOutward
                      sx={{
                        fontSize: 20,
                        mt: 2,
                        color: '#7A2959', // Material Theme: onSecondaryContainer
                      }}
                    />
                  </Card>

                  <Card
                    sx={{
                      flex: 1,
                      minWidth: { xs: 140, sm: 0, md: 'auto' },
                      minHeight: { md: 0 }, // 데스크톱에서 높이 자동 조절
                      bgcolor: '#F5C2DD', // Material Theme: secondaryContainer
                      borderRadius: 2,
                      p: 3,
                      boxShadow: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      },
                    }}
                  >
                    <Typography
                      variant="overline"
                      sx={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#7A2959', // Material Theme: onSecondaryContainer
                      }}
                    >
                      Model details
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        mt: 1,
                        fontSize: { xs: '1rem', sm: '1.25rem' },
                      }}
                    >
                      2025년 하반기 연수 : CLI 활용 자동채점
                    </Typography>
                    <ArrowOutward
                      sx={{
                        fontSize: 20,
                        mt: 2,
                        color: '#7A2959', // Material Theme: onSecondaryContainer
                      }}
                    />
                  </Card>
                </Box>
              </Box>
            </Box>
          </Card>
        </Container>
      </Box>
      {/* Bottom CTA */}
      <Container maxWidth="md" sx={{ pt: 8, pb: 8 }}>
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '2rem', md: '2.5rem' },
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}
          >
            교육의 미래를 함께
            <br />
            만들어갈 준비가 되셨나요?
          </Typography>

          <Stack direction="row" spacing={2}>
            <Button
              component={Link}
              href="/auth/signup"
              variant="contained"
              sx={{
                bgcolor: '#2E86AB', // Material Theme: primary
                color: '#FFFFFF', // Material Theme: onPrimary
                borderRadius: '20px',
                px: 4,
                py: 1.5,
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': {
                  bgcolor: '#204876', // Material Theme: onPrimaryContainer
                },
              }}
            >
              회원가입
            </Button>
            <Button
              variant="outlined"
              sx={{
                borderColor: '#5A5891', // Material Theme: tertiary
                color: '#5A5891', // Material Theme: tertiary
                borderRadius: '20px',
                px: 4,
                py: 1.5,
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': {
                  borderColor: '#434078', // Material Theme: onTertiaryContainer
                  bgcolor: alpha('#5A5891', 0.08), // Material Theme: tertiary with alpha
                },
              }}
            >
              문의하기
            </Button>
          </Stack>
        </Stack>
      </Container>
      {/* Dynamic Footer */}
      <DynamicFooter language="ko" />
      {/* 모바일 플로팅 메뉴 버튼 - 로그인한 경우에만 표시 */}
      {user && (
        <Box
          sx={{
            display: { xs: 'block', md: 'none' },
            position: 'fixed',
            bottom: 20,
            left: 20,
            zIndex: 1200,
          }}
        >
          <Fab
            color="primary"
            aria-label="menu"
            onClick={() => setMobileDrawerOpen(true)}
            sx={{
              bgcolor: theme.palette.primary.main,
              '&:hover': {
                bgcolor: theme.palette.primary.dark,
              },
            }}
          >
            <MenuIcon />
          </Fab>
        </Box>
      )}
      {/* FeedSidebar (모바일 Drawer) */}
      <FeedSidebar
        user={user}
        profile={profile}
        mobileOpen={mobileDrawerOpen}
        onMobileToggle={() => setMobileDrawerOpen(false)}
      />
    </Box>
  );
}
