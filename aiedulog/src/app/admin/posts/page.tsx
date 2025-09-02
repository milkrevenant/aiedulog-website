'use client'

import { useState } from 'react'
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Chip,
} from '@mui/material'
import {
  Article as ArticleIcon,
  Campaign as CampaignIcon,
  Newspaper as NewsIcon,
  Groups as GroupsIcon,
  School as SchoolIcon,
} from '@mui/icons-material'
import AuthGuard from '@/components/AuthGuard'
import AppHeader from '@/components/AppHeader'
import PostManagementSystem from '@/components/admin/PostManagementSystem'

// Board category configuration
const BOARD_CATEGORIES = {
  lectures: { 
    label: '강의', 
    icon: <SchoolIcon />, 
    color: 'primary' as const,
    description: '강의 및 교육 관련 게시글을 관리합니다'
  },
  announcements: { 
    label: '공지사항', 
    icon: <CampaignIcon />, 
    color: 'error' as const,
    description: '연구회 공지사항 게시글을 관리합니다'
  },
  news: { 
    label: '뉴스', 
    icon: <NewsIcon />, 
    color: 'info' as const,
    description: '교육 및 연구 관련 뉴스 게시글을 관리합니다'
  },
  'regular-meetings': { 
    label: '정기모임', 
    icon: <GroupsIcon />, 
    color: 'success' as const,
    description: '정기모임 관련 게시글을 관리합니다'
  },
  'training-programs': { 
    label: '연수프로그램', 
    icon: <ArticleIcon />, 
    color: 'warning' as const,
    description: '연수 및 교육프로그램 게시글을 관리합니다'
  },
} as const

type BoardCategory = keyof typeof BOARD_CATEGORIES

export default function PostsManagementPage() {
  const [selectedTab, setSelectedTab] = useState<BoardCategory>('announcements')

  const handleTabChange = (event: React.SyntheticEvent, newValue: BoardCategory) => {
    setSelectedTab(newValue)
  }

  const currentBoard = BOARD_CATEGORIES[selectedTab]

  return (
    <AuthGuard requireAuth requireAdmin>
      <AppHeader />
      <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            게시글 관리
          </Typography>
          <Typography variant="body2" color="text.secondary">
            모든 게시판의 게시글을 카테고리별로 관리할 수 있습니다
          </Typography>
        </Box>

        {/* Board Category Tabs */}
        <Paper elevation={0} sx={{ mb: 3 }}>
          <Tabs 
            value={selectedTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ 
              '& .MuiTab-root': {
                minWidth: 140,
                textTransform: 'none'
              }
            }}
          >
            {Object.entries(BOARD_CATEGORIES).map(([key, config]) => (
              <Tab
                key={key}
                value={key}
                icon={config.icon}
                iconPosition="start"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{config.label}</span>
                    <Chip 
                      size="small" 
                      color={config.color} 
                      label="관리"
                      variant="outlined"
                    />
                  </Box>
                }
                sx={{ 
                  '&.Mui-selected': {
                    bgcolor: 'action.selected',
                  }
                }}
              />
            ))}
          </Tabs>
        </Paper>

        {/* Current Board Info */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {currentBoard.icon}
              <Typography variant="h6" fontWeight="medium">
                {currentBoard.label} 게시판
              </Typography>
              <Chip 
                label={selectedTab} 
                color={currentBoard.color} 
                size="small" 
                variant="outlined"
              />
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {currentBoard.description}
          </Typography>
        </Paper>

        {/* Post Management System */}
        <PostManagementSystem boardType={selectedTab} />
      </Container>
    </AuthGuard>
  )
}