'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthContext } from '@/lib/auth/context'
import { Box, IconButton, CircularProgress } from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import AppHeader from '@/components/AppHeader'
import ChatInterface from '@/components/ChatInterface'

export default function ChatRoomPage() {
  const params = useParams()
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuthContext()
  
  const roomId = params.id as string

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [authLoading, user, router])

  if (authLoading || !user) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppHeader user={user} profile={profile} />
      
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <ChatInterface roomId={roomId} user={user} />
      </Box>
    </Box>
  )
}