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
  Fade,
  Grow,
  Collapse,
  ClickAwayListener,
  Divider,
  Grid,
  Fab
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
  Search,
  CalendarMonth
} from '@mui/icons-material'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import NotificationIcon from '@/components/NotificationIcon'
import FeedSidebar from '@/components/FeedSidebar'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

export default function Home() {
  const theme = useTheme()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
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
              { label: '연구회 소개', href: '#' },
              { label: '조직도', href: '#' },
              { label: '연혁', href: '#' }
            ]
          },
          {
            items: [
              { label: '정기 모임', href: '#' },
              { label: '연수 프로그램', href: '#' }
            ]
          }
        ],
        featured: {
          label: '공지사항',
          title: '2025년 상반기 연수 일정',
          href: '#'
        }
      }
    },
    {
      label: '자료공유',
      key: 'share',
      dropdown: {
        sections: [
          {
            items: [
              { label: 'AI 도구 활용', href: '#' },
              { label: '수업 지도안', href: '#' },
              { label: '평가 자료', href: '#' }
            ]
          },
          {
            items: [
              { label: '논문 및 보고서', href: '#' },
              { label: '세미나 자료', href: '#' }
            ]
          }
        ],
        featured: {
          label: '인기 자료',
          title: 'ChatGPT 활용 수업 사례집',
          href: '#'
        }
      }
    },
    {
      label: '비전',
      key: 'vision',
      dropdown: null
    },
    {
      label: '뉴스',
      key: 'news',
      dropdown: null
    }
  ]

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#F8F9FF', // Material Theme: background
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    }}>
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
                color: '#3B608F', // Material Theme: primary
                textDecoration: 'none',
                letterSpacing: '-0.02em',
              }}
            >
              AIEDULOG
            </Typography>

            {/* Spacer to push navigation to right */}
            <Box sx={{ flex: 1 }} />

            {/* Navigation Links - Desktop */}
            <Box sx={{ 
              display: { xs: 'none', md: 'flex' }, 
              gap: 2,
              mr: 3
            }}>
              {navigationItems.map((item) => (
                <Box
                  key={item.key}
                  onMouseEnter={(e) => item.dropdown && handleMenuOpen(e, item.key)}
                  onMouseLeave={handleMenuClose}
                >
                  <MuiLink 
                    href="#" 
                    underline="none"
                    onClick={(e) => {
                      e.preventDefault()
                      if (item.dropdown) {
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
                        bgcolor: alpha('#3B608F', 0.08), // Material Theme: primary with alpha
                      }
                    }}
                  >
                    {item.label}
                    {item.dropdown && (
                      <KeyboardArrowDown 
                        sx={{ 
                          fontSize: 16,
                          transition: 'transform 0.2s',
                          transform: openMenu === item.key ? 'rotate(180deg)' : 'rotate(0deg)'
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
                            exit: 0  // 사라질 때는 즉시
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
                              width: 'auto',
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
                              <Grid size={{ xs: 12, md: 8 }}>
                                <Box sx={{ p: 3 }}>
                                  {item.dropdown.sections.map((section, idx) => (
                                    <Box key={idx} sx={{ mb: idx < item.dropdown.sections.length - 1 ? 2 : 0 }}>
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
                                                color: theme.palette.primary.main
                                              }
                                            }}
                                          >
                                            {subItem.label}
                                            {(subItem as any).external && <ArrowOutward sx={{ fontSize: 14 }} />}
                                          </MuiLink>
                                        ))}
                                      </Stack>
                                    </Box>
                                  ))}
                                </Box>
                              </Grid>
                              {item.dropdown.featured && (
                                <Grid size={{ xs: 12, md: 4 }}>
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
                                        bgcolor: '#F5F5F5'
                                      }
                                    }}
                                  >
                                    <CalendarMonth 
                                      sx={{ 
                                        fontSize: 40,
                                        color: '#3B608F' // Material Theme: primary
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
                                          display: 'block'
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
                                          lineHeight: 1.3
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
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2 
            }}>
              {/* Mobile menu - 햄버거 메뉴를 노티 아이콘 왼쪽에 배치 */}
              <IconButton
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                sx={{ 
                  display: { xs: 'flex', md: 'none' },
                  color: '#191C20' // Material Theme: onBackground
                }}
              >
                <MenuIcon />
              </IconButton>

              {user ? (
                <>
                  {/* Notification Icon */}
                  <NotificationIcon />
                  
                  {/* Chat Icon */}
                  <IconButton
                    sx={{ 
                      color: '#191C20' // Material Theme: onBackground
                    }}
                  >
                    <Chat />
                  </IconButton>
                </>
              ) : (
                /* Login Button */
                <Button
                  component={Link}
                  href="/auth/login"
                  variant="contained"
                  startIcon={<Login />}
                  sx={{
                    bgcolor: '#3B608F', // Material Theme: primary
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
                    }
                  }}
                >
                  로그인
                </Button>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Hero Section - Grid Layout */}
      <Container maxWidth="xl" sx={{ pt: 8, pb: 8 }}>
        {/* Grid Container */}
        <Box sx={{ 
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
        }}>
          {/* Typography 영역 (2칸 차지) */}
          <Box sx={{ 
            gridColumn: {
              xs: '1', // 모바일: 1칸
              sm: 'span 2', // 태블릿: 2칸 차지
              md: 'span 2', // 중간: 2칸 차지
              lg: 'span 2', // 데스크톱: 2칸 차지
            },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <Typography variant="h1" sx={{
              fontSize: 'clamp(2.8rem, 6vw, 5rem)',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.03em',
              color: '#191C20' // Material Theme: onBackground
            }}>
              <Box component="span" sx={{ 
                textDecoration: 'underline',
                textDecorationThickness: '2px',
                textUnderlineOffset: '8px'
              }}>
                교육
              </Box>
              을 바꾸는{' '}
              <Box component="span" sx={{ 
                textDecoration: 'underline',
                textDecorationThickness: '2px',
                textUnderlineOffset: '8px'
              }}>
                AI
              </Box>
              를
              <br />
              함께 설계하는{' '}
              <Box component="span" sx={{ 
                textDecoration: 'underline',
                textDecorationThickness: '2px',
                textUnderlineOffset: '8px'
              }}>
                사람
              </Box>
              들
            </Typography>
          </Box>

          {/* 이미지 영역 (md 이상에서 표시, 2행 차지) */}
          <Box sx={{ 
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
            bgcolor: '#F8F9FF', // Material Theme: background
            borderRadius: 3,
            overflow: 'hidden',
            minHeight: 400,
            position: 'relative'
          }}>
            <Image
              src="/img_F8F9FF.png"
              alt="AI Education"
              fill
              style={{
                objectFit: 'contain'
              }}
            />
          </Box>

          {/* Card 1 */}
          <Card sx={{ 
            bgcolor: '#D5DEF2', // 그리드 안 카드 색상
            borderRadius: 3,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 200
          }}>
            <CardContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="overline" sx={{ 
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: '#41484D', // Material Theme: onSurfaceVariant
                mb: 1
              }}>
                금성고등학교 곽수창
              </Typography>
              <Typography variant="h6" sx={{ 
                fontWeight: 600,
                fontSize: '1.25rem',
                mb: 1
              }}>
                학교 문화와 AI의 만남
              </Typography>
              <Typography variant="body2" sx={{ 
                color: '#41484D', // Material Theme: onSurfaceVariant
                mb: 3,
                lineHeight: 1.6,
                flex: 1
              }}>
                적극적인 AI 도구 활용을 통한 학교 업무 과정의 혁신을 이끌어내다.
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                sx={{
                  borderColor: '#805611', // Material Theme: secondary
                  color: '#805611', // Material Theme: secondary
                  borderRadius: '20px',
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    borderColor: '#633F00', // Material Theme: onSecondaryContainer
                    bgcolor: alpha('#805611', 0.08) // Material Theme: secondary with alpha
                  }
                }}
              >
                게시글 읽기
              </Button>
            </CardContent>
          </Card>

          {/* Card 2 */}
          <Card sx={{ 
            bgcolor: '#D5DEF2', // 그리드 안 카드 색상
            borderRadius: 3,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 200
          }}>
            <CardContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="overline" sx={{ 
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: '#41484D', // Material Theme: onSurfaceVariant
                mb: 1
              }}>
                완도고등학교 공지훈
              </Typography>
              <Typography variant="h6" sx={{ 
                fontWeight: 600,
                fontSize: '1.25rem',
                mb: 1
              }}>
                교육의 본질은 학생의 성장을 돕는 일
              </Typography>
              <Typography variant="body2" sx={{ 
                color: '#41484D', // Material Theme: onSurfaceVariant
                mb: 3,
                lineHeight: 1.6,
                flex: 1
              }}>
                모든 교육적 행위와 기술의 활용은 학생의 성장을 지원해야 합니다.
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                sx={{
                  borderColor: '#805611', // Material Theme: secondary
                  color: '#805611', // Material Theme: secondary
                  borderRadius: '20px',
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    borderColor: '#633F00', // Material Theme: onSecondaryContainer
                    bgcolor: alpha('#805611', 0.08) // Material Theme: secondary with alpha
                  }
                }}
              >
                게시글 더 읽기
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Container>

      {/* Announcement Section */}
      <Box sx={{ 
        bgcolor: '#F8F9FF', // Material Theme: background
        pt: 4,
        pb: 4
      }}>
        <Container maxWidth="xl">
          <Card sx={{
            bgcolor: '#D5DEF2', // 그리드 안 카드 색상
            borderRadius: 3,
            p: 5,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', md: 'row' },
              gap: 4,
              alignItems: 'center'
            }}>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 66%' } }}>
                <Typography variant="h3" sx={{
                  fontSize: '2rem',
                  fontWeight: 600,
                  mb: 2
                }}>
                  2025년 전남에듀테크교육연구회 연수
                </Typography>
                <Typography variant="body1" sx={{
                  color: '#41484D', // Material Theme: onSurfaceVariant
                  lineHeight: 1.6,
                  mb: 3
                }}>
                  전남에서 가장 혁신적이고 선도적으로 교육을 만들어나가는 연수 과정에서 당신의 역량과 비전을 같이 실천해보세요. 연수 참여와 연수에 대한 의견 개진은 언제나 열려 있습니다.
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
                      bgcolor: alpha('#5A5891', 0.08) // Material Theme: tertiary with alpha
                    }
                  }}
                >
                  공지글 확인하기
                </Button>
              </Box>
              
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 33%' } }}>
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row', md: 'row' } }}>
                  <Card sx={{
                    minWidth: { xs: 140, sm: 160 },
                    flex: 1,
                    bgcolor: '#FFDDB4', // Material Theme: secondaryContainer
                    borderRadius: 2,
                    p: 3,
                    boxShadow: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }
                  }}>
                    <Typography variant="overline" sx={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: '#633F00' // Material Theme: onSecondaryContainer
                    }}>
                      Model details
                    </Typography>
                    <Typography variant="h6" sx={{
                      fontWeight: 600,
                      mt: 1,
                      fontSize: { xs: '1rem', sm: '1.25rem' }
                    }}>
                      2025년 상반기 연수
                    </Typography>
                    <ArrowOutward sx={{ 
                      fontSize: 20,
                      mt: 2,
                      color: '#633F00' // Material Theme: onSecondaryContainer
                    }} />
                  </Card>
                  
                  <Card sx={{
                    minWidth: { xs: 140, sm: 160 },
                    flex: 1,
                    bgcolor: '#FFDDB4', // Material Theme: secondaryContainer
                    borderRadius: 2,
                    p: 3,
                    boxShadow: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }
                  }}>
                    <Typography variant="overline" sx={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: '#633F00' // Material Theme: onSecondaryContainer
                    }}>
                      Model details
                    </Typography>
                    <Typography variant="h6" sx={{
                      fontWeight: 600,
                      mt: 1,
                      fontSize: { xs: '1rem', sm: '1.25rem' }
                    }}>
                      2025년 하반기 연수
                    </Typography>
                    <ArrowOutward sx={{ 
                      fontSize: 20,
                      mt: 2,
                      color: '#633F00' // Material Theme: onSecondaryContainer
                    }} />
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
          <Typography variant="h2" sx={{
            fontSize: { xs: '2rem', md: '2.5rem' },
            fontWeight: 600,
            letterSpacing: '-0.02em'
          }}>
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
                bgcolor: '#3B608F', // Material Theme: primary
                color: '#FFFFFF', // Material Theme: onPrimary
                borderRadius: '20px',
                px: 4,
                py: 1.5,
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': {
                  bgcolor: '#204876' // Material Theme: onPrimaryContainer
                }
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
                  bgcolor: alpha('#5A5891', 0.08) // Material Theme: tertiary with alpha
                }
              }}
            >
              문의하기
            </Button>
          </Stack>
        </Stack>
      </Container>

      {/* Footer */}
      <Box sx={{ 
        bgcolor: '#1a1a1a',
        color: '#fff',
        pt: 8,
        pb: 4
      }}>
        <Container maxWidth="xl">
          <Grid container spacing={6} justifyContent="center">
            {/* Footer columns */}
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 600,
                  mb: 2,
                  fontSize: '0.875rem'
                }}
              >
                연구회
              </Typography>
              <Stack spacing={1.5}>
                <MuiLink 
                  href="#" 
                  underline="none"
                  sx={{ 
                    color: '#888',
                    fontSize: '0.875rem',
                    '&:hover': { color: '#fff' }
                  }}
                >
                  연구회 소개
                </MuiLink>
                <MuiLink 
                  href="#" 
                  underline="none"
                  sx={{ 
                    color: '#888',
                    fontSize: '0.875rem',
                    '&:hover': { color: '#fff' }
                  }}
                >
                  조직도
                </MuiLink>
                <MuiLink 
                  href="#" 
                  underline="none"
                  sx={{ 
                    color: '#888',
                    fontSize: '0.875rem',
                    '&:hover': { color: '#fff' }
                  }}
                >
                  연혁
                </MuiLink>
                <MuiLink 
                  href="#" 
                  underline="none"
                  sx={{ 
                    color: '#888',
                    fontSize: '0.875rem',
                    '&:hover': { color: '#fff' }
                  }}
                >
                  정기 모임
                </MuiLink>
                <MuiLink 
                  href="#" 
                  underline="none"
                  sx={{ 
                    color: '#888',
                    fontSize: '0.875rem',
                    '&:hover': { color: '#fff' }
                  }}
                >
                  연수 프로그램
                </MuiLink>
              </Stack>
            </Grid>

            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 600,
                  mb: 2,
                  fontSize: '0.875rem'
                }}
              >
                자료공유
              </Typography>
              <Stack spacing={1.5}>
                <MuiLink 
                  href="#" 
                  underline="none"
                  sx={{ 
                    color: '#888',
                    fontSize: '0.875rem',
                    '&:hover': { color: '#fff' }
                  }}
                >
                  AI 도구 활용
                </MuiLink>
                <MuiLink 
                  href="#" 
                  underline="none"
                  sx={{ 
                    color: '#888',
                    fontSize: '0.875rem',
                    '&:hover': { color: '#fff' }
                  }}
                >
                  수업 지도안
                </MuiLink>
                <MuiLink 
                  href="#" 
                  underline="none"
                  sx={{ 
                    color: '#888',
                    fontSize: '0.875rem',
                    '&:hover': { color: '#fff' }
                  }}
                >
                  평가 자료
                </MuiLink>
                <MuiLink 
                  href="#" 
                  underline="none"
                  sx={{ 
                    color: '#888',
                    fontSize: '0.875rem',
                    '&:hover': { color: '#fff' }
                  }}
                >
                  논문 및 보고서
                </MuiLink>
              </Stack>
            </Grid>

            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 600,
                  mb: 2,
                  fontSize: '0.875rem'
                }}
              >
                활용 사례
              </Typography>
              <Stack spacing={1.5}>
                <MuiLink 
                  href="#" 
                  underline="none"
                  sx={{ 
                    color: '#888',
                    fontSize: '0.875rem',
                    '&:hover': { color: '#fff' }
                  }}
                >
                  수업 사례
                </MuiLink>
                <MuiLink 
                  href="#" 
                  underline="none"
                  sx={{ 
                    color: '#888',
                    fontSize: '0.875rem',
                    '&:hover': { color: '#fff' }
                  }}
                >
                  연구 사례
                </MuiLink>
                <MuiLink 
                  href="#" 
                  underline="none"
                  sx={{ 
                    color: '#888',
                    fontSize: '0.875rem',
                    '&:hover': { color: '#fff' }
                  }}
                >
                  우수 실천 사례
                </MuiLink>
              </Stack>
            </Grid>

            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 600,
                  mb: 2,
                  fontSize: '0.875rem'
                }}
              >
                비전
              </Typography>
              <Stack spacing={1.5}>
                <MuiLink 
                  href="#" 
                  underline="none"
                  sx={{ 
                    color: '#888',
                    fontSize: '0.875rem',
                    '&:hover': { color: '#fff' }
                  }}
                >
                  미래 교육
                </MuiLink>
                <MuiLink 
                  href="#" 
                  underline="none"
                  sx={{ 
                    color: '#888',
                    fontSize: '0.875rem',
                    '&:hover': { color: '#fff' }
                  }}
                >
                  AI 교육 정책
                </MuiLink>
                <MuiLink 
                  href="#" 
                  underline="none"
                  sx={{ 
                    color: '#888',
                    fontSize: '0.875rem',
                    '&:hover': { color: '#fff' }
                  }}
                >
                  교육 혁신
                </MuiLink>
              </Stack>
            </Grid>

            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 600,
                  mb: 2,
                  fontSize: '0.875rem'
                }}
              >
                뉴스
              </Typography>
              <Stack spacing={1.5}>
                <MuiLink 
                  href="#" 
                  underline="none"
                  sx={{ 
                    color: '#888',
                    fontSize: '0.875rem',
                    '&:hover': { color: '#fff' }
                  }}
                >
                  공지사항
                </MuiLink>
                <MuiLink 
                  href="#" 
                  underline="none"
                  sx={{ 
                    color: '#888',
                    fontSize: '0.875rem',
                    '&:hover': { color: '#fff' }
                  }}
                >
                  연구회 소식
                </MuiLink>
                <MuiLink 
                  href="#" 
                  underline="none"
                  sx={{ 
                    color: '#888',
                    fontSize: '0.875rem',
                    '&:hover': { color: '#fff' }
                  }}
                >
                  행사 안내
                </MuiLink>
                <MuiLink 
                  href="#" 
                  underline="none"
                  sx={{ 
                    color: '#888',
                    fontSize: '0.875rem',
                    '&:hover': { color: '#fff' }
                  }}
                >
                  교육 뉴스
                </MuiLink>
              </Stack>
            </Grid>
          </Grid>

          {/* Bottom bar */}
          <Divider sx={{ borderColor: '#333', my: 4 }} />
          
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#888',
                fontSize: '0.75rem'
              }}
            >
              © 2025 AIedulog
            </Typography>

            {/* Social links */}
            <Stack direction="row" spacing={2}>
              <IconButton 
                size="small" 
                sx={{ 
                  color: '#888',
                  '&:hover': { color: '#fff' }
                }}
              >
                <YouTube fontSize="small" />
              </IconButton>
              <IconButton 
                size="small" 
                sx={{ 
                  color: '#888',
                  '&:hover': { color: '#fff' }
                }}
              >
                <LinkedIn fontSize="small" />
              </IconButton>
              <IconButton 
                size="small" 
                sx={{ 
                  color: '#888',
                  '&:hover': { color: '#fff' }
                }}
              >
                <Twitter fontSize="small" />
              </IconButton>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* 모바일 플로팅 메뉴 버튼 */}
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
            bgcolor: '#3B608F',
            '&:hover': {
              bgcolor: '#204876'
            }
          }}
        >
          <MenuIcon />
        </Fab>
      </Box>

      {/* FeedSidebar (모바일 Drawer) */}
      <FeedSidebar 
        user={user} 
        profile={profile}
        mobileOpen={mobileDrawerOpen}
        onMobileToggle={() => setMobileDrawerOpen(false)}
      />
    </Box>
  )
}