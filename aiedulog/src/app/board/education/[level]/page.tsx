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
  Select,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
} from '@mui/material'
import {
  Favorite,
  FavoriteBorder,
  ChatBubbleOutline,
  Chat,
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
  School,
  Menu as MenuIcon,
  AttachFile,
  PictureAsPdf,
  Description,
  FolderZip,
  Download,
  Close,
  CloudUpload,
} from '@mui/icons-material'
import AppHeader from '@/components/AppHeader'
import SideChat from '@/components/SideChat'
import FeedSidebar from '@/components/FeedSidebar'

const levelInfo = {
  ele: { name: '초등학교', color: 'info' as const },
  mid: { name: '중학교', color: 'warning' as const },
  high: { name: '고등학교', color: 'error' as const },
  common: { name: '공통', color: 'success' as const },
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
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export default function EducationLevelPage() {
  const params = useParams()
  const level = params.level as string
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<any[]>([])
  const [newPost, setNewPost] = useState('')
  const [newPostTitle, setNewPostTitle] = useState('')
  const [selectedLevel, setSelectedLevel] = useState(level === 'all' ? 'common' : level)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [postLoading, setPostLoading] = useState(false)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const router = useRouter()
  const supabase = createClient()
  const theme = useTheme()

  const currentLevel = levelInfo[level as keyof typeof levelInfo] || {
    name: '전체',
    color: 'primary' as const,
  }

  // 게시글 목록 가져오기
  const fetchPosts = useCallback(async () => {
    let query = supabase
      .from('posts')
      .select(
        `
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
      `
      )
      .eq('is_published', true)
      .eq('category', 'education')
      .order('created_at', { ascending: false })
      .limit(20)

    // 학교급별 필터링
    if (level !== 'all') {
      query = query.eq('school_level', level)
    }

    const { data, error } = await query

    if (data) {
      const postsWithStats = data.map((post) => ({
        ...post,
        author: {
          name: post.identities?.user_profiles?.nickname || post.identities?.user_profiles?.email?.split('@')[0] || '사용자',
          email: post.identities?.user_profiles?.email,
          role: post.identities?.user_profiles?.role || 'member',
          isVerified: post.identities?.user_profiles?.role === 'verified',
          avatar_url: post.identities?.user_profiles?.avatar_url,
        },
        likes: post.post_likes?.length || 0,
        comments: post.comments?.length || 0,
        isLiked: post.post_likes?.some((like: any) => like.user_id === user?.id) || false,
        isBookmarked:
          post.bookmarks?.some((bookmark: any) => bookmark.user_id === user?.id) || false,
      }))
      setPosts(postsWithStats)
    }
  }, [supabase, user?.id, level])

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

      const { data: authMethod } = await supabase
        .from('auth_methods')
        .select(`
          identities!inner (
            user_profiles!inner (*)
          )
        `)
        .eq('provider', 'supabase')
        .eq('provider_user_id', user.id)
        .single()

      setProfile(authMethod?.identities?.user_profiles || null)
      setLoading(false)
    }
    getUser()
  }, [router, supabase])

  useEffect(() => {
    if (user) {
      fetchPosts()
    }
  }, [user, fetchPosts])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedImages((prev) => [...prev, ...files])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    // 파일 크기 체크 (50MB)
    const validFiles = files.filter((file) => {
      if (file.size > 50 * 1024 * 1024) {
        alert(`${file.name}은 50MB를 초과합니다.`)
        return false
      }
      return true
    })
    setSelectedFiles((prev) => [...prev, ...validFiles])
  }

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
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

    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        imageFiles.push(file)
      } else {
        // 파일 크기 체크
        if (file.size > 50 * 1024 * 1024) {
          alert(`${file.name}은 50MB를 초과합니다.`)
        } else {
          docFiles.push(file)
        }
      }
    })

    if (imageFiles.length > 0) {
      setSelectedImages((prev) => [...prev, ...imageFiles])
    }
    if (docFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...docFiles])
    }
  }

  const handlePost = async () => {
    if (!newPostTitle.trim() || !newPost.trim() || !user) return

    setPostLoading(true)
    setUploadingFiles(true)

    try {
      const imageUrls: string[] = []
      const fileUrls: string[] = []
      const fileMetadata: any[] = []

      // 이미지 업로드
      if (selectedImages.length > 0) {
        for (const image of selectedImages) {
          const fileExt = image.name.split('.').pop()
          const fileName = `${user.id}/${Date.now()}_${Math.random()}.${fileExt}`

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(fileName, image)

          if (uploadError) throw uploadError

          const {
            data: { publicUrl },
          } = supabase.storage.from('post-images').getPublicUrl(uploadData.path)

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

          const {
            data: { publicUrl },
          } = supabase.storage.from('education-files').getPublicUrl(uploadData.path)

          fileUrls.push(publicUrl)
          fileMetadata.push({
            name: file.name,
            size: file.size,
            type: file.type,
            url: publicUrl,
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
          category: 'education',
          school_level: selectedLevel,
          image_urls: imageUrls,
          file_urls: fileUrls,
          file_metadata: fileMetadata,
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
            avatar_url: profile?.avatar_url,
          },
          likes: 0,
          comments: 0,
          isLiked: false,
          isBookmarked: false,
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

  const handleLike = async (postId: string) => {
    const post = posts.find((p) => p.id === postId)
    if (!post || !user) return

    if (post.isLiked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
    }

    setPosts(
      posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              isLiked: !p.isLiked,
              likes: p.isLiked ? p.likes - 1 : p.likes + 1,
            }
          : p
      )
    )
  }

  const handleBookmark = async (postId: string) => {
    const post = posts.find((p) => p.id === postId)
    if (!post || !user) return

    if (post.isBookmarked) {
      await supabase.from('bookmarks').delete().eq('post_id', postId).eq('user_id', user.id)
    } else {
      await supabase.from('bookmarks').insert({ post_id: postId, user_id: user.id })
    }

    setPosts(posts.map((p) => (p.id === postId ? { ...p, isBookmarked: !p.isBookmarked } : p)))
  }

  if (loading) {
    return (
      <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
        <AppHeader user={user} profile={profile} />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            py: 3,
            px: 3,
          }}
        >
          <Stack spacing={2} sx={{ width: '100%', maxWidth: 600 }}>
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
      {/* 공통 헤더 */}
      <AppHeader user={user} profile={profile} />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          py: 3,
          px: 3,
        }}
      >
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
              lg: 1320,
            },
            mx: 'auto',
          }}
        >
          {/* 왼쪽 사이드바 */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              width: 260,
              flexShrink: 0,
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
                overflow: 'hidden',
              }}
            >
              <FeedSidebar user={user} profile={profile} isStatic={true} />
            </Paper>
          </Box>

          {/* 메인 게시판 영역 */}
          <Box
            sx={{
              width: '100%',
              maxWidth: {
                xs: '100%',
                sm: 600,
                lg: 720,
              },
              flex: '0 0 auto',
              overflow: 'hidden',
            }}
          >
            {/* 게시판 헤더 */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.success.main, 0.05),
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: alpha(theme.palette.success.main, 0.2),
                    color: 'success.main',
                  }}
                >
                  <School />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h4" fontWeight="bold">
                    교육 자료실 {level !== 'all' && `- ${currentLevel.name}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    교육 자료 공유 및 다운로드
                  </Typography>
                </Box>
                {/* 학교급 필터 버튼들 */}
                <Stack direction="row" spacing={1}>
                  <Chip
                    label="전체"
                    onClick={() => router.push('/board/education')}
                    color={level === 'all' ? 'primary' : 'default'}
                    variant={level === 'all' ? 'filled' : 'outlined'}
                  />
                  <Chip
                    label="초등"
                    onClick={() => router.push('/board/education/ele')}
                    color={level === 'ele' ? 'info' : 'default'}
                    variant={level === 'ele' ? 'filled' : 'outlined'}
                  />
                  <Chip
                    label="중등"
                    onClick={() => router.push('/board/education/mid')}
                    color={level === 'mid' ? 'warning' : 'default'}
                    variant={level === 'mid' ? 'filled' : 'outlined'}
                  />
                  <Chip
                    label="고등"
                    onClick={() => router.push('/board/education/high')}
                    color={level === 'high' ? 'error' : 'default'}
                    variant={level === 'high' ? 'filled' : 'outlined'}
                  />
                  <Chip
                    label="공통"
                    onClick={() => router.push('/board/education/common')}
                    color={level === 'common' ? 'success' : 'default'}
                    variant={level === 'common' ? 'filled' : 'outlined'}
                  />
                </Stack>
              </Stack>
            </Paper>

            {/* 글 작성 영역 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      fullWidth
                      placeholder="제목을 입력하세요..."
                      variant="outlined"
                      value={newPostTitle}
                      onChange={(e) => setNewPostTitle(e.target.value)}
                    />
                    <FormControl sx={{ minWidth: 120 }}>
                      <InputLabel>학교급</InputLabel>
                      <Select
                        value={selectedLevel}
                        label="학교급"
                        onChange={(e) => setSelectedLevel(e.target.value)}
                      >
                        <MenuItem value="ele">초등학교</MenuItem>
                        <MenuItem value="mid">중학교</MenuItem>
                        <MenuItem value="high">고등학교</MenuItem>
                        <MenuItem value="common">공통</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="자료 설명을 입력하세요..."
                    variant="outlined"
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
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
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      // 클릭하면 파일 선택 다이얼로그 열기
                      fileInputRef.current?.click()
                    }}
                  >
                    <CloudUpload
                      sx={{
                        fontSize: 48,
                        color: isDragging ? 'primary.main' : 'text.secondary',
                        mb: 1,
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
                              borderRadius: 8,
                            }}
                          />
                          <IconButton
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              bgcolor: 'background.paper',
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
                          <ListItemIcon>{getFileIcon(file.name)}</ListItemIcon>
                          <ListItemText primary={file.name} secondary={formatFileSize(file.size)} />
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
                    </Stack>
                    <Button
                      variant="contained"
                      endIcon={uploadingFiles ? <CircularProgress size={20} /> : <CloudUpload />}
                      onClick={handlePost}
                      disabled={!newPostTitle.trim() || !newPost.trim() || postLoading}
                    >
                      {postLoading ? '업로드 중...' : '자료 올리기'}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {/* 게시글 목록 */}
            <Stack spacing={2}>
              {posts.map((post) => (
                <Card
                  key={post.id}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 3,
                    },
                  }}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button, .MuiIconButton-root, a')) {
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
                                borderRadius: '50%',
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
                      <Stack direction="row" spacing={1} alignItems="center">
                        {post.school_level && (
                          <Chip
                            label={
                              levelInfo[post.school_level as keyof typeof levelInfo]?.name ||
                              '미분류'
                            }
                            size="small"
                            color={
                              levelInfo[post.school_level as keyof typeof levelInfo]?.color ||
                              'default'
                            }
                          />
                        )}
                        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                          <MoreVert />
                        </IconButton>
                      </Stack>
                    }
                    title={
                      <Typography variant="h6" fontWeight="bold">
                        {post.title}
                      </Typography>
                    }
                    subheader={new Date(post.created_at).toLocaleString('ko-KR')}
                  />

                  <CardContent>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                      {post.content}
                    </Typography>

                    {/* 첨부 파일 목록 */}
                    {post.file_metadata && post.file_metadata.length > 0 && (
                      <List dense>
                        {post.file_metadata.map((file: any, index: number) => {
                          const isPDF = file.name.toLowerCase().endsWith('.pdf')
                          return (
                            <ListItem
                              key={index}
                              sx={{
                                '&:hover': {
                                  bgcolor: 'action.hover',
                                },
                              }}
                            >
                              <ListItemIcon>{getFileIcon(file.name)}</ListItemIcon>
                              <ListItemText
                                primary={file.name}
                                secondary={formatFileSize(file.size)}
                              />
                              <ListItemSecondaryAction>
                                <Stack direction="row" spacing={1}>
                                  {isPDF && (
                                    <IconButton
                                      edge="end"
                                      component="a"
                                      href={file.url}
                                      target="_blank"
                                      title="미리보기"
                                    >
                                      <PictureAsPdf />
                                    </IconButton>
                                  )}
                                  <IconButton
                                    edge="end"
                                    component="a"
                                    href={file.url}
                                    download={file.name}
                                    title="다운로드"
                                  >
                                    <Download />
                                  </IconButton>
                                </Stack>
                              </ListItemSecondaryAction>
                            </ListItem>
                          )
                        })}
                      </List>
                    )}
                  </CardContent>

                  {/* 이미지 표시 */}
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
                          borderRadius: '12px',
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
                            fontWeight: 'bold',
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
              ))}
            </Stack>

            {/* 더 보기 버튼 */}
            {posts.length > 0 && (
              <Box sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
                <Button variant="outlined" size="large">
                  더 많은 자료 보기
                </Button>
              </Box>
            )}
          </Box>

          {/* 오른쪽 채팅 영역 */}
          <Box
            sx={{
              width: 320,
              flexShrink: 0,
              display: { xs: 'none', lg: 'block' },
            }}
          >
            {/* Chat button for desktop */}
            <Fab
              color="primary"
              onClick={() => setChatOpen(true)}
              sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                display: { xs: 'none', md: 'flex' }
              }}
            >
              <Badge badgeContent={0} color="error">
                <Chat />
              </Badge>
            </Fab>
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

      {/* 모바일 햄버거 FAB */}
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

      {/* 위로 가기 FAB */}
      <Fab
        color="success"
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
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => setAnchorEl(null)}>신고하기</MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>숨기기</MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>공유하기</MenuItem>
      </Menu>

      {/* 모바일 채팅 FAB */}
      <Fab
        color="secondary"
        onClick={() => setChatOpen(true)}
        sx={{
          display: { xs: 'flex', md: 'none' },
          position: 'fixed',
          bottom: 80,
          right: 16,
          zIndex: 1100,
        }}
      >
        <Badge badgeContent={0} color="error">
          <Chat />
        </Badge>
      </Fab>

      {/* 채팅 드로어 */}
      <SideChat 
        user={user}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </Box>
  )
}
