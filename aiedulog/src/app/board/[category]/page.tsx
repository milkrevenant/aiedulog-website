'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
  CardMedia,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction
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
  Forum,
  School,
  TrendingUp,
  LocalOffer,
  Menu as MenuIcon,
  AttachFile,
  PictureAsPdf,
  Description,
  FolderZip,
  Download,
  Close,
  CloudUpload
} from '@mui/icons-material'
import AppHeader from '@/components/AppHeader'
import SideChat from '@/components/SideChat'
import FeedSidebar from '@/components/FeedSidebar'

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
  const router = useRouter()
  const supabase = createClient()
  const theme = useTheme()
  
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<any[]>([])
  const [newPost, setNewPost] = useState('')
  const [newPostTitle, setNewPostTitle] = useState('')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [postLoading, setPostLoading] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // education 카테고리는 새로운 라우팅으로 리다이렉트
  useEffect(() => {
    if (category === 'education') {
      router.replace('/board/education/all')
    }
  }, [category, router])

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

  // 파일 관련 함수들
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedImages(prev => [...prev, ...files])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => {
      if (file.size > 50 * 1024 * 1024) {
        alert(`${file.name}은 50MB를 초과합니다.`)
        return false
      }
      return true
    })
    setSelectedFiles(prev => [...prev, ...validFiles])
  }

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    const imageFiles: File[] = []
    const docFiles: File[] = []
    
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        imageFiles.push(file)
      } else {
        if (file.size > 50 * 1024 * 1024) {
          alert(`${file.name}은 50MB를 초과합니다.`)
        } else {
          docFiles.push(file)
        }
      }
    })
    
    if (imageFiles.length > 0) {
      setSelectedImages(prev => [...prev, ...imageFiles])
    }
    if (docFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...docFiles])
    }
  }

  // 파일 아이콘 반환 함수
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'pdf':
        return <PictureAsPdf color="error" />
      case 'doc':
      case 'docx':
      case 'hwp':
        return <Description color="primary" />
      case 'ppt':
      case 'pptx':
        return <Description color="warning" />
      case 'zip':
      case 'rar':
        return <FolderZip color="action" />
      default:
        return <AttachFile />
    }
  }

  // 파일 크기 포맷 함수
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handlePost = async () => {
    if (!newPostTitle.trim() || !newPost.trim() || !user) return
    
    setPostLoading(true)
    setUploadingFiles(true)
    
    try {
      let imageUrls: string[] = []
      let fileUrls: string[] = []
      let fileMetadata: any[] = []
      
      // 이미지 업로드
      if (selectedImages.length > 0) {
        for (const image of selectedImages) {
          const fileExt = image.name.split('.').pop()
          const fileName = `${user.id}/${Date.now()}_${Math.random()}.${fileExt}`
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(fileName, image)
          
          if (uploadError) throw uploadError
          
          const { data: { publicUrl } } = supabase.storage
            .from('post-images')
            .getPublicUrl(uploadData.path)
          
          imageUrls.push(publicUrl)
        }
      }
      
      // 파일 업로드
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop()
          const fileName = `${user.id}/${Date.now()}_${file.name}`
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('education-files')
            .upload(fileName, file)
          
          if (uploadError) throw uploadError
          
          const { data: { publicUrl } } = supabase.storage
            .from('education-files')
            .getPublicUrl(uploadData.path)
          
          fileUrls.push(publicUrl)
          fileMetadata.push({
            name: file.name,
            size: file.size,
            type: file.type,
            url: publicUrl
          })
        }
      }
      
      // 게시글 생성
      const { data, error } = await supabase
        .from('posts')
        .insert({
          title: newPostTitle,
          content: newPost,
          author_id: user.id,
          category: category,
          image_urls: imageUrls,
          file_urls: fileUrls,
          file_metadata: fileMetadata
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
        setSelectedImages([])
        setSelectedFiles([])
      }
    } catch (error: any) {
      console.error('Error posting:', error)
      alert('게시글 작성 중 오류가 발생했습니다.')
    } finally {
      setPostLoading(false)
      setUploadingFiles(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
        <AppHeader user={user} profile={profile} />
        <Container maxWidth="sm" sx={{ pt: 2 }}>
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
        px: 3
      }}>
        <Stack 
          direction="row"
          spacing={{ xs: 0, md: 3 }}
          alignItems="flex-start"
          sx={{
            width: '100%',
            maxWidth: { 
              xs: '100%',    // 모바일: 전체 너비
              sm: 600,       // 600px부터: 피드 600px 고정
              md: 900,       // 태블릿: 사이드바(260) + 간격(24) + 피드(600) = 884
              lg: 1320       // 데스크탑: 사이드바(260) + 간격(24) + 피드(720) + 간격(24) + 채팅(320) = 1348
            },
            mx: 'auto'
          }}
        >
          {/* 왼쪽 사이드바 - 데스크탑/태블릿만 표시 */}
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

          {/* 메인 게시판 영역 */}
          <Box sx={{ 
            width: '100%',
            maxWidth: { 
              xs: '100%',      // 모바일: 100% 너비
              sm: 600,         // 600px 이상: 고정 600px
              lg: 720          // lg 이후: 최대 720px까지 확장
            },
            flex: '0 0 auto',  // 고정 너비 유지
            overflow: 'hidden'  // overflow 방지
          }}>
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
              
              {/* 드래그 앤 드롭 영역 */}
              <Box
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                sx={{
                  border: '2px dashed',
                  borderColor: isDragging ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  bgcolor: isDragging ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  fileInputRef.current?.click()
                }}
              >
                <CloudUpload 
                  sx={{ 
                    fontSize: 48, 
                    color: isDragging ? 'primary.main' : 'text.secondary',
                    mb: 1
                  }} 
                />
                <Typography variant="body1" color="text.secondary">
                  파일을 드래그하여 놓거나 클릭하여 선택하세요
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  이미지, PDF, DOC, PPT, HWP, ZIP 파일 지원 (최대 50MB)
                </Typography>
              </Box>
              
              {/* 선택된 이미지 미리보기 */}
              {selectedImages.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {selectedImages.map((image, index) => (
                    <Box key={index} sx={{ position: 'relative' }}>
                      <img 
                        src={URL.createObjectURL(image)} 
                        alt={`Preview ${index}`}
                        style={{ 
                          width: 100, 
                          height: 100, 
                          objectFit: 'cover',
                          borderRadius: 8
                        }} 
                      />
                      <IconButton
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          bgcolor: 'background.paper'
                        }}
                        onClick={() => handleRemoveImage(index)}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              )}
              
              {/* 선택된 파일 목록 */}
              {selectedFiles.length > 0 && (
                <List dense>
                  {selectedFiles.map((file, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {getFileIcon(file.name)}
                      </ListItemIcon>
                      <ListItemText 
                        primary={file.name}
                        secondary={formatFileSize(file.size)}
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          size="small"
                          onClick={() => handleRemoveFile(index)}
                        >
                          <Close />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
              
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Stack direction="row" spacing={1}>
                  <input
                    ref={imageInputRef}
                    type="file"
                    hidden
                    multiple
                    accept="image/*"
                    onChange={handleImageSelect}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.hwp,.zip,.rar"
                    onChange={handleFileSelect}
                  />
                  <Button 
                    startIcon={<PhotoCamera />}
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingFiles}
                  >
                    이미지
                  </Button>
                  <Button 
                    startIcon={<AttachFile />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFiles}
                  >
                    파일 첨부
                  </Button>
                  <IconButton color="primary">
                    <Mood />
                  </IconButton>
                  <IconButton color="primary">
                    <LocationOn />
                  </IconButton>
                </Stack>
                <Button 
                  variant="contained" 
                  endIcon={uploadingFiles ? <CircularProgress size={20} /> : <Send />}
                  onClick={handlePost}
                  disabled={!newPostTitle.trim() || !newPost.trim() || postLoading}
                  color={boardInfo.color}
                >
                  {postLoading ? '업로드 중...' : '게시'}
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
          </Box>

          {/* 오른쪽 채팅 영역 - 데스크탑만 */}
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

      {/* 위로 가기 플로팅 버튼 - 오른쪽 하단 */}
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