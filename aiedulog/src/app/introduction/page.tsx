'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Stack,
  Avatar,
  Card,
  CardContent,
  Chip,
  useTheme,
  alpha,
  CircularProgress,
  Grid
} from '@mui/material'
import { School, Groups, EmojiEvents } from '@mui/icons-material'
import AppHeader from '@/components/AppHeader'

interface ResearchMember {
  id: string
  name: string
  position: string
  role_title: string | null
  organization: string
  specialty: string | null
  photo_url: string | null
  display_order: number
}

export default function IntroductionPage() {
  const theme = useTheme()
  const [members, setMembers] = useState<ResearchMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/research-members')
      if (response.ok) {
        const data = await response.json()
        setMembers(data)
      }
    } catch (error) {
      console.error('Failed to fetch members:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPositionColor = (position: string) => {
    switch (position) {
      case '회장': return { bg: '#FFD700', text: '#000' }
      case '부회장': return { bg: '#C0C0C0', text: '#000' }
      default: return { bg: theme.palette.primary.main, text: '#fff' }
    }
  }

  const getPositionIcon = (position: string) => {
    switch (position) {
      case '회장': return <EmojiEvents />
      case '부회장': return <Groups />
      default: return <School />
    }
  }

  // 직위별로 그룹화
  const president = members.find(m => m.position === '회장')
  const vicePresident = members.find(m => m.position === '부회장')
  const coreMembers = members.filter(m => m.position === '중심연구회원')

  const MemberCard = ({ member, featured = false }: { member: ResearchMember, featured?: boolean }) => {
    const colors = getPositionColor(member.position)

    return (
      <Card
        elevation={0}
        sx={{
          height: '100%',
          border: '1px solid',
          borderColor: featured ? colors.bg : 'divider',
          borderRadius: 3,
          transition: 'all 0.3s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 8px 24px ${alpha(colors.bg, 0.2)}`,
          }
        }}
      >
        <CardContent sx={{ p: 3, textAlign: 'center' }}>
          <Avatar
            src={member.photo_url || undefined}
            sx={{
              width: featured ? 120 : 100,
              height: featured ? 120 : 100,
              mx: 'auto',
              mb: 2,
              border: '4px solid',
              borderColor: colors.bg,
              bgcolor: member.photo_url ? 'transparent' : alpha(colors.bg, 0.1),
              fontSize: featured ? '2.5rem' : '2rem',
              color: colors.bg,
            }}
          >
            {!member.photo_url && member.name[0]}
          </Avatar>

          <Chip
            icon={getPositionIcon(member.position)}
            label={member.position}
            size="small"
            sx={{
              mb: 1.5,
              bgcolor: colors.bg,
              color: colors.text,
              fontWeight: 600,
              '& .MuiChip-icon': { color: colors.text }
            }}
          />

          {member.role_title && (
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              {member.role_title}
            </Typography>
          )}

          <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
            {member.name}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {member.organization}
          </Typography>

          {member.specialty && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                전문 분야
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="center" gap={0.5}>
                {member.specialty.split(',').map((spec, idx) => (
                  <Chip
                    key={idx}
                    label={spec.trim()}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: 24 }}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FAFCFE' }}>
      <AppHeader />

      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${alpha('#2E86AB', 0.08)} 0%, ${alpha('#A23B72', 0.08)} 100%)`,
          py: { xs: 6, sm: 8, md: 10 },
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
                color: '#191C20',
              }}
            >
              전남에듀테크교육연구회
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
              AI와 에듀테크를 활용한 혁신적인 교육 방법론을 연구하고,
              <br />
              현장 교사들의 역량 강화를 위해 함께 노력하는 연구 공동체입니다.
            </Typography>
          </Stack>
        </Container>
      </Box>

      {/* Members Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={8}>
            {/* 회장 & 부회장 */}
            {(president || vicePresident) && (
              <Box>
                <Typography variant="h4" fontWeight={700} textAlign="center" sx={{ mb: 4 }}>
                  연구회 임원
                </Typography>
                <Grid container spacing={4} justifyContent="center">
                  {president && (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <MemberCard member={president} featured />
                    </Grid>
                  )}
                  {vicePresident && (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <MemberCard member={vicePresident} featured />
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}

            {/* 중심연구회원 */}
            {coreMembers.length > 0 && (
              <Box>
                <Typography variant="h4" fontWeight={700} textAlign="center" sx={{ mb: 4 }}>
                  중심연구회원
                </Typography>
                <Grid container spacing={3}>
                  {coreMembers.map((member) => (
                    <Grid key={member.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                      <MemberCard member={member} />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* 멤버가 없을 때 */}
            {members.length === 0 && !loading && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Groups sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  등록된 연구회원이 없습니다.
                </Typography>
                <Typography variant="body2" color="text.disabled">
                  관리자 페이지에서 연구회원을 등록해주세요.
                </Typography>
              </Box>
            )}
          </Stack>
        )}
      </Container>

      {/* Vision Section */}
      <Box sx={{ bgcolor: alpha('#2E86AB', 0.03), py: 8 }}>
        <Container maxWidth="md">
          <Stack spacing={4} textAlign="center">
            <Typography variant="h4" fontWeight={700}>
              우리의 비전
            </Typography>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" color="primary" fontWeight={600} sx={{ mb: 1 }}>
                  교육 혁신의 선도
                </Typography>
                <Typography color="text.secondary">
                  AI와 에듀테크를 활용한 새로운 교육 패러다임을 연구하고 현장에 적용합니다.
                </Typography>
              </Box>
              <Box>
                <Typography variant="h6" color="primary" fontWeight={600} sx={{ mb: 1 }}>
                  교사 역량 강화
                </Typography>
                <Typography color="text.secondary">
                  연수 프로그램과 자료 공유를 통해 교사들의 디지털 역량을 높입니다.
                </Typography>
              </Box>
              <Box>
                <Typography variant="h6" color="primary" fontWeight={600} sx={{ mb: 1 }}>
                  협력적 연구 문화
                </Typography>
                <Typography color="text.secondary">
                  함께 배우고 성장하는 열린 연구 공동체를 지향합니다.
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  )
}
