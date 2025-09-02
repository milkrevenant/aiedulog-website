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

export default function VisionPage() {
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
              연구회 비전
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
              미래 교육을 위한 AI 기술 활용과 교육 혁신을 통해 학습자 중심의 교육 환경을 만들어 갑니다.
            </Typography>
          </Stack>
        </Container>
      </Box>

      {/* Content Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Stack spacing={6}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
              우리의 목표
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              전남에듀테크교육연구회는 AI와 디지털 기술을 활용한 교육 혁신을 통해 학습자의 잠재력을 최대한 발휘할 수 있는 교육 환경을 조성하는 것을 목표로 합니다.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
              핵심 가치
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              • 학습자 중심의 개인화된 교육<br/>
              • AI 기술을 활용한 효율적인 교육 방법<br/>
              • 교사와 학생 모두의 성장을 위한 지속적인 연구<br/>
              • 미래 사회에 필요한 역량 개발
            </Typography>
          </Box>
        </Stack>
      </Container>
    </Box>
  )

  return <CMSContent sectionKey="vision" fallbackContent={fallbackContent} />
}