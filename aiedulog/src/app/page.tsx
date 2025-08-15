'use client'

import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  CardContent,
  Stack,
  Chip,
  useTheme,
  alpha
} from '@mui/material'
import Link from 'next/link'
import { 
  School, 
  People, 
  Forum, 
  Share, 
  Work, 
  Campaign,
  AutoAwesome,
  TrendingUp
} from '@mui/icons-material'
import Navbar from '@/components/Navbar'

export default function Home() {
  const theme = useTheme()

  const features = [
    {
      icon: <Share fontSize="large" />,
      title: '자료 공유',
      description: '수업 자료와 교육 콘텐츠를 선생님들과 공유하세요',
      color: theme.palette.primary.main,
    },
    {
      icon: <Forum fontSize="large" />,
      title: '소통 공간',
      description: '수업 고민과 경험을 나누는 선생님들의 커뮤니티',
      color: theme.palette.secondary.main,
    },
    {
      icon: <School fontSize="large" />,
      title: '강의 홍보',
      description: '에듀테크 관련 강의와 연수 정보를 공유합니다',
      color: theme.palette.info.main,
    },
    {
      icon: <Work fontSize="large" />,
      title: '강사 구인',
      description: '전문 강사를 찾고 기회를 연결합니다',
      color: theme.palette.warning.main,
    },
    {
      icon: <AutoAwesome fontSize="large" />,
      title: '전문 칼럼',
      description: '인증된 전문가의 에듀테크 인사이트',
      color: theme.palette.error.main,
    },
    {
      icon: <People fontSize="large" />,
      title: '연구회 활동',
      description: '전남에듀테크교육연구회의 다양한 활동 소식',
      color: theme.palette.success.main,
    },
  ]

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
          pt: 12,
          pb: 8,
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={4} alignItems="center" textAlign="center">
            <Chip 
              label="전남에듀테크교육연구회" 
              color="primary" 
              sx={{ px: 2, py: 2.5, fontSize: '0.9rem' }}
            />
            
            <Typography 
              variant="h1" 
              sx={{ 
                fontWeight: 700,
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              AIedulog
            </Typography>
            
            <Typography 
              variant="h5" 
              color="text.secondary"
              sx={{ maxWidth: 600, fontWeight: 400 }}
            >
              선생님들이 함께 만들어가는 에듀테크 커뮤니티
            </Typography>
            
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ maxWidth: 700 }}
            >
              수업 자료를 공유하고, 교육 고민을 나누며, 
              함께 성장하는 전남 선생님들의 공간입니다
            </Typography>

            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button
                component={Link}
                href="/auth/login"
                variant="contained"
                size="large"
                sx={{ 
                  px: 4,
                  py: 1.5,
                  borderRadius: 10,
                }}
              >
                시작하기
              </Button>
              <Button
                component={Link}
                href="/about"
                variant="outlined"
                size="large"
                sx={{ 
                  px: 4,
                  py: 1.5,
                  borderRadius: 10,
                }}
              >
                연구회 소개
              </Button>
            </Stack>

            {/* Stats */}
            <Grid container spacing={3} sx={{ mt: 4, maxWidth: 600 }}>
              <Grid item xs={4}>
                <Typography variant="h4" fontWeight="bold" color="primary.main">
                  500+
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  활동 선생님
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="h4" fontWeight="bold" color="secondary.main">
                  1,200+
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  공유 자료
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="h4" fontWeight="bold" color="tertiary.main">
                  50+
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  월간 강의
                </Typography>
              </Grid>
            </Grid>
          </Stack>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography 
          variant="h3" 
          textAlign="center" 
          fontWeight="600"
          sx={{ mb: 6 }}
        >
          주요 기능
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {features.map((feature, index) => (
            <Box
              key={index}
              sx={{
                width: {
                  xs: 'calc(50% - 12px)',
                  sm: 'calc(50% - 12px)',
                  md: 'calc(33.333% - 16px)',
                },
              }}
            >
              <Card
                sx={{
                  width: '100%',
                  height: 220,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[8],
                    borderColor: feature.color,
                  },
                }}
              >
                <CardContent sx={{ 
                  p: 3,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(feature.color, 0.1),
                      color: feature.color,
                      mb: 2,
                      flexShrink: 0,
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" fontWeight="600" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      lineHeight: 1.6,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      </Container>

      {/* CTA Section */}
      <Box
        sx={{
          bgcolor: alpha(theme.palette.primary.main, 0.04),
          py: 8,
        }}
      >
        <Container maxWidth="md">
          <Stack spacing={3} alignItems="center" textAlign="center">
            <TrendingUp sx={{ fontSize: 48, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight="600">
              함께 성장하는 에듀테크 커뮤니티
            </Typography>
            <Typography variant="body1" color="text.secondary" maxWidth={500}>
              전남에듀테크교육연구회와 함께 미래 교육을 준비하세요.
              다양한 선생님들과 경험을 나누고 함께 성장할 수 있습니다.
            </Typography>
            <Button
              component={Link}
              href="/auth/login"
              variant="contained"
              size="large"
              sx={{ 
                px: 5,
                py: 1.5,
                borderRadius: 10,
                mt: 2,
              }}
            >
              지금 참여하기
            </Button>
          </Stack>
        </Container>
      </Box>
    </Box>
  )
}