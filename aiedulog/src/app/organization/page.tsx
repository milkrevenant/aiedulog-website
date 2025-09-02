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

export default function OrganizationPage() {
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
              조직 소개
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
              전남에듀테크교육연구회의 조직 구성과 역사를 소개합니다.
            </Typography>
          </Stack>
        </Container>
      </Box>

      {/* Content Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Stack spacing={6}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
              조직 구성
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              전남 지역의 교육 혁신을 이끄는 다양한 분야의 전문가들로 구성되어 있습니다.
            </Typography>
          </Box>

          <Box id="history">
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
              연구회 연혁
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              • 2020년: 전남에듀테크교육연구회 설립<br/>
              • 2021년: 첫 AI 교육 세미나 개최<br/>
              • 2022년: 교육청과 협력 사업 시작<br/>
              • 2023년: 전국 교육 혁신 우수사례 선정<br/>
              • 2024년: 디지털 교육 플랫폼 구축<br/>
              • 2025년: MCP 기반 교육 시스템 도입
            </Typography>
          </Box>
        </Stack>
      </Container>
    </Box>
  )

  return <CMSContent sectionKey="연구회소개" fallbackContent={fallbackContent} />
}