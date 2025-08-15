'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { 
  Box, 
  Container, 
  Grid, 
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
  alpha
} from '@mui/material'
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
  Security
} from '@mui/icons-material'
import { usePermission } from '@/hooks/usePermission'
import AppHeader from '@/components/AppHeader'

// 역할별 색상 및 아이콘
const roleConfig = {
  admin: {
    label: '관리자',
    color: 'error' as const,
    icon: <AdminPanelSettings />,
    description: '시스템 전체 관리 권한'
  },
  moderator: {
    label: '운영진',
    color: 'warning' as const,
    icon: <SupervisorAccount />,
    description: '콘텐츠 및 사용자 관리'
  },
  verified: {
    label: '인증 교사',
    color: 'success' as const,
    icon: <VerifiedUser />,
    description: '칼럼 작성 및 강의 등록'
  },
  member: {
    label: '일반 회원',
    color: 'info' as const,
    icon: <Person />,
    description: '기본 커뮤니티 활동'
  }
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const theme = useTheme()
  
  // 권한 확인 hooks
  const canManageUsers = usePermission('manage_users')
  const canManageContent = usePermission('manage_content')
  const canWriteColumns = usePermission('write_columns')
  const canViewAnalytics = usePermission('view_analytics')

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }
      
      setUser(user)
      
      // 프로필 및 권한 정보 가져오기
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(profileData)
      setLoading(false)
    }
    getUser()
  }, [router, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Stack spacing={3}>
          <Skeleton variant="rectangular" height={200} />
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map((i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Skeleton variant="rectangular" height={150} />
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Container>
    )
  }

  if (!user || !profile) return null

  const role = profile.role || 'member'
  const roleInfo = roleConfig[role as keyof typeof roleConfig]

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', pb: 4 }}>
      {/* 공통 헤더 */}
      <AppHeader user={user} profile={profile} />
      
      {/* 마이페이지 서브 헤더 */}
      <Paper elevation={0} sx={{ borderRadius: 0, mb: 3 }}>
        <Container maxWidth="lg">
          <Box sx={{ py: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={3} alignItems="center">
                <Avatar 
                  sx={{ 
                    width: 56, 
                    height: 56,
                    bgcolor: alpha(theme.palette[roleInfo.color].main, 0.1),
                    color: roleInfo.color + '.main'
                  }}
                >
                  {roleInfo.icon}
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    마이페이지
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip 
                      label={roleInfo.label}
                      color={roleInfo.color}
                      size="small"
                      icon={roleInfo.icon}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<Logout />}
                onClick={handleSignOut}
              >
                로그아웃
              </Button>
            </Stack>
          </Box>
        </Container>
        <LinearProgress variant="determinate" value={100} sx={{ height: 2 }} />
      </Paper>

      <Container maxWidth="lg">
        {/* 역할별 환영 메시지 */}
        <Alert 
          severity={roleInfo.color}
          icon={roleInfo.icon}
          sx={{ mb: 3 }}
        >
          <Typography variant="subtitle1" fontWeight="medium">
            {roleInfo.label} 권한으로 로그인하셨습니다
          </Typography>
          <Typography variant="body2">
            {roleInfo.description}
          </Typography>
        </Alert>

        {/* 통계 카드 */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      작성한 글
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      0
                    </Typography>
                  </Box>
                  <Article color="primary" sx={{ fontSize: 40, opacity: 0.3 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          
          {(role === 'admin' || role === 'moderator') && (
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        전체 사용자
                      </Typography>
                      <Typography variant="h4" fontWeight="bold">
                        {profile.role === 'admin' ? '2' : 'N/A'}
                      </Typography>
                    </Box>
                    <People color="secondary" sx={{ fontSize: 40, opacity: 0.3 }} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}
          
          {role === 'verified' && (
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        칼럼 작성
                      </Typography>
                      <Typography variant="h4" fontWeight="bold">
                        0
                      </Typography>
                    </Box>
                    <WorkspacePremium color="success" sx={{ fontSize: 40, opacity: 0.3 }} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      댓글
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      0
                    </Typography>
                  </Box>
                  <TrendingUp color="info" sx={{ fontSize: 40, opacity: 0.3 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      좋아요
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      0
                    </Typography>
                  </Box>
                  <Campaign color="warning" sx={{ fontSize: 40, opacity: 0.3 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* 역할별 기능 메뉴 */}
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
          빠른 메뉴
        </Typography>
        
        <Grid container spacing={3}>
          {/* 모든 사용자 공통 메뉴 */}
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack spacing={2}>
                  <PostAdd color="primary" sx={{ fontSize: 40 }} />
                  <Typography variant="h6">게시글 작성</Typography>
                  <Typography variant="body2" color="text.secondary">
                    커뮤니티에 새로운 글을 작성합니다
                  </Typography>
                </Stack>
              </CardContent>
              <CardActions>
                <Button size="small" color="primary">작성하기</Button>
              </CardActions>
            </Card>
          </Grid>

          {/* Admin 전용 메뉴 */}
          {role === 'admin' && (
            <>
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <People color="error" sx={{ fontSize: 40 }} />
                      <Typography variant="h6">사용자 관리</Typography>
                      <Typography variant="body2" color="text.secondary">
                        회원 권한 및 상태 관리
                      </Typography>
                    </Stack>
                  </CardContent>
                  <CardActions>
                    <Button size="small" color="error">관리하기</Button>
                  </CardActions>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Settings color="error" sx={{ fontSize: 40 }} />
                      <Typography variant="h6">시스템 설정</Typography>
                      <Typography variant="body2" color="text.secondary">
                        플랫폼 전체 설정 관리
                      </Typography>
                    </Stack>
                  </CardContent>
                  <CardActions>
                    <Button size="small" color="error">설정하기</Button>
                  </CardActions>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Analytics color="error" sx={{ fontSize: 40 }} />
                      <Typography variant="h6">통계 분석</Typography>
                      <Typography variant="body2" color="text.secondary">
                        플랫폼 사용 통계 확인
                      </Typography>
                    </Stack>
                  </CardContent>
                  <CardActions>
                    <Button size="small" color="error">보기</Button>
                  </CardActions>
                </Card>
              </Grid>
            </>
          )}

          {/* Moderator 전용 메뉴 */}
          {role === 'moderator' && (
            <>
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Report color="warning" sx={{ fontSize: 40 }} />
                      <Typography variant="h6">신고 관리</Typography>
                      <Typography variant="body2" color="text.secondary">
                        신고된 콘텐츠 검토
                      </Typography>
                    </Stack>
                  </CardContent>
                  <CardActions>
                    <Button size="small" color="warning">관리하기</Button>
                  </CardActions>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <FolderShared color="warning" sx={{ fontSize: 40 }} />
                      <Typography variant="h6">콘텐츠 관리</Typography>
                      <Typography variant="body2" color="text.secondary">
                        게시글 및 댓글 관리
                      </Typography>
                    </Stack>
                  </CardContent>
                  <CardActions>
                    <Button size="small" color="warning">관리하기</Button>
                  </CardActions>
                </Card>
              </Grid>
            </>
          )}

          {/* Verified 전용 메뉴 */}
          {role === 'verified' && (
            <>
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Assignment color="success" sx={{ fontSize: 40 }} />
                      <Typography variant="h6">칼럼 작성</Typography>
                      <Typography variant="body2" color="text.secondary">
                        전문 칼럼 작성 및 관리
                      </Typography>
                    </Stack>
                  </CardContent>
                  <CardActions>
                    <Button size="small" color="success">작성하기</Button>
                  </CardActions>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <School color="success" sx={{ fontSize: 40 }} />
                      <Typography variant="h6">강의 등록</Typography>
                      <Typography variant="body2" color="text.secondary">
                        교육 강의 콘텐츠 등록
                      </Typography>
                    </Stack>
                  </CardContent>
                  <CardActions>
                    <Button size="small" color="success">등록하기</Button>
                  </CardActions>
                </Card>
              </Grid>
            </>
          )}

          {/* Member 추가 메뉴 */}
          {role === 'member' && (
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Security color="info" sx={{ fontSize: 40 }} />
                    <Typography variant="h6">인증 신청</Typography>
                    <Typography variant="body2" color="text.secondary">
                      교사 인증을 신청하여 더 많은 기능을 사용하세요
                    </Typography>
                  </Stack>
                </CardContent>
                <CardActions>
                  <Button size="small" color="info">신청하기</Button>
                </CardActions>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* 권한별 안내 메시지 */}
        <Box sx={{ mt: 4 }}>
          <Paper sx={{ p: 3, bgcolor: alpha(theme.palette[roleInfo.color].main, 0.05) }}>
            <Typography variant="h6" gutterBottom>
              {roleInfo.label} 권한으로 할 수 있는 일
            </Typography>
            {role === 'admin' && (
              <Stack spacing={1}>
                <Typography variant="body2">• 모든 사용자 계정 및 권한 관리</Typography>
                <Typography variant="body2">• 시스템 설정 및 구성 변경</Typography>
                <Typography variant="body2">• 플랫폼 통계 및 분석 보기</Typography>
                <Typography variant="body2">• 모든 콘텐츠 수정 및 삭제</Typography>
                <Typography variant="body2">• 공지사항 작성 및 발송</Typography>
              </Stack>
            )}
            {role === 'moderator' && (
              <Stack spacing={1}>
                <Typography variant="body2">• 부적절한 콘텐츠 관리 및 삭제</Typography>
                <Typography variant="body2">• 신고된 콘텐츠 검토 및 처리</Typography>
                <Typography variant="body2">• 게시글 고정 및 강조</Typography>
                <Typography variant="body2">• 커뮤니티 규칙 시행</Typography>
              </Stack>
            )}
            {role === 'verified' && (
              <Stack spacing={1}>
                <Typography variant="body2">• 전문 칼럼 작성 및 발행</Typography>
                <Typography variant="body2">• 교육 강의 콘텐츠 등록</Typography>
                <Typography variant="body2">• 교육 자료 업로드 (용량 제한 증가)</Typography>
                <Typography variant="body2">• 구인구직 게시판 이용</Typography>
                <Typography variant="body2">• 인증 배지 표시</Typography>
              </Stack>
            )}
            {role === 'member' && (
              <Stack spacing={1}>
                <Typography variant="body2">• 게시글 및 댓글 작성</Typography>
                <Typography variant="body2">• 콘텐츠 좋아요 및 북마크</Typography>
                <Typography variant="body2">• 자신의 콘텐츠 수정 및 삭제</Typography>
                <Typography variant="body2">• 커뮤니티 활동 참여</Typography>
                <Typography variant="body2" color="primary">
                  💡 교사 인증을 받으면 더 많은 기능을 사용할 수 있습니다!
                </Typography>
              </Stack>
            )}
          </Paper>
        </Box>
      </Container>
    </Box>
  )
}