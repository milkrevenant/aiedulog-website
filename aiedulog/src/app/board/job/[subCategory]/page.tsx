'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import {
  Box,
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
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress
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
  Work,
  PersonSearch,
  Business,
  School,
  Menu as MenuIcon,
  AttachFile,
  PictureAsPdf,
  Description,
  FolderZip,
  Close,
  CloudUpload
} from '@mui/icons-material'
import AppHeader from '@/components/AppHeader'
import SideChat from '@/components/SideChat'
import FeedSidebar from '@/components/FeedSidebar'

const subCategoryInfo = {
  all: { name: '전체', icon: <Work />, color: 'info' as const },
  hiring: { name: '구인', icon: <Business />, color: 'success' as const },
  seeking: { name: '구직', icon: <PersonSearch />, color: 'warning' as const }
}

export default function JobBoardPage() {
  const params = useParams()
  const subCategory = (params.subCategory as string) || 'all'
  const router = useRouter()
  const supabase = createClient()
  const theme = useTheme()
  
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<any[]>([])
  const [newPost, setNewPost] = useState('')
  const [newPostTitle, setNewPostTitle] = useState('')
  const [postType, setPostType] = useState<'hiring' | 'seeking'>('hiring')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [postLoading, setPostLoading] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentInfo = subCategoryInfo[subCategory as keyof typeof subCategoryInfo] || subCategoryInfo.all

  // 게시글 목록 가져오기
  const fetchPosts = useCallback(async () => {
    let query = supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_author_id_fkey (
          id,
          email,
          nickname,
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
      .eq('category', 'job')
      .eq('is_published', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)

    // 서브카테고리 필터링
    if (subCategory !== 'all') {
      query = query.eq('sub_category', subCategory)
    }

    const { data, error } = await query

    if (data) {
      const postsWithStats = data.map(post => ({
        ...post,
        author: {
          name: post.profiles?.nickname || post.profiles?.email?.split('@')[0] || '사용자',
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
  }, [supabase, user?.id, subCategory])

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
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)
    } else {
      await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: user.id })
    }

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
      await supabase
        .from('bookmarks')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)
    } else {
      await supabase
        .from('bookmarks')
        .insert({ post_id: postId, user_id: user.id })
    }

    setPosts(posts.map(p => 
      p.id === postId 
        ? { ...p, isBookmarked: !p.isBookmarked }
        : p
    ))
  }

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
          category: 'job',
          sub_category: postType,
          image_urls: imageUrls,
          file_urls: fileUrls,
          file_metadata: fileMetadata
        })
        .select()
        .single()
      
      if (error) throw error
      
      if (data) {
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

  const handleSubCategoryChange = (newSubCategory: string) => {
    router.push(`/board/job/${newSubCategory}`)
  }

  if (loading) {
    return (
      <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
        <AppHeader user={user} profile={profile} />
        <Box sx={{ pt: 2, px: 3 }}>
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
        </Box>
      </Box>
    )
  }

  if (!user || !profile) return null

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', pb: 8 }}>
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
              xs: '100%',
              sm: 600,
              md: 900,
              lg: 1320
            },
            mx: 'auto'
          }}
        >
          {/* 왼쪽 사이드바 */}
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
              xs: '100%',
              sm: 600,
              lg: 720
            },
            flex: '0 0 auto',
            overflow: 'hidden'
          }}>
            {/* 게시판 헤더 */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.info.main, 0.05),
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
              }}
            >
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      bgcolor: alpha(theme.palette[currentInfo.color].main, 0.2),
                      color: currentInfo.color + '.main'
                    }}
                  >
                    {currentInfo.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      구인구직
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      교육 관련 채용 정보를 공유하는 공간
                    </Typography>
                  </Box>
                </Stack>
                
                {/* 서브카테고리 선택 */}
                <ToggleButtonGroup
                  value={subCategory}
                  exclusive
                  onChange={(e, newValue) => newValue && handleSubCategoryChange(newValue)}
                  fullWidth
                  size="small"
                >
                  <ToggleButton value="all">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Work />
                      <Typography>전체</Typography>
                    </Stack>
                  </ToggleButton>
                  <ToggleButton value="hiring">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Business />
                      <Typography>구인</Typography>
                    </Stack>
                  </ToggleButton>
                  <ToggleButton value="seeking">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PersonSearch />
                      <Typography>구직</Typography>
                    </Stack>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Stack>
            </Paper>

            {/* 글 작성 영역 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Stack spacing={2}>
                  {/* 구인/구직 선택 */}
                  <ToggleButtonGroup
                    value={postType}
                    exclusive
                    onChange={(e, newValue) => newValue && setPostType(newValue)}
                    size="small"
                  >
                    <ToggleButton value="hiring">
                      <Business sx={{ mr: 1 }} />
                      구인 글 작성
                    </ToggleButton>
                    <ToggleButton value="seeking">
                      <PersonSearch sx={{ mr: 1 }} />
                      구직 글 작성
                    </ToggleButton>
                  </ToggleButtonGroup>

                  <TextField
                    fullWidth
                    placeholder={postType === 'hiring' ? '구인 제목을 입력하세요...' : '구직 제목을 입력하세요...'}
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
                    rows={5}
                    placeholder={postType === 'hiring' 
                      ? '채용 정보를 자세히 작성해주세요.\n예) 학교/학원명, 과목, 근무조건, 급여, 지역 등'
                      : '경력사항과 희망 근무조건을 작성해주세요.\n예) 경력, 자격증, 희망 과목, 희망 지역 등'}
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
                      이력서, 포트폴리오 등 (PDF, DOC, HWP 등 / 최대 50MB)
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
                        accept=".pdf,.doc,.docx,.hwp,.zip,.rar"
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
                      color={currentInfo.color}
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
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            {post.sub_category === 'hiring' ? (
                              <Chip 
                                icon={<Business />}
                                label="구인" 
                                size="small" 
                                color="success"
                              />
                            ) : post.sub_category === 'seeking' ? (
                              <Chip 
                                icon={<PersonSearch />}
                                label="구직" 
                                size="small" 
                                color="warning"
                              />
                            ) : null}
                            {post.is_pinned && (
                              <Chip 
                                label="고정" 
                                size="small" 
                                color="error"
                              />
                            )}
                          </Stack>
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

          {/* 오른쪽 채팅 영역 */}
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

      {/* 모바일 사이드바 */}
      <FeedSidebar 
        user={user} 
        profile={profile}
        mobileOpen={mobileOpen}
        onMobileToggle={() => setMobileOpen(false)}
      />

      {/* 모바일 햄버거 플로팅 버튼 */}
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

      {/* 위로 가기 플로팅 버튼 */}
      <Fab
        color={currentInfo.color}
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