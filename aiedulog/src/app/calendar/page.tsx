'use client'

import { useState } from 'react'
import { Container, Typography, Box, CircularProgress, Fab, Badge } from '@mui/material'
import { Chat as ChatIcon } from '@mui/icons-material'
import { LoadingState } from '@/components/common/LoadingState'
import CalendarView from '@/components/calendar/CalendarView'
import AppHeader from '@/components/AppHeader'
import SideChat from '@/components/SideChat'
import { useAuth } from '@/lib/auth/hooks'

export default function CalendarPage() {
  const { user, profile, loading } = useAuth()
  const [chatOpen, setChatOpen] = useState(false)

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <LoadingState message="일정을 불러오는 중입니다..." height={400} />
      </Box>
    )
  }

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', pb: 8 }}>
      <AppHeader user={user} profile={profile} />
      
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            일정 캘린더
          </Typography>
          <Typography variant="body1" color="text.secondary">
            연구회의 주요 행사 및 일정을 확인하세요.
          </Typography>
        </Box>
        <CalendarView />
      </Container>
      
      {/* 채팅 플로팅 버튼 */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1100,
        }}
        onClick={() => setChatOpen(true)}
      >
        <Badge badgeContent={0} color="error">
          <ChatIcon />
        </Badge>
      </Fab>

      <SideChat 
        user={user} 
        open={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </Box>
  )
}
