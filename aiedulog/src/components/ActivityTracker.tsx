'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { ActivityTracker } from '@/lib/auth/activity-tracker'
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography,
  LinearProgress,
  Box,
  Stack
} from '@mui/material'
import { AccessTime, ExitToApp, Refresh } from '@mui/icons-material'

/**
 * 전역 활동 추적 컴포넌트
 * 
 * 기능:
 * - 사용자 활동 자동 감지
 * - 세션 만료 경고 표시
 * - 자동 로그아웃 실행
 * - 세션 연장 기능
 */
export default function ActivityTrackerComponent() {
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated'
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(300) // 5분 (300초)
  
  // 활동 이벤트 처리
  const handleActivity = useCallback(() => {
    ActivityTracker.updateActivity()
    
    // 경고 상태이면 해제
    if (showWarning) {
      setShowWarning(false)
      setCountdown(300)
    }
  }, [showWarning])
  
  // 세션 연장
  const extendSession = useCallback(() => {
    ActivityTracker.updateActivity()
    setShowWarning(false)
    setCountdown(300)
  }, [])
  
  // 즉시 로그아웃
  const logoutNow = useCallback(async () => {
    try {
      ActivityTracker.clear()
      // NextAuth signOut via fetch
      await fetch('/api/auth/signout', { method: 'POST' })
    } catch (error) {
      console.error('로그아웃 실패:', error)
    }
  }, [])
  
  useEffect(() => {
    if (!isAuthenticated) return
    
    // 활동 추적 초기화
    ActivityTracker.initialize()
    
    // 활동 감지 이벤트들
    const events = [
      'mousedown', 
      'mousemove',
      'keypress', 
      'keydown',
      'scroll', 
      'touchstart', 
      'click',
      'focus',
      'visibilitychange'
    ] as const
    
    // 이벤트 리스너 등록
    events.forEach(event => {
      if (event === 'visibilitychange') {
        document.addEventListener(event, handleActivity)
      } else {
        window.addEventListener(event, handleActivity)
      }
    })
    
    // 1분마다 세션 상태 체크
    const checkInterval = setInterval(() => {
      if (ActivityTracker.isExpired()) {
        console.log('세션 만료 - 자동 로그아웃')
        logoutNow()
      } else if (ActivityTracker.shouldWarn() && !showWarning) {
        console.log('세션 만료 경고 표시')
        setShowWarning(true)
      }
    }, 60000) // 1분마다
    
    // Cleanup
    return () => {
      events.forEach(event => {
        if (event === 'visibilitychange') {
          document.removeEventListener(event, handleActivity)
        } else {
          window.removeEventListener(event, handleActivity)
        }
      })
      clearInterval(checkInterval)
    }
  }, [isAuthenticated, showWarning, handleActivity, logoutNow])
  
  // 경고 다이얼로그의 카운트다운
  useEffect(() => {
    if (!showWarning) return
    
    const countInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          console.log('카운트다운 완료 - 자동 로그아웃')
          logoutNow()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(countInterval)
  }, [showWarning, logoutNow])
  
  // 카운트다운 표시 포맷
  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}분 ${remainingSeconds}초`
  }
  
  // 진행률 계산 (5분 = 300초 기준)
  const progress = ((300 - countdown) / 300) * 100
  
  if (!isAuthenticated) {
    return null
  }
  
  return (
    <Dialog 
      open={showWarning} 
      onClose={() => {}} // 사용자가 직접 닫을 수 없음
      maxWidth="sm"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 3,
          boxShadow: 24,
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <AccessTime color="warning" />
          <Typography variant="h6" fontWeight="bold">
            세션 만료 경고
          </Typography>
        </Stack>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={3}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main" fontWeight="bold">
              {formatCountdown(countdown)}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              후 자동으로 로그아웃됩니다
            </Typography>
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={progress}
            sx={{ 
              height: 8, 
              borderRadius: 4,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                bgcolor: countdown > 60 ? 'warning.main' : 'error.main'
              }
            }}
          />
          
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            계속 사용하시려면 <strong>'세션 연장'</strong>을 클릭하세요.
            <br />
            아무 활동도 하지 않으면 보안을 위해 자동으로 로그아웃됩니다.
          </Typography>
        </Stack>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button 
          onClick={logoutNow}
          variant="outlined"
          color="error"
          startIcon={<ExitToApp />}
          sx={{ mr: 1 }}
        >
          지금 로그아웃
        </Button>
        <Button 
          onClick={extendSession}
          variant="contained"
          color="primary"
          startIcon={<Refresh />}
          sx={{ minWidth: 120 }}
        >
          세션 연장
        </Button>
      </DialogActions>
    </Dialog>
  )
}