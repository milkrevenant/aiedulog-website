'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Stack,
  Divider,
  Chip,
  CircularProgress,
  IconButton,
} from '@mui/material'
import {
  TrendingUp,
  Visibility,
  Favorite,
  Comment,
  Refresh,
  OpenInNew,
} from '@mui/icons-material'

interface TrendingPost {
  id: string
  title: string
  view_count: number
  like_count: number
}

interface TrendingComment {
  id: string
  content: string
  like_count: number
  post_id: string
  post_title: string
}

export default function TrendingWidget() {
  const [loading, setLoading] = useState(true)
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([])
  const [trendingComments, setTrendingComments] = useState<TrendingComment[]>([])

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchTrendingContent()
    
    // 5분마다 자동 업데이트
    const interval = setInterval(fetchTrendingContent, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchTrendingContent = async () => {
    setLoading(true)

    // 2일 전 날짜 계산
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const twoDaysAgoISO = twoDaysAgo.toISOString()

    // 조회수 높은 게시글 TOP 5
    const { data: postsData } = await supabase
      .from('posts')
      .select('id, title, view_count, like_count')
      .gte('created_at', twoDaysAgoISO)
      .eq('is_published', true)
      .order('view_count', { ascending: false })
      .limit(5)

    if (postsData) {
      setTrendingPosts(postsData)
    }

    // 좋아요 높은 댓글 TOP 5
    const { data: commentsData } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        like_count,
        post_id,
        posts!comments_post_id_fkey (
          title
        )
      `)
      .gte('created_at', twoDaysAgoISO)
      .order('like_count', { ascending: false })
      .limit(5)

    if (commentsData) {
      const formatted = commentsData.map((comment: any) => ({
        id: comment.id,
        content: comment.content.substring(0, 50) + (comment.content.length > 50 ? '...' : ''),
        like_count: comment.like_count || 0,
        post_id: comment.post_id,
        post_title: comment.posts?.title || '삭제된 게시글',
      }))
      setTrendingComments(formatted)
    }

    setLoading(false)
  }

  return (
    <Paper
      elevation={0}
      sx={{
        height: 'calc(50vh - 50px)',
        width: 352,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      {/* 헤더 */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'error.main',
          color: 'white',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <TrendingUp />
            <Typography variant="h6" fontWeight="bold">
              실시간 인기
            </Typography>
          </Stack>
          <Stack direction="row">
            <IconButton 
              size="small" 
              sx={{ color: 'white' }}
              onClick={fetchTrendingContent}
            >
              <Refresh />
            </IconButton>
            <IconButton
              size="small"
              sx={{ color: 'white' }}
              onClick={() => router.push('/board/trending')}
            >
              <OpenInNew />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {/* 인기 게시글 */}
          <Box sx={{ p: 2, pb: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <Visibility fontSize="small" color="action" />
              <Typography variant="subtitle2" fontWeight="bold">
                조회수 TOP 5
              </Typography>
            </Stack>
            <List dense sx={{ p: 0 }}>
              {trendingPosts.map((post, index) => (
                <ListItemButton
                  key={post.id}
                  onClick={() => router.push(`/post/${post.id}`)}
                  sx={{ 
                    py: 0.5, 
                    px: 1,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <Typography
                      variant="caption"
                      fontWeight="bold"
                      color={index === 0 ? 'error.main' : 'text.secondary'}
                    >
                      {index + 1}
                    </Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {post.title}
                      </Typography>
                    }
                  />
                  <Chip
                    size="small"
                    label={post.view_count}
                    icon={<Visibility sx={{ fontSize: 12 }} />}
                    sx={{ height: 20, '& .MuiChip-label': { px: 0.5 } }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Box>

          <Divider />

          {/* 인기 댓글 */}
          <Box sx={{ p: 2, pt: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <Favorite fontSize="small" color="error" />
              <Typography variant="subtitle2" fontWeight="bold">
                공감 댓글 TOP 5
              </Typography>
            </Stack>
            <List dense sx={{ p: 0 }}>
              {trendingComments.map((comment, index) => (
                <ListItemButton
                  key={comment.id}
                  onClick={() => router.push(`/post/${comment.post_id}`)}
                  sx={{ 
                    py: 0.5, 
                    px: 1,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <Typography
                      variant="caption"
                      fontWeight="bold"
                      color={index === 0 ? 'error.main' : 'text.secondary'}
                    >
                      {index + 1}
                    </Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {comment.content}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {comment.post_title}
                      </Typography>
                    }
                  />
                  <Chip
                    size="small"
                    label={comment.like_count}
                    icon={<Favorite sx={{ fontSize: 12 }} />}
                    color="error"
                    sx={{ height: 20, '& .MuiChip-label': { px: 0.5 } }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Box>
        </Box>
      )}
    </Paper>
  )
}