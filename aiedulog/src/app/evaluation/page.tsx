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

export default function EvaluationPage() {
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
              평가 자료
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
              AI 시대에 맞는 새로운 평가 방법과 도구를 제공합니다.
            </Typography>
          </Stack>
        </Container>
      </Box>

      {/* Content Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Stack spacing={6}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
              혁신적인 평가 방법
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              전통적인 평가 방식을 넘어서 AI와 디지털 기술을 활용한 새로운 평가 패러다임을 제시합니다.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
              주요 평가 도구
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              • AI 기반 자동 채점 시스템<br/>
              • 포트폴리오 기반 과정 평가<br/>
              • 실시간 피드백 시스템<br/>
              • 개인화된 학습 진단 도구<br/>
              • 동료 평가 및 자기 평가 시스템<br/>
              • 프로젝트 기반 종합 평가
            </Typography>
          </Box>
        </Stack>
      </Container>
    </Box>
  )

  return <CMSContent sectionKey="evaluation" fallbackContent={fallbackContent} />
}