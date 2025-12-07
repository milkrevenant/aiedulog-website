'use client'
/**
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { getUserIdentity } from '@/lib/identity/helpers'
import {
  Box,
  Container,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Stack,
  Divider,
  Chip,
  Card,
  CardContent,
  CircularProgress,
  Tab,
  Tabs,
  IconButton,
  Badge,
} from '@mui/material'
import {
  TrendingUp,
  Visibility,
  Favorite,
  Comment,
  ArrowUpward,
  AccessTime,
  Person,
} from '@mui/icons-material'
import AppHeader from '@/components/AppHeader'

interface TrendingPost {
  id: string
  title: string
  content: string
  view_count: number
  like_count: number
  created_at: string
  author: {
    nickname: string
    email: string
    avatar_url: string | null
  }
}

interface TrendingComment {
  id: string
  content: string
  like_count: number
  created_at: string
  post: {
    id: string
    title: string
  }
  author: {
    nickname: string
    email: string
    avatar_url: string | null
  }
}

export default function TrendingPage() {
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tabValue, setTabValue] = useState(0)
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([])
  const [trendingComments, setTrendingComments] = useState<TrendingComment[]>([])

  const router = useRouter()
  const supabase = createClient()
  const { data: session, status } = useSession()

  useEffect(() => {
    const syncUser = async () => {
      if (status === 'loading') return
      if (status === 'unauthenticated') {
        router.push('/auth/login')
        return
      }
      const authUser = session?.user as any
      if (authUser) {
        setUser(authUser)
        const identity = await getUserIdentity(authUser)
        setProfile(identity?.profile || null)
      }
    }
    syncUser()
  }, [status, session, router])

  useEffect(() => {
    if (user) {
      fetchTrendingContent()
    }
  }, [user])

  const fetchTrendingContent = async () => {
    setLoading(true)

    // 2일 전 날짜 계산
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const twoDaysAgoISO = twoDaysAgo.toISOString()

    // 조회수 높은 게시글 TOP 5
    const { data: postsData } = await supabase
      .from('posts')
      .select(`
        *,
        author:user_profiles!posts_author_id_fkey (
          user_id,
          email,
          nickname,
          avatar_url
        )
      `)
      .gte('created_at', twoDaysAgoISO)
      .eq('is_published', true)
      .order('view_count', { ascending: false })
      .limit(5)

    if (postsData) {
      const formattedPosts = postsData.map((post: any) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        view_count: post.view_count || 0,
        like_count: post.like_count || 0,
        created_at: post.created_at,
        author: {
          nickname: post.author?.nickname || post.author?.email?.split('@')[0] || '사용자',
          email: post.author?.email || '',
          avatar_url: post.author?.avatar_url,
        },
      }))
      setTrendingPosts(formattedPosts)
    }

    // 좋아요 높은 댓글 TOP 5
    const { data: commentsData } = await supabase
      .from('comments')
      .select(`
        *,
        posts!comments_post_id_fkey (
          id,
          title
        ),
        author:user_profiles!comments_author_id_fkey (
          user_id,
          email,
          nickname,
          avatar_url
        )
      `)
      .gte('created_at', twoDaysAgoISO)
      .order('like_count', { ascending: false })
      .limit(5)

    if (commentsData) {
      const formattedComments = commentsData.map((comment: any) => ({
        id: comment.id,
        content: comment.content,
        like_count: comment.like_count || 0,
        created_at: comment.created_at,
        post: {
          id: comment.posts?.id || '',
          title: comment.posts?.title || '삭제된 게시글',
        },
        author: {
          nickname: comment.author?.nickname || comment.author?.email?.split('@')[0] || '사용자',
          email: comment.author?.email || '',
          avatar_url: comment.author?.avatar_url,
        },
      }))
      setTrendingComments(formattedComments)
    }

    setLoading(false)
  }

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60))
      return minutes < 1 ? '방금' : `${minutes}분 전`
    } else if (hours < 24) {
      return `${hours}시간 전`
    } else {
      const days = Math.floor(hours / 24)
      return `${days}일 전`
    }
  }

  if (loading) {
    return (
      <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
            <CircularProgress />
          </Box>
        </Container>
      </Box>
    )
  }

  if (!user || !profile) return null

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', pb: 4 }}>
      <AppHeader user={user} profile={profile} />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2} mb={2}>
            <TrendingUp sx={{ fontSize: 32, color: 'error.main' }} />
            <Typography variant="h4" fontWeight="bold">
              공감 게시판
            </Typography>
            <Chip label="실시간 인기" color="error" size="small" />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            최근 2일간 가장 많은 관심을 받은 게시글과 댓글을 확인하세요
          </Typography>
        </Paper>

        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
          <Tab label="인기 게시글" icon={<Visibility />} iconPosition="start" />
          <Tab label="인기 댓글" icon={<Favorite />} iconPosition="start" />
        </Tabs>

        {tabValue === 0 ? (
          // 인기 게시글
          (<Stack spacing={2}>
            {trendingPosts.map((post, index) => (
              <Card
                key={post.id}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 3 },
                }}
                onClick={() => router.push(`/post/${post.id}`)}
              >
                <CardContent>
                  <Stack direction="row" spacing={2}>
                    <Box
                      sx={{
                        minWidth: 50,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography
                        variant="h3"
                        color={index === 0 ? 'error.main' : index < 3 ? 'warning.main' : 'text.secondary'}
                        fontWeight="bold"
                      >
                        {index + 1}
                      </Typography>
                      {index === 0 && <ArrowUpward color="error" />}
                    </Box>

                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        {post.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          mb: 1,
                        }}
                      >
                        {post.content}
                      </Typography>

                      <Stack direction="row" spacing={2} alignItems="center">
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Avatar
                            src={post.author.avatar_url || undefined}
                            sx={{ width: 20, height: 20 }}
                          >
                            <Person sx={{ fontSize: 14 }} />
                          </Avatar>
                          <Typography variant="caption">{post.author.nickname}</Typography>
                        </Stack>

                        <Chip
                          icon={<Visibility sx={{ fontSize: 14 }} />}
                          label={`조회 ${post.view_count}`}
                          size="small"
                          variant="outlined"
                        />

                        <Chip
                          icon={<Favorite sx={{ fontSize: 14 }} />}
                          label={`좋아요 ${post.like_count}`}
                          size="small"
                          variant="outlined"
                          color="error"
                        />

                        <Chip
                          icon={<AccessTime sx={{ fontSize: 14 }} />}
                          label={formatTimeAgo(post.created_at)}
                          size="small"
                        />
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
            {trendingPosts.length === 0 && (
              <Card>
                <CardContent>
                  <Typography color="text.secondary" align="center">
                    최근 2일간 게시글이 없습니다
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Stack>)
        ) : (
          // 인기 댓글
          (<Stack spacing={2}>
            {trendingComments.map((comment, index) => (
              <Card
                key={comment.id}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 3 },
                }}
                onClick={() => router.push(`/post/${comment.post.id}`)}
              >
                <CardContent>
                  <Stack direction="row" spacing={2}>
                    <Box
                      sx={{
                        minWidth: 50,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography
                        variant="h3"
                        color={index === 0 ? 'error.main' : index < 3 ? 'warning.main' : 'text.secondary'}
                        fontWeight="bold"
                      >
                        {index + 1}
                      </Typography>
                      {index === 0 && <Favorite color="error" />}
                    </Box>

                    <Box sx={{ flexGrow: 1 }}>
                      <Chip
                        label={comment.post.title}
                        size="small"
                        variant="outlined"
                        icon={<Comment sx={{ fontSize: 14 }} />}
                        sx={{ mb: 1 }}
                      />

                      <Typography variant="body1" gutterBottom>
                        {comment.content}
                      </Typography>

                      <Stack direction="row" spacing={2} alignItems="center">
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Avatar
                            src={comment.author.avatar_url || undefined}
                            sx={{ width: 20, height: 20 }}
                          >
                            <Person sx={{ fontSize: 14 }} />
                          </Avatar>
                          <Typography variant="caption">{comment.author.nickname}</Typography>
                        </Stack>

                        <Chip
                          icon={<Favorite sx={{ fontSize: 14 }} />}
                          label={`좋아요 ${comment.like_count}`}
                          size="small"
                          variant="outlined"
                          color="error"
                        />

                        <Chip
                          icon={<AccessTime sx={{ fontSize: 14 }} />}
                          label={formatTimeAgo(comment.created_at)}
                          size="small"
                        />
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
            {trendingComments.length === 0 && (
              <Card>
                <CardContent>
                  <Typography color="text.secondary" align="center">
                    최근 2일간 댓글이 없습니다
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Stack>)
        )}
      </Container>
    </Box>
  );
}
