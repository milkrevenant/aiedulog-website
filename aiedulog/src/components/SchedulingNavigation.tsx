'use client'

import React from 'react'
import { 
  BottomNavigation, 
  BottomNavigationAction, 
  Paper,
  Box 
} from '@mui/material'
import {
  CalendarToday,
  Person,
  Schedule,
  CheckCircle
} from '@mui/icons-material'
import { useRouter, usePathname } from 'next/navigation'

const NAVIGATION_ITEMS = [
  {
    label: '강사 찾기',
    value: 'instructors',
    icon: Person,
    path: '/scheduling'
  },
  {
    label: '내 예약',
    value: 'appointments',
    icon: CalendarToday,
    path: '/dashboard'
  }
]

export default function SchedulingNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  
  // Determine current value based on pathname
  const getCurrentValue = () => {
    if (pathname === '/scheduling') return 'instructors'
    if (pathname.startsWith('/dashboard')) return 'appointments'
    return 'instructors'
  }

  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    const item = NAVIGATION_ITEMS.find(item => item.value === newValue)
    if (item) {
      router.push(item.path)
    }
  }

  // Only show on scheduling-related pages
  if (!pathname.startsWith('/scheduling') && !pathname.startsWith('/dashboard')) {
    return null
  }

  return (
    <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, display: { xs: 'block', md: 'none' } }}>
      <Paper elevation={8}>
        <BottomNavigation
          value={getCurrentValue()}
          onChange={handleChange}
          showLabels
        >
          {NAVIGATION_ITEMS.map((item) => (
            <BottomNavigationAction
              key={item.value}
              label={item.label}
              value={item.value}
              icon={<item.icon />}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  )
}