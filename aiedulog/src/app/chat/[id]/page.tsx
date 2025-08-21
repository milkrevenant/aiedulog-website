'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Box, IconButton, CircularProgress } from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import AppHeader from '@/components/AppHeader'
import ChatInterface from '@/components/ChatInterface'

export default function ChatRoomPage() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  
  const roomId = params.id as string

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      setUser(user)

      // 프로필 정보 가져오기
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

  if (loading || !user) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppHeader user={user} profile={profile}>
        <IconButton
          onClick={() => router.push('/chat')}
          sx={{ mr: 1 }}
        >
          <ArrowBack />
        </IconButton>
      </AppHeader>
      
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <ChatInterface roomId={roomId} user={user} />
      </Box>
    </Box>
  )
}