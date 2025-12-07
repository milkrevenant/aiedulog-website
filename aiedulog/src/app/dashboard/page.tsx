'use client'
import { ActionCard } from '@/components/common/ActionCard'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/hooks'
import { createClient } from '@/lib/supabase/client'
import AuthGuard from '@/components/AuthGuard'
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Chip,
  Stack,
  IconButton,
  Skeleton,
  Alert,
  LinearProgress,
  useTheme,
  alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import {
  Dashboard,
  People,
  Article,
  Settings,
  Analytics,
  School,
  AdminPanelSettings,
  SupervisorAccount,
  VerifiedUser,
  Person,
  Logout,
  PostAdd,
  FolderShared,
  Campaign,
  Report,
  TrendingUp,
  Groups,
  Assignment,
  WorkspacePremium,
  Security,
  PhotoCamera,
} from '@mui/icons-material'
import { usePermission } from '@/hooks/usePermission'
import AppHeader from '@/components/AppHeader'
import { getUserIdentity } from '@/lib/identity/helpers'

// 역할별 색상 및 아이콘
const roleConfig = {
  admin: {
    label: '관리자',
    color: 'error' as const,
    icon: <AdminPanelSettings />,
    description: '시스템 전체 관리 권한',
  },
  moderator: {
    label: '운영진',
    color: 'warning' as const,
    icon: <SupervisorAccount />,
    description: '콘텐츠 및 사용자 관리',
  },
  verified: {
    label: '인증 교사',
    color: 'success' as const,
    icon: <VerifiedUser />,
    description: '칼럼 작성 및 강의 등록',
  },
  member: {
    label: '일반 회원',
    color: 'info' as const,
    icon: <Person />,
    description: '기본 커뮤니티 활동',
  },
}

const DashboardContent = () => {
  const { user, profile, loading, isAuthenticated, signOut } = useAuth()
  const router = useRouter()
  const theme = useTheme()
  const supabase = createClient()

  // 권한 확인 hooks
  const { can } = usePermission()
  
  // 사용자 수 상태
  const [totalUsers, setTotalUsers] = useState<number>(0)

  // Loading State
  if (loading) {
    return <LoadingState message="사용자 정보를 불러오는 중입니다..." />
  }

  if (!isAuthenticated || !user || !profile) return null

  const role = profile.role || 'member'
  const roleInfo = roleConfig[role as keyof typeof roleConfig]

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
      router.push('/auth/login')
    }
  }

  // Quick Actions Configuration
  const getQuickActions = () => {
    const actions = [
      {
        title: '게시글 작성',
        description: '커뮤니티에 새로운 글을 작성합니다',
        icon: <PostAdd />,
        color: theme.palette.primary.main,
        onClick: () => router.push('/board/new'), // Assuming route
        show: true
      },
      {
         title: '인증 신청',
         description: '교사 인증을 신청하여 더 많은 기능을 사용하세요',
         icon: <Security />,
         color: theme.palette.info.main,
         onClick: () => router.push('/settings/profile'),
         show: role === 'member'
      },
      // Admin Actions
      {
        title: '사용자 관리',
        description: '회원 권한 및 상태 관리',
        icon: <People />,
        color: theme.palette.error.main,
        onClick: () => router.push('/admin/users'),
        show: role === 'admin'
      },
      {
        title: '시스템 설정',
        description: '플랫폼 전체 설정 관리',
        icon: <Settings />,
        color: theme.palette.error.main,
        onClick: () => router.push('/admin/settings'),
        show: role === 'admin'
      },
      {
        title: '통계 분석',
        description: '플랫폼 사용 통계 확인',
        icon: <Analytics />,
        color: theme.palette.error.main,
        onClick: () => router.push('/admin/analytics'),
        show: role === 'admin'
      },
      // Moderator Actions
      {
        title: '신고 관리',
        description: '신고된 콘텐츠 검토',
        icon: <Report />,
        color: theme.palette.warning.main,
        onClick: () => router.push('/admin/reports'),
        show: role === 'moderator'
      },
      {
         title: '콘텐츠 관리',
         description: '게시글 및 댓글 관리',
         icon: <FolderShared />,
         color: theme.palette.warning.main,
         onClick: () => router.push('/admin/content'),
         show: role === 'moderator'
      },
      // Verified Actions
      {
        title: '칼럼 작성',
        description: '전문 칼럼 작성 및 관리',
        icon: <Assignment />,
        color: theme.palette.success.main,
        onClick: () => router.push('/columns/new'),
        show: role === 'verified'
      },
      {
        title: '강의 등록',
        description: '교육 강의 콘텐츠 등록',
        icon: <School />,
        color: theme.palette.success.main,
        onClick: () => router.push('/lectures/new'), // Corrected route
        show: role === 'verified'
      }
    ]
    return actions.filter(action => action.show)
  }

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', pb: 8 }}>
      <AppHeader user={user} profile={profile} />
      
      {/* Welcome Header */}
      <Paper elevation={0} sx={{ borderRadius: 0, mb: 4, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Box sx={{ py: 4 }}>
             <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={3}>
               <Stack direction="row" spacing={3} alignItems="center">
                 <Avatar
                   src={profile?.avatar_url || undefined}
                   sx={{
                     width: { xs: 64, md: 80 },
                     height: { xs: 64, md: 80 },
                     bgcolor: alpha(theme.palette[roleInfo.color].main, 0.1),
                     color: roleInfo.color + '.main',
                     border: 2,
                     borderColor: 'background.paper',
                     boxShadow: 2
                   }}
                 >
                   {!profile?.avatar_url && roleInfo.icon}
                 </Avatar>
                 <Box>
                   <Typography variant="h4" fontWeight="bold" gutterBottom>
                     반갑습니다, {profile?.full_name || user.email?.split('@')[0]}님!
                   </Typography>
                   <Stack direction="row" spacing={1} alignItems="center">
                     <Chip
                       label={roleInfo.label}
                       color={roleInfo.color}
                       size="small"
                       icon={roleInfo.icon}
                       variant="outlined"
                     />
                     <Typography variant="body2" color="text.secondary">
                       {user.email}
                     </Typography>
                   </Stack>
                 </Box>
               </Stack>
               
               <Stack direction="row" spacing={1}>
                  <Button variant="outlined" startIcon={<Settings />} onClick={() => router.push('/settings/profile')}>
                    설정
                  </Button>
                  <Button variant="outlined" color="error" startIcon={<Logout />} onClick={handleSignOut}>
                    로그아웃
                  </Button>
               </Stack>
             </Stack>
          </Box>
        </Container>
      </Paper>

      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Main Content Area */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={4}>
              {/* Stats Overview */}
              <Box>
                <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
                  활동 요약
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Card elevation={0} sx={{ border: 1, borderColor: 'divider', height: '100%' }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Typography variant="caption" color="text.secondary">작성 글</Typography>
                        <Stack direction="row" alignItems="center" spacing={1} mt={1}>
                          <Article color="action" fontSize="small" />
                          <Typography variant="h6" fontWeight="bold">0</Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                   <Grid size={{ xs: 6, sm: 3 }}>
                    <Card elevation={0} sx={{ border: 1, borderColor: 'divider', height: '100%' }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                         <Typography variant="caption" color="text.secondary">댓글</Typography>
                         <Stack direction="row" alignItems="center" spacing={1} mt={1}>
                           <TrendingUp color="info" fontSize="small" />
                           <Typography variant="h6" fontWeight="bold">0</Typography>
                         </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                   <Grid size={{ xs: 6, sm: 3 }}>
                    <Card elevation={0} sx={{ border: 1, borderColor: 'divider', height: '100%' }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                         <Typography variant="caption" color="text.secondary">좋아요</Typography>
                         <Stack direction="row" alignItems="center" spacing={1} mt={1}>
                           <Campaign color="warning" fontSize="small" />
                           <Typography variant="h6" fontWeight="bold">0</Typography>
                         </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>

              {/* Recent Activity */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                   <Typography variant="h6" fontWeight="bold">최근 활동</Typography>
                   <Button size="small">모두 보기</Button>
                </Stack>
                <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
                   <EmptyState 
                      message="아직 최근 활동 내역이 없습니다."
                      icon={<Dashboard sx={{ fontSize: 48, color: 'text.disabled' }} />} 
                   />
                </Card>
              </Box>

               {/* Role Description */}
               <Box>
                  <Alert severity={roleInfo.color} icon={roleInfo.icon} sx={{ borderRadius: 2 }}>
                     <Typography variant="subtitle2" fontWeight="bold" gutterBottom>{roleInfo.label} 권한 안내</Typography>
                     <Typography variant="body2">{roleInfo.description}</Typography>
                  </Alert>
               </Box>
            </Stack>
          </Grid>

          {/* Sidebar / Quick Actions */}
          <Grid size={{ xs: 12, md: 4 }}>
             <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
                빠른 메뉴
             </Typography>
             <Grid container spacing={2}>
               {getQuickActions().map((action, index) => (
                 <Grid size={{ xs: 12, sm: 6, md: 12 }} key={index}>
                    <ActionCard
                      title={action.title}
                      description={action.description}
                      icon={action.icon}
                      color={action.color}
                      onClick={action.onClick}
                    />
                 </Grid>
               ))}
             </Grid>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard requireAuth>
      <DashboardContent />
    </AuthGuard>
  )
}
