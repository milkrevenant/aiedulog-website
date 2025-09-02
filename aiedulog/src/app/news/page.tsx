'use client'

import { CMSContent } from '@/components/CMSContent'
import { 
  Box, 
  Container, 
  Typography, 
  Stack,
  useTheme,
  alpha 
} from '@mui/material'

export default function NewsPage() {
  const theme = useTheme()
  
  // Fallback content for when CMS content is not available
  const fallbackContent = (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          py: { xs: 6, sm: 8, md: 12 },
          px: 2,
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={3} alignItems="center" textAlign="center">
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                fontWeight: 700,
                background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              연구회 소식
            </Typography>
            <Typography
              variant="h5"
              color="text.secondary"
              sx={{
                maxWidth: 800,
                fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
                lineHeight: 1.8,
              }}
            >
              전남에듀테크교육연구회의 최신 소식과 교육 정보를 전해드립니다.
            </Typography>
          </Stack>
        </Container>
      </Box>

      {/* Content Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Stack spacing={6}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
              최신 소식
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              연구회의 다양한 활동과 성과, 그리고 교육 현장의 변화를 알려드립니다.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
              공지사항
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              • 2025년 상반기 연수 프로그램 안내<br/>
              • 정기 모임 일정 공지<br/>
              • AI 교육 도구 활용 세미나 개최<br/>
              • 우수 교육 사례 공모전 안내
            </Typography>
          </Box>
        </Stack>
      </Container>
    </Box>
  )

  return <CMSContent sectionKey="news" fallbackContent={fallbackContent} />
}