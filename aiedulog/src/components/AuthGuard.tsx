'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Box, Container, Paper, Typography, Button, CircularProgress } from '@mui/material';
import { LockOutlined } from '@mui/icons-material';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireModerator?: boolean;
}

export default function AuthGuard({ 
  children, 
  requireAuth = true,
  requireAdmin = false,
  requireModerator = false 
}: AuthGuardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAuthenticated(false);
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);

        // 권한 체크가 필요한 경우
        if (requireAdmin || requireModerator) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profile) {
            setUserRole(profile.role);
            
            if (requireAdmin && profile.role === 'admin') {
              setIsAuthorized(true);
            } else if (requireModerator && (profile.role === 'admin' || profile.role === 'moderator')) {
              setIsAuthorized(true);
            } else {
              setIsAuthorized(false);
            }
          }
        } else {
          // 인증만 필요한 경우
          setIsAuthorized(true);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [supabase, requireAdmin, requireModerator]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated && requireAuth) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2
          }}
        >
          <Box 
            sx={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%', 
              bgcolor: 'primary.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3
            }}
          >
            <LockOutlined sx={{ fontSize: 40, color: 'primary.main' }} />
          </Box>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            로그인이 필요합니다
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            이 페이지를 보려면 먼저 로그인해주세요.
          </Typography>
          <Button 
            variant="contained" 
            size="large"
            onClick={() => router.push('/auth/login')}
            sx={{ minWidth: 200 }}
          >
            로그인하기
          </Button>
        </Paper>
      </Container>
    );
  }

  if (isAuthenticated && !isAuthorized && (requireAdmin || requireModerator)) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            border: '1px solid',
            borderColor: 'error.main',
            borderRadius: 2,
            bgcolor: 'error.light',
            bgcolor: '#fff5f5'
          }}
        >
          <Box 
            sx={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%', 
              bgcolor: 'error.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3
            }}
          >
            <LockOutlined sx={{ fontSize: 40, color: 'error.main' }} />
          </Box>
          <Typography variant="h5" fontWeight="bold" gutterBottom color="error.dark">
            접근 권한이 없습니다
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {requireAdmin ? '관리자' : '운영진'} 권한이 필요한 페이지입니다.
            <br />
            현재 권한: {userRole === 'admin' ? '관리자' : 
                     userRole === 'moderator' ? '운영진' : 
                     userRole === 'verified' ? '인증 교사' : '일반 회원'}
          </Typography>
          <Button 
            variant="outlined" 
            size="large"
            onClick={() => router.push('/dashboard')}
            sx={{ minWidth: 200 }}
          >
            대시보드로 이동
          </Button>
        </Paper>
      </Container>
    );
  }

  return <>{children}</>;
}