'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Paper,
  Toolbar,
  IconButton,
  Typography,
  InputBase,
  Stack,
  Badge,
  Drawer,
  Box,
  Avatar,
  Chip,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  useTheme,
  alpha
} from '@mui/material'
import {
  Menu as MenuIcon,
  Search,
  Notifications,
  AccountCircle,
  Home,
  History,
  Article,
  Create,
  TrendingUp,
  Forum,
  School,
  LocalOffer,
  ChatBubbleOutline,
  Bookmark
} from '@mui/icons-material'

interface AppHeaderProps {
  user: any
  profile: any
}

export default function AppHeader({ user, profile }: AppHeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const theme = useTheme()

  return (
    <>
      {/* Material 3 스타일 사이드바 */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            bgcolor: 'background.paper',
            borderRadius: '0 16px 16px 0',
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
              {profile?.email?.[0]?.toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="medium">
                {profile?.email?.split('@')[0]}
              </Typography>
              <Chip 
                label={profile?.role === 'admin' ? '관리자' : profile?.role === 'verified' ? '인증 교사' : '일반 회원'}
                size="small"
                color={profile?.role === 'admin' ? 'error' : profile?.role === 'verified' ? 'success' : 'default'}
              />
            </Box>
          </Stack>
        </Box>
        
        <Divider />
        
        <List>
          <ListSubheader sx={{ bgcolor: 'transparent', fontWeight: 'medium' }}>
            기본 메뉴
          </ListSubheader>
          <ListItemButton onClick={() => { setDrawerOpen(false); router.push('/feed') }}>
            <ListItemIcon>
              <Home />
            </ListItemIcon>
            <ListItemText primary="홈" />
          </ListItemButton>
          <ListItemButton onClick={() => { setDrawerOpen(false); router.push('/dashboard') }}>
            <ListItemIcon>
              <AccountCircle />
            </ListItemIcon>
            <ListItemText primary="마이페이지" />
          </ListItemButton>
        </List>

        <Divider />

        <List>
          <ListSubheader sx={{ bgcolor: 'transparent', fontWeight: 'medium' }}>
            최근 활동
          </ListSubheader>
          <ListItemButton>
            <ListItemIcon>
              <History />
            </ListItemIcon>
            <ListItemText 
              primary="최근 방문 게시판" 
              secondary="AI 교육 연구"
            />
          </ListItemButton>
          <ListItemButton>
            <ListItemIcon>
              <Article />
            </ListItemIcon>
            <ListItemText 
              primary="최근 본 글" 
              secondary="VR 활용 수업 사례"
            />
          </ListItemButton>
        </List>

        <Divider />

        <List>
          <ListSubheader sx={{ bgcolor: 'transparent', fontWeight: 'medium' }}>
            게시판
          </ListSubheader>
          <ListItemButton onClick={() => { setDrawerOpen(false); router.push('/board/general') }}>
            <ListItemIcon>
              <Forum />
            </ListItemIcon>
            <ListItemText primary="자유게시판" />
          </ListItemButton>
          <ListItemButton onClick={() => { setDrawerOpen(false); router.push('/board/education') }}>
            <ListItemIcon>
              <School />
            </ListItemIcon>
            <ListItemText primary="교육 자료실" />
          </ListItemButton>
          <ListItemButton onClick={() => { setDrawerOpen(false); router.push('/board/tech') }}>
            <ListItemIcon>
              <TrendingUp />
            </ListItemIcon>
            <ListItemText primary="에듀테크 트렌드" />
          </ListItemButton>
          <ListItemButton onClick={() => { setDrawerOpen(false); router.push('/board/job') }}>
            <ListItemIcon>
              <LocalOffer />
            </ListItemIcon>
            <ListItemText primary="구인구직" />
          </ListItemButton>
        </List>

        <Divider />

        <List>
          <ListSubheader sx={{ bgcolor: 'transparent', fontWeight: 'medium' }}>
            내 활동
          </ListSubheader>
          <ListItemButton>
            <ListItemIcon>
              <Create />
            </ListItemIcon>
            <ListItemText primary="내가 쓴 글" />
            <Chip label="12" size="small" />
          </ListItemButton>
          <ListItemButton>
            <ListItemIcon>
              <ChatBubbleOutline />
            </ListItemIcon>
            <ListItemText primary="내 댓글" />
            <Chip label="34" size="small" />
          </ListItemButton>
          <ListItemButton>
            <ListItemIcon>
              <Bookmark />
            </ListItemIcon>
            <ListItemText primary="북마크" />
            <Chip label="8" size="small" />
          </ListItemButton>
        </List>
      </Drawer>

      {/* Material 3 스타일 상단 헤더 */}
      <Paper 
        elevation={0} 
        sx={{ 
          position: 'sticky', 
          top: 0, 
          zIndex: 1100,
          borderRadius: 0,
          backdropFilter: 'blur(20px)',
          bgcolor: alpha(theme.palette.background.paper, 0.95),
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }}
      >
        <Toolbar sx={{ px: { xs: 1, sm: 2 } }}>
          {/* 사이드바 토글 버튼 */}
          <IconButton
            edge="start"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>

          {/* 로고 */}
          <Typography 
            variant="h6" 
            fontWeight="bold" 
            color="primary"
            onClick={() => router.push('/feed')}
            sx={{ 
              mr: 3, 
              display: { xs: 'none', sm: 'block' },
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.8
              }
            }}
          >
            AIedulog
          </Typography>

          {/* Material 3 검색창 */}
          <Paper
            elevation={0}
            sx={{
              p: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              flex: 1,
              maxWidth: 600,
              mx: 'auto',
              borderRadius: 10,
              bgcolor: alpha(theme.palette.action.selected, 0.04),
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: alpha(theme.palette.action.selected, 0.08),
                borderColor: alpha(theme.palette.primary.main, 0.2),
              },
              '&:focus-within': {
                bgcolor: 'background.paper',
                borderColor: theme.palette.primary.main,
                boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`,
              }
            }}
          >
            <IconButton sx={{ p: '10px' }} aria-label="search">
              <Search />
            </IconButton>
            <InputBase
              sx={{ ml: 1, flex: 1 }}
              placeholder="게시글, 사용자, 태그 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              inputProps={{ 'aria-label': 'search' }}
            />
          </Paper>

          {/* 우측 아이콘들 */}
          <Stack direction="row" spacing={1} sx={{ ml: 2 }}>
            <IconButton>
              <Badge badgeContent={3} color="error">
                <Notifications />
              </Badge>
            </IconButton>
            <IconButton onClick={() => router.push('/dashboard')}>
              <AccountCircle />
            </IconButton>
          </Stack>
        </Toolbar>
      </Paper>
    </>
  )
}