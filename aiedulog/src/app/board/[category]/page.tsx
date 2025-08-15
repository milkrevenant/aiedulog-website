'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import {
  Box,
  Container,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Avatar,
  IconButton,
  Typography,
  Button,
  TextField,
  Stack,
  Divider,
  Fab,
  Skeleton,
  Paper,
  Chip,
  Menu,
  MenuItem,
  Badge,
  useTheme,
  alpha,
  Breadcrumbs,
  Link
} from '@mui/material'
import {
  Favorite,
  FavoriteBorder,
  ChatBubbleOutline,
  Share,
  Bookmark,
  BookmarkBorder,
  MoreVert,
  Add,
  Send,
  PhotoCamera,
  Mood,
  LocationOn,
  VerifiedUser,
  NavigateNext,
  Forum,
  School,
  TrendingUp,
  LocalOffer
} from '@mui/icons-material'
import AppHeader from '@/components/AppHeader'

const categoryInfo = {
  general: {
    name: '자유게시판',
    icon: <Forum />,
    color: 'primary' as const,
    description: '자유롭게 소통하는 공간'
  },
  education: {
    name: '교육 자료실',
    icon: <School />,
    color: 'success' as const,
    description: '교육 자료 공유'
  },
  tech: {
    name: '에듀테크 트렌드',
    icon: <TrendingUp />,
    color: 'warning' as const,
    description: '최신 교육 기술 동향'
  },
  job: {
    name: '구인구직',
    icon: <LocalOffer />,
    color: 'info' as const,
    description: '교육 관련 채용 정보'
  }
}

export default function BoardPage() {
  const params = useParams()
  const category = params.category as string
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<any[]>([])
  const [newPost, setNewPost] = useState('')
  const [newPostTitle, setNewPostTitle] = useState('')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [postLoading, setPostLoading] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()
  const theme = useTheme()

  const boardInfo = categoryInfo[category as keyof typeof categoryInfo] || categoryInfo.general

  // 게시글 목록 가져오기
  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_author_id_fkey (
          id,
          email,
          role
        ),
        post_likes (
          user_id
        ),
        comments (
          id
        ),
        bookmarks (
          user_id
        )
      `)
      .eq('category', category)
      .eq('is_published', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) {
      const postsWithStats = data.map(post => ({
        ...post,
        author: {
          name: post.profiles?.email?.split('@')[0] || '사용자',
          email: post.profiles?.email,
          role: post.profiles?.role || 'member',
          isVerified: post.profiles?.role === 'verified'
        },
        likes: post.post_likes?.length || 0,
        comments: post.comments?.length || 0,
        isLiked: post.post_likes?.some((like: any) => like.user_id === user?.id) || false,
        isBookmarked: post.bookmarks?.some((bookmark: any) => bookmark.user_id === user?.id) || false
      }))
      setPosts(postsWithStats)
    }
  }, [supabase, user?.id, category])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
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

  useEffect(() => {
    if (user) {
      fetchPosts()
    }
  }, [user, fetchPosts])

  const handleLike = async (postId: string) => {
    const post = posts.find(p => p.id === postId)
    if (!post || !user) return

    if (post.isLiked) {
      // 좋아요 취소
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)
    } else {
      // 좋아요 추가
      await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: user.id })
    }

    // UI 업데이트
    setPosts(posts.map(p => 
      p.id === postId 
        ? { 
            ...p, 
            isLiked: !p.isLiked,
            likes: p.isLiked ? p.likes - 1 : p.likes + 1
          }
        : p
    ))
  }

  const handleBookmark = async (postId: string) => {
    const post = posts.find(p => p.id === postId)
    if (!post || !user) return

    if (post.isBookmarked) {
      // 북마크 취소
      await supabase
        .from('bookmarks')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)
    } else {
      // 북마크 추가
      await supabase
        .from('bookmarks')
        .insert({ post_id: postId, user_id: user.id })
    }

    // UI 업데이트
    setPosts(posts.map(p => 
      p.id === postId 
        ? { ...p, isBookmarked: !p.isBookmarked }
        : p
    ))
  }

  const handlePost = async () => {
    if (!newPostTitle.trim() || !newPost.trim() || !user) return
    
    setPostLoading(true)
    
    const { data, error } = await supabase
      .from('posts')
      .insert({
        title: newPostTitle,
        content: newPost,
        author_id: user.id,
        category: category
      })
      .select()
      .single()
    
    if (data) {
      // 새 게시글을 목록 맨 앞에 추가
      const newPostData = {
        ...data,
        author: {
          name: profile?.email?.split('@')[0] || '사용자',
          email: profile?.email,
          role: profile?.role || 'member',
          isVerified: profile?.role === 'verified'
        },
        likes: 0,
        comments: 0,
        isLiked: false,
        isBookmarked: false
      }
      
      setPosts([newPostData, ...posts])
      setNewPostTitle('')
      setNewPost('')
    }
    
    setPostLoading(false)
  }

  if (loading) {
    return (
      <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
        <AppHeader user={user} profile={profile} />
        <Container maxWidth="md" sx={{ pt: 2 }}>
          <Stack spacing={2}>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader
                  avatar={<Skeleton variant="circular" width={40} height={40} />}
                  title={<Skeleton width="30%" />}
                  subheader={<Skeleton width="20%" />}
                />
                <Skeleton variant="rectangular" height={200} />
                <CardContent>
                  <Skeleton />
                  <Skeleton width="60%" />
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Container>
      </Box>
    )
  }

  if (!user || !profile) return null

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', pb: 8 }}>
      {/* 공통 헤더 */}
      <AppHeader user={user} profile={profile} />

      <Container maxWidth="md" sx={{ pt: 3 }}>
        {/* 브레드크럼 */}
        <Breadcrumbs 
          separator={<NavigateNext fontSize="small" />}
          sx={{ mb: 2 }}
        >
          <Link
            underline="hover"
            color="inherit"
            href="/feed"
            onClick={(e) => { e.preventDefault(); router.push('/feed') }}
          >
            홈
          </Link>
          <Typography color="text.primary">{boardInfo.name}</Typography>
        </Breadcrumbs>

        {/* 게시판 헤더 */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            bgcolor: alpha(theme.palette[boardInfo.color].main, 0.05),
            border: `1px solid ${alpha(theme.palette[boardInfo.color].main, 0.2)}`
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: alpha(theme.palette[boardInfo.color].main, 0.2),
                color: boardInfo.color + '.main'
              }}
            >
              {boardInfo.icon}
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                {boardInfo.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {boardInfo.description}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* 글 작성 영역 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  {profile.email?.[0]?.toUpperCase()}
                </Avatar>
                <Stack spacing={2} sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    placeholder="제목을 입력하세요..."
                    variant="outlined"
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder={`${boardInfo.name}에 글을 작성해보세요...`}
                    variant="outlined"
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />
                </Stack>
              </Stack>
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Stack direction="row" spacing={1}>
                  <IconButton color="primary">
                    <PhotoCamera />
                  </IconButton>
                  <IconButton color="primary">
                    <Mood />
                  </IconButton>
                  <IconButton color="primary">
                    <LocationOn />
                  </IconButton>
                </Stack>
                <Button 
                  variant="contained" 
                  endIcon={<Send />}
                  onClick={handlePost}
                  disabled={!newPostTitle.trim() || !newPost.trim() || postLoading}
                  color={boardInfo.color}
                >
                  {postLoading ? '게시중...' : '게시'}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* 피드 */}
        <Stack spacing={2}>
          {posts.length === 0 ? (
            <Card>
              <CardContent>
                <Typography variant="body1" color="text.secondary" align="center">
                  아직 게시글이 없습니다. 첫 번째 글을 작성해보세요!
                </Typography>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => (
              <Card 
                key={post.id}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 3
                  }
                }}
                onClick={(e) => {
                  // 버튼이나 액션 아이템 클릭시 카드 클릭 이벤트 방지
                  if ((e.target as HTMLElement).closest('button, .MuiIconButton-root')) {
                    return
                  }
                  router.push(`/post/${post.id}`)
                }}
              >
                <CardHeader
                  avatar={
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      badgeContent={
                        post.author.isVerified ? (
                          <VerifiedUser 
                            sx={{ 
                              width: 16, 
                              height: 16, 
                              color: 'success.main',
                              bgcolor: 'background.paper',
                              borderRadius: '50%'
                            }} 
                          />
                        ) : null
                      }
                    >
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {post.author.name[0]}
                      </Avatar>
                    </Badge>
                  }
                  action={
                    <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                      <MoreVert />
                    </IconButton>
                  }
                  title={
                    <Stack>
                      {post.is_pinned && (
                        <Chip 
                          label="고정" 
                          size="small" 
                          color="error" 
                          sx={{ mb: 1, width: 'fit-content' }}
                        />
                      )}
                      <Typography variant="h6" fontWeight="bold">
                        {post.title}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle2">
                          {post.author.name}
                        </Typography>
                        {post.author.role === 'verified' && (
                          <Chip 
                            label="인증 교사" 
                            size="small" 
                            color="success" 
                            sx={{ height: 20 }}
                          />
                        )}
                        {post.author.role === 'admin' && (
                          <Chip 
                            label="관리자" 
                            size="small" 
                            color="error" 
                            sx={{ height: 20 }}
                          />
                        )}
                      </Stack>
                    </Stack>
                  }
                  subheader={new Date(post.created_at).toLocaleString('ko-KR')}
                />
                
                <CardContent>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-line', mt: 1 }}>
                    {post.content}
                  </Typography>
                </CardContent>

                {post.image && (
                  <Box
                    component="img"
                    src={post.image}
                    alt="Post image"
                    sx={{ width: '100%', maxHeight: 400, objectFit: 'cover' }}
                  />
                )}

                <CardActions disableSpacing>
                  <IconButton 
                    onClick={() => handleLike(post.id)}
                    color={post.isLiked ? 'error' : 'default'}
                  >
                    {post.isLiked ? <Favorite /> : <FavoriteBorder />}
                  </IconButton>
                  <Typography variant="body2" color="text.secondary">
                    {post.likes}
                  </Typography>
                  
                  <IconButton sx={{ ml: 1 }}>
                    <ChatBubbleOutline />
                  </IconButton>
                  <Typography variant="body2" color="text.secondary">
                    {post.comments}
                  </Typography>
                  
                  <IconButton sx={{ ml: 1 }}>
                    <Share />
                  </IconButton>
                  
                  <Box sx={{ flexGrow: 1 }} />
                  
                  <IconButton 
                    onClick={() => handleBookmark(post.id)}
                    color={post.isBookmarked ? 'primary' : 'default'}
                  >
                    {post.isBookmarked ? <Bookmark /> : <BookmarkBorder />}
                  </IconButton>
                </CardActions>
              </Card>
            ))
          )}
        </Stack>

        {/* 더 보기 버튼 */}
        {posts.length > 0 && (
          <Box sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
            <Button variant="outlined" size="large">
              더 많은 게시글 보기
            </Button>
          </Box>
        )}
      </Container>

      {/* 플로팅 버튼 */}
      <Fab
        color={boardInfo.color}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <Add />
      </Fab>

      {/* 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => setAnchorEl(null)}>신고하기</MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>숨기기</MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>공유하기</MenuItem>
      </Menu>
    </Box>
  )
}