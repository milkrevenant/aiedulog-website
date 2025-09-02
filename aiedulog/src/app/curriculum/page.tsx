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

export default function CurriculumPage() {
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
              수업 지도안
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
              AI와 디지털 기술을 활용한 혁신적인 수업 지도안을 제공합니다.
            </Typography>
          </Stack>
        </Container>
      </Box>

      {/* Content Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Stack spacing={6}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
              AI 활용 수업 지도안
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              최신 AI 기술을 교육 현장에 효과적으로 적용할 수 있는 다양한 수업 지도안을 제공합니다.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
              주요 내용
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              • ChatGPT를 활용한 창의적 글쓰기 수업<br/>
              • AI 이미지 생성 도구를 활용한 미술 교육<br/>
              • 코딩 교육을 위한 AI 보조 도구 활용<br/>
              • 개인화 학습을 위한 적응형 AI 시스템 활용
            </Typography>
          </Box>
        </Stack>
      </Container>
    </Box>
  )

  return <CMSContent sectionKey="커리큘럼" fallbackContent={fallbackContent} />
}