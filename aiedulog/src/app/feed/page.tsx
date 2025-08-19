'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
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
  CircularProgress,
  CardMedia
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
  Close,
  Menu as MenuIcon
} from '@mui/icons-material'
import AppHeader from '@/components/AppHeader'
import SideChat from '@/components/SideChat'
import FeedSidebar from '@/components/FeedSidebar'


export default function FeedPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<any[]>([])
  const [newPost, setNewPost] = useState('')
  const [newPostTitle, setNewPostTitle] = useState('')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [postLoading, setPostLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hasMorePosts, setHasMorePosts] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const router = useRouter()
  const supabase = createClient()
  const theme = useTheme()

  // 게시글 목록 가져오기
  const fetchPosts = useCallback(async (offset = 0, append = false) => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_author_id_fkey (
          id,
          email,
          nickname,
          role,
          avatar_url
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
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + 19)
      .limit(20)

    if (data) {
      console.log('Fetched posts:', data) // 디버깅용
      const postsWithStats = data.map(post => {
        console.log('Post image_urls:', post.image_urls) // 각 게시글의 image_urls 확인
        return {
          ...post,
          author: {
            name: post.profiles?.nickname || post.profiles?.email?.split('@')[0] || '사용자',
            email: post.profiles?.email,
            role: post.profiles?.role || 'member',
            isVerified: post.profiles?.role === 'verified',
            avatar_url: post.profiles?.avatar_url
          },
          likes: post.post_likes?.length || 0,
          comments: post.comments?.length || 0,
          isLiked: post.post_likes?.some((like: any) => like.user_id === user?.id) || false,
          isBookmarked: post.bookmarks?.some((bookmark: any) => bookmark.user_id === user?.id) || false
        }
      })
      
      if (append) {
        setPosts(prev => [...prev, ...postsWithStats])
      } else {
        setPosts(postsWithStats)
      }
      
      // 더 이상 게시글이 없으면 hasMorePosts를 false로
      if (data.length < 20) {
        setHasMorePosts(false)
      }
    }
  }, [supabase, user?.id])

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleLoadMore = async () => {
    if (!hasMorePosts || loadingMore) return
    
    setLoadingMore(true)
    try {
      await fetchPosts(posts.length, true)
    } finally {
      setLoadingMore(false)
    }
  }

  const handlePost = async () => {
    if (!newPostTitle.trim() || !newPost.trim() || !user) return
    
    setPostLoading(true)
    let imageUrl = null
    
    try {
      // 이미지 업로드
      if (selectedImage) {
        setUploadingImage(true)
        const fileExt = selectedImage.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, selectedImage)
        
        if (uploadError) throw uploadError
        
        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(uploadData.path)
        
        imageUrl = publicUrl
      }
      
      // 게시글 생성
      const { data, error } = await supabase
        .from('posts')
        .insert({
          title: newPostTitle,
          content: newPost,
          author_id: user.id,
          category: 'general',
          image_urls: imageUrl ? [imageUrl] : []
        })
        .select()
        .single()
      
      if (error) throw error
      
      if (data) {
        // 새 게시글을 목록 맨 앞에 추가
        const newPostData = {
          ...data,
          author: {
            name: profile?.nickname || profile?.email?.split('@')[0] || '사용자',
            email: profile?.email,
            role: profile?.role || 'member',
            isVerified: profile?.role === 'verified',
            avatar_url: profile?.avatar_url
          },
          likes: 0,
          comments: 0,
          isLiked: false,
          isBookmarked: false
        }
        
        setPosts([newPostData, ...posts])
        setNewPostTitle('')
        setNewPost('')
        handleRemoveImage()
      }
    } catch (error: any) {
      console.error('Error posting:', error)
    } finally {
      setPostLoading(false)
      setUploadingImage(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
        <Container maxWidth="sm" sx={{ py: 2 }}>
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

      <Box sx={{ 
        display: 'flex',
        justifyContent: 'center',
        py: 3, 
        px: 3  // 모든 구간 패딩 통일
      }}>
        <Stack 
          direction="row"
          spacing={{ xs: 0, md: 3 }}  // md(900px)부터만 spacing 적용
          alignItems="flex-start"
          sx={{
            width: '100%',
            maxWidth: 1400,  // 최대 너비 제한
            mx: 'auto',
            justifyContent: {
              xs: 'center',    // 모바일: 가운데 정렬
              sm: 'center',    // 600-899px: 가운데 정렬 (사이드바 없음)
              md: 'center',    // 900px-1199px: 가운데 정렬
              lg: 'center'     // 1200px 이상: 가운데 정렬
            }
          }}
        >
          {/* 왼쪽 사이드바 - 900px 이상에서 표시 */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              width: 260,
              flexShrink: 0
            }}
          >
            <Paper
              elevation={0}
              sx={{
                width: 260,
                height: 'calc(100vh - 64px)',
                position: 'sticky',
                top: 80,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                overflow: 'hidden'
              }}
            >
              <FeedSidebar 
                user={user} 
                profile={profile}
                isStatic={true}
              />
            </Paper>
          </Box>

          {/* 메인 피드 영역 */}
          <Box sx={{ 
            width: '100%',
            maxWidth: { 
              xs: '100%',      // 모바일: 100% 너비
              sm: 600,         // 600px 이상: 고정 600px
              md: 'calc(100% - 260px - 24px)', // 900px-1199px: 사이드바 있을 때
              lg: 600          // lg 이후: 600px 고정 (사이드바와 채팅 사이)
            },
            flex: { 
              xs: '1 1 auto',  // 모바일: 유연한 너비
              sm: '0 1 600px', // 600-899px: 고정 600px, 축소 가능
              md: '1 1 auto'   // 900px 이상: 유연한 너비
            },
            minWidth: 0,       // flexbox 오버플로우 방지
            mx: { 
              xs: 'auto',      // 모바일: 가운데 정렬
              sm: 'auto',      // 600-899px: 가운데 정렬 (중요!)
              md: 'auto',      // 900px-1199px: 가운데 정렬
              lg: 0            // 1200px 이상: 사이드바/채팅과 함께 배치
            }
          }}>
            {/* 글 작성 영역 */}
            <Card sx={{ mb: 3, overflow: 'hidden' }}>
              <CardContent sx={{ p: 3 }}>
            <Stack spacing={2}>
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
                placeholder="교육 경험을 공유해주세요..."
                variant="outlined"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
              
              {/* 이미지 미리보기 */}
              {imagePreview && (
                <Box sx={{ position: 'relative', mt: 2 }}>
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    style={{ 
                      width: '100%', 
                      maxHeight: 300, 
                      objectFit: 'cover',
                      borderRadius: 8
                    }} 
                  />
                  <IconButton
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'background.paper',
                      '&:hover': { bgcolor: 'background.paper' }
                    }}
                    onClick={handleRemoveImage}
                  >
                    <Close />
                  </IconButton>
                </Box>
              )}
              
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Stack direction="row" spacing={1}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleImageSelect}
                  />
                  <IconButton 
                    color="primary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <CircularProgress size={20} />
                    ) : (
                      <PhotoCamera />
                    )}
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
                >
                  {postLoading ? '게시중...' : '게시'}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* 피드 */}
        <Stack spacing={2}>
          {posts.map((post) => (
            <Card 
              key={post.id}
              sx={{ 
                cursor: 'pointer',
                overflow: 'hidden',
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
                    <Avatar 
                      src={post.author.avatar_url || undefined}
                      sx={{ bgcolor: 'primary.main' }}
                    >
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
              
              <CardContent sx={{ p: 3 }}>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', mt: 1 }}>
                  {post.content}
                </Typography>
              </CardContent>

              {post.image_urls && post.image_urls.length > 0 && (
                <Box sx={{ position: 'relative', p: 2, pt: 0 }}>
                  <CardMedia
                    component="img"
                    image={post.image_urls[0]}
                    alt="Post image"
                    sx={{ 
                      width: '100%',
                      maxHeight: 400, 
                      objectFit: 'cover',
                      borderRadius: '12px'
                    }}
                  />
                  {post.image_urls.length > 1 && (
                    <Chip
                      label={`+${post.image_urls.length - 1}`}
                      size="small"
                      sx={{
                        position: 'absolute',
                        bottom: 32,
                        right: 32,
                        bgcolor: 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                  )}
                </Box>
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
                <Typography variant="body2" color="text.secondary">
                  {post.shares}
                </Typography>
                
                <Box sx={{ flexGrow: 1 }} />
                
                <IconButton 
                  onClick={() => handleBookmark(post.id)}
                  color={post.isBookmarked ? 'primary' : 'default'}
                >
                  {post.isBookmarked ? <Bookmark /> : <BookmarkBorder />}
                </IconButton>
              </CardActions>
            </Card>
          ))}
        </Stack>

            {/* 더 보기 버튼 */}
            {hasMorePosts && (
              <Box sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
                <Button 
                  variant="outlined" 
                  size="large"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  startIcon={loadingMore ? <CircularProgress size={20} /> : null}
                >
                  {loadingMore ? '불러오는 중...' : '더 많은 게시글 보기'}
                </Button>
              </Box>
            )}
          </Box>

          {/* 오른쪽 채팅 영역 - 1200px 이상에서만 */}
          <Box
            sx={{
              width: 320,
              flexShrink: 0,
              display: { xs: 'none', lg: 'block' }
            }}
          >
            <Box
              sx={{
                position: 'sticky',
                top: 80
              }}
            >
              <SideChat user={user} />
            </Box>
          </Box>
        </Stack>
      </Box>

      {/* 모바일 사이드바 (Drawer로 처리됨) */}
      <FeedSidebar 
        user={user} 
        profile={profile}
        mobileOpen={mobileOpen}
        onMobileToggle={() => setMobileOpen(false)}
      />

      {/* 모바일 햄버거 플로팅 버튼 - 왼쪽 하단 */}
      <Fab
        color="primary"
        sx={{
          display: { xs: 'flex', md: 'none' },
          position: 'fixed',
          bottom: 16,
          left: 16,
          zIndex: 1100,
        }}
        onClick={() => setMobileOpen(true)}
      >
        <MenuIcon />
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