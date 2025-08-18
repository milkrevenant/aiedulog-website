'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { usePermission } from '@/hooks/usePermission';
import AppHeader from '@/components/AppHeader';
import AuthGuard from '@/components/AuthGuard';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CircularProgress,
  CardContent,
  Stack,
  Avatar,
  Chip,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  SupervisorAccount,
  Assessment,
  Forum,
  School,
  TrendingUp,
  Settings,
  Notifications,
  Security,
  Storage,
  Email,
  ArrowForward,
  People,
  Article,
  Comment,
  ThumbUp,
  Visibility,
  AdminPanelSettings,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';

interface Statistics {
  totalUsers: number;
  newUsersToday: number;
  totalPosts: number;
  totalComments: number;
  activeUsers: number;
  verifiedTeachers: number;
}

function AdminDashboardContent() {
  const router = useRouter();
  const supabase = createClient();
  const { user, can, isAdmin, isModerator, loading: authLoading } = usePermission();
  const [profile, setProfile] = useState<any>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [stats, setStats] = useState<Statistics>({
    totalUsers: 0,
    newUsersToday: 0,
    totalPosts: 0,
    totalComments: 0,
    activeUsers: 0,
    verifiedTeachers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  // 권한 체크는 AuthGuard에서 처리되므로 제거

  // 사용자 프로필 가져오기
  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user: authUserData } } = await supabase.auth.getUser();
      setAuthUser(authUserData);
      
      if (authUserData) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUserData.id)
          .single();
        setProfile(profileData);
      }
    };
    
    fetchUserProfile();
  }, [supabase]);

  // 통계 데이터 가져오기
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        // 사용자 통계
        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        const { count: newUsersToday } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

        const { count: verifiedTeachers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'verified');

        const { count: activeUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // 게시글 통계
        const { count: totalPosts } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true });

        const { count: totalComments } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true });

        setStats({
          totalUsers: totalUsers || 0,
          newUsersToday: newUsersToday || 0,
          totalPosts: totalPosts || 0,
          totalComments: totalComments || 0,
          activeUsers: activeUsers || 0,
          verifiedTeachers: verifiedTeachers || 0,
        });

        // 최근 활동
        const { data: recentPosts } = await supabase
          .from('posts')
          .select('id, title, created_at, author')
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentActivities(recentPosts || []);
      } catch (error) {
        console.error('Error fetching statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStatistics();
    }
  }, [user, supabase]);

  // 로딩 중일 때
  if (loading) {
    return (
      <>
        <AppHeader user={authUser} profile={profile} />
        <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        </Container>
      </>
    );
  }

  const adminMenus = [
    {
      title: '메인 페이지 관리',
      description: '메인 페이지 콘텐츠 편집',
      icon: <DashboardIcon fontSize="large" />,
      path: '/admin/main-content',
      color: '#9C27B0',
      permission: 'manage_content',
    },
    {
      title: '사용자 관리',
      description: '회원 정보 및 권한 관리',
      icon: <SupervisorAccount fontSize="large" />,
      path: '/admin/users',
      color: '#FF6B6B',
      permission: 'manage_users',
    },
    {
      title: '콘텐츠 관리',
      description: '게시글 및 댓글 관리',
      icon: <Article fontSize="large" />,
      path: '/admin/content',
      color: '#4ECDC4',
      permission: 'manage_content',
    },
    {
      title: '강의 관리',
      description: '강의 등록 및 수강생 관리',
      icon: <School fontSize="large" />,
      path: '/admin/lectures',
      color: '#FF7675',
      permission: 'manage_content',
    },
    {
      title: '신고 관리',
      description: '신고된 콘텐츠 처리',
      icon: <Security fontSize="large" />,
      path: '/admin/reports',
      color: '#45B7D1',
      permission: 'manage_reports',
    },
    {
      title: '통계 분석',
      description: '사이트 활동 통계',
      icon: <Assessment fontSize="large" />,
      path: '/admin/analytics',
      color: '#96CEB4',
      permission: 'view_analytics',
    },
    {
      title: '공지사항',
      description: '공지사항 작성 및 관리',
      icon: <Notifications fontSize="large" />,
      path: '/admin/announcements',
      color: '#FFEAA7',
      permission: 'send_announcements',
    },
    {
      title: '사이트 설정',
      description: '시스템 설정 관리',
      icon: <Settings fontSize="large" />,
      path: '/admin/settings',
      color: '#DFE6E9',
      permission: 'manage_settings',
    },
  ];

  const statsCards = [
    {
      title: '전체 사용자',
      value: stats.totalUsers,
      icon: <People />,
      color: 'primary.main',
      change: `+${stats.newUsersToday} 오늘`,
    },
    {
      title: '활성 사용자',
      value: stats.activeUsers,
      icon: <TrendingUp />,
      color: 'success.main',
      change: `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}%`,
    },
    {
      title: '전체 게시글',
      value: stats.totalPosts,
      icon: <Article />,
      color: 'info.main',
    },
    {
      title: '인증 교사',
      value: stats.verifiedTeachers,
      icon: <School />,
      color: 'warning.main',
    },
  ];

  return (
    <>
      <AppHeader user={authUser} profile={profile} />
      <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
        {/* 헤더 */}
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: 'error.main',
              }}
            >
              <AdminPanelSettings fontSize="large" />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                관리자 대시보드
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={isAdmin ? '최고 관리자' : '운영진'}
                  size="small"
                  color={isAdmin ? 'error' : 'warning'}
                />
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Box>

        {/* 통계 카드 */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {statsCards.map((stat, index) => (
            <Grid key={index} item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography color="text.secondary" variant="caption">
                        {stat.title}
                      </Typography>
                      <Typography variant="h4" fontWeight="bold">
                        {loading ? '-' : stat.value.toLocaleString()}
                      </Typography>
                      {stat.change && (
                        <Typography variant="caption" color="success.main">
                          {stat.change}
                        </Typography>
                      )}
                    </Box>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 2,
                        bgcolor: `${stat.color}15`,
                        color: stat.color,
                      }}
                    >
                      {stat.icon}
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* 관리 메뉴 그리드 */}
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
          관리 메뉴
        </Typography>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {adminMenus.map((menu, index) => {
            const hasPermission = can(menu.permission);
            return (
              <Grid key={index} item xs={12} sm={6} md={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    cursor: hasPermission ? 'pointer' : 'not-allowed',
                    opacity: hasPermission ? 1 : 0.5,
                    transition: 'all 0.2s',
                    '&:hover': hasPermission
                      ? {
                          transform: 'translateY(-4px)',
                          boxShadow: 2,
                          borderColor: 'primary.main',
                        }
                      : {},
                  }}
                  onClick={() => hasPermission && router.push(menu.path)}
                >
                  <Stack spacing={2}>
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        bgcolor: `${menu.color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: menu.color,
                      }}
                    >
                      {menu.icon}
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight="medium">
                        {menu.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {menu.description}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        <Grid container spacing={3}>
          {/* 최근 활동 */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                최근 게시글
              </Typography>
              <List>
                {recentActivities.map((activity, index) => (
                  <ListItem key={index} divider={index < recentActivities.length - 1}>
                    <ListItemText
                      primary={activity.title}
                      secondary={`${activity.author} · ${new Date(
                        activity.created_at
                      ).toLocaleDateString()}`}
                    />
                    <IconButton size="small">
                      <ArrowForward />
                    </IconButton>
                  </ListItem>
                ))}
                {recentActivities.length === 0 && (
                  <Typography color="text.secondary" align="center">
                    최근 활동이 없습니다
                  </Typography>
                )}
              </List>
            </Paper>
          </Grid>

          {/* 빠른 작업 */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                빠른 작업
              </Typography>
              <Stack spacing={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Email />}
                  onClick={() => router.push('/admin/announcements/new')}
                >
                  공지사항 작성
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<SupervisorAccount />}
                  onClick={() => router.push('/admin/users')}
                >
                  사용자 관리
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Assessment />}
                  onClick={() => router.push('/admin/analytics')}
                >
                  통계 보기
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Settings />}
                  onClick={() => router.push('/admin/settings')}
                >
                  사이트 설정
                </Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

export default function AdminDashboard() {
  return (
    <AuthGuard requireAuth requireModerator>
      <AdminDashboardContent />
    </AuthGuard>
  );
}