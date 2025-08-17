'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  Stack,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Paper,
  Tabs,
  Tab,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Article as ArticleIcon,
  Event as EventIcon,
  EmojiEvents as AchievementIcon,
  Image as ImageIcon,
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'
import { usePermission } from '@/hooks/usePermission'
import AuthGuard from '@/components/AuthGuard'

interface NewsPost {
  id: string
  title: string
  content: string
  summary?: string
  thumbnail_image?: string
  category: 'news' | 'event' | 'achievement'
  author_id?: string
  view_count: number
  is_featured: boolean
  is_published: boolean
  published_at: string
  created_at: string
  updated_at: string
  author?: {
    name?: string
    nickname?: string
    email: string
  }
}

export default function NewsManagementPage() {
  const router = useRouter()
  const { can } = usePermission()
  const supabase = createClient()
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<NewsPost | null>(null)
  const [currentTab, setCurrentTab] = useState(0)
  const [editingPost, setEditingPost] = useState<Partial<NewsPost>>({
    title: '',
    content: '',
    summary: '',
    thumbnail_image: '',
    category: 'news',
    is_featured: false,
    is_published: true,
  })

  useEffect(() => {
    fetchNewsPosts()
  }, [])

  const fetchNewsPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('news_posts')
        .select(`
          *,
          author:profiles!author_id (
            name,
            nickname,
            email
          )
        `)
        .order('published_at', { ascending: false })

      if (error) throw error
      setNewsPosts(data || [])
    } catch (error) {
      console.error('뉴스 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingPost({
      title: '',
      content: '',
      summary: '',
      thumbnail_image: '',
      category: 'news',
      is_featured: false,
      is_published: true,
    })
    setSelectedPost(null)
    setDialogOpen(true)
  }

  const handleEdit = (post: NewsPost) => {
    setEditingPost(post)
    setSelectedPost(post)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedPost) return

    try {
      const { error } = await supabase
        .from('news_posts')
        .delete()
        .eq('id', selectedPost.id)

      if (error) throw error
      await fetchNewsPosts()
      setDeleteDialogOpen(false)
      setSelectedPost(null)
    } catch (error) {
      console.error('뉴스 삭제 실패:', error)
    }
  }

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (selectedPost) {
        // 수정
        const { error } = await supabase
          .from('news_posts')
          .update({
            ...editingPost,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedPost.id)

        if (error) throw error
      } else {
        // 추가
        const { error } = await supabase
          .from('news_posts')
          .insert([{
            ...editingPost,
            author_id: user?.id,
            published_at: new Date().toISOString()
          }])

        if (error) throw error
      }

      await fetchNewsPosts()
      setDialogOpen(false)
      setEditingPost({})
      setSelectedPost(null)
    } catch (error) {
      console.error('뉴스 저장 실패:', error)
    }
  }

  const toggleFeatured = async (post: NewsPost) => {
    try {
      const { error } = await supabase
        .from('news_posts')
        .update({ is_featured: !post.is_featured })
        .eq('id', post.id)

      if (error) throw error
      await fetchNewsPosts()
    } catch (error) {
      console.error('특집 상태 변경 실패:', error)
    }
  }

  const togglePublished = async (post: NewsPost) => {
    try {
      const { error } = await supabase
        .from('news_posts')
        .update({ is_published: !post.is_published })
        .eq('id', post.id)

      if (error) throw error
      await fetchNewsPosts()
    } catch (error) {
      console.error('발행 상태 변경 실패:', error)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'news': return <ArticleIcon />
      case 'event': return <EventIcon />
      case 'achievement': return <AchievementIcon />
      default: return <ArticleIcon />
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'news': return '뉴스'
      case 'event': return '이벤트'
      case 'achievement': return '성과'
      default: return category
    }
  }

  const getCategoryColor = (category: string): any => {
    switch (category) {
      case 'news': return 'primary'
      case 'event': return 'secondary'
      case 'achievement': return 'success'
      default: return 'default'
    }
  }

  // 탭별 필터링
  const filteredPosts = currentTab === 0 
    ? newsPosts 
    : currentTab === 1 
    ? newsPosts.filter(p => p.category === 'news')
    : currentTab === 2
    ? newsPosts.filter(p => p.category === 'event')
    : newsPosts.filter(p => p.category === 'achievement')

  return (
    <AuthGuard requiredRole="admin">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* 헤더 */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              뉴스 관리
            </Typography>
            <Typography variant="body2" color="text.secondary">
              연구회 뉴스, 이벤트, 성과를 관리합니다
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
          >
            뉴스 작성
          </Button>
        </Box>

        {/* 탭 네비게이션 */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
            <Tab label={`전체 (${newsPosts.length})`} />
            <Tab label={`뉴스 (${newsPosts.filter(p => p.category === 'news').length})`} />
            <Tab label={`이벤트 (${newsPosts.filter(p => p.category === 'event').length})`} />
            <Tab label={`성과 (${newsPosts.filter(p => p.category === 'achievement').length})`} />
          </Tabs>
        </Paper>

        {/* 뉴스 그리드 */}
        <Grid container spacing={3}>
          {filteredPosts.map((post) => (
            <Grid item xs={12} md={6} lg={4} key={post.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {post.thumbnail_image && (
                  <CardMedia
                    component="img"
                    height="200"
                    image={post.thumbnail_image}
                    alt={post.title}
                    sx={{ objectFit: 'cover' }}
                  />
                )}
                {!post.thumbnail_image && (
                  <Box
                    sx={{
                      height: 200,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'grey.100',
                    }}
                  >
                    <ImageIcon sx={{ fontSize: 60, color: 'grey.400' }} />
                  </Box>
                )}
                
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip
                        icon={getCategoryIcon(post.category)}
                        label={getCategoryLabel(post.category)}
                        color={getCategoryColor(post.category)}
                        size="small"
                      />
                      {post.is_featured && (
                        <Chip
                          icon={<StarIcon />}
                          label="특집"
                          color="warning"
                          size="small"
                        />
                      )}
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => togglePublished(post)}
                      color={post.is_published ? 'primary' : 'default'}
                    >
                      {post.is_published ? <ViewIcon /> : <HideIcon />}
                    </IconButton>
                  </Box>

                  <Typography variant="h6" gutterBottom>
                    {post.title}
                  </Typography>

                  {post.summary && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {post.summary}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                    <Typography variant="caption" color="text.secondary">
                      {post.author?.nickname || post.author?.name || post.author?.email}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      조회 {post.view_count}
                    </Typography>
                  </Box>

                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    {new Date(post.published_at).toLocaleDateString('ko-KR')}
                  </Typography>
                </CardContent>

                <CardActions>
                  <IconButton
                    size="small"
                    onClick={() => toggleFeatured(post)}
                    color={post.is_featured ? 'warning' : 'default'}
                  >
                    {post.is_featured ? <StarIcon /> : <StarBorderIcon />}
                  </IconButton>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleEdit(post)}
                  >
                    수정
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => {
                      setSelectedPost(post)
                      setDeleteDialogOpen(true)
                    }}
                  >
                    삭제
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}

          {filteredPosts.length === 0 && !loading && (
            <Grid item xs={12}>
              <Alert severity="info">
                {currentTab === 0 ? '등록된 뉴스가 없습니다' : `등록된 ${getCategoryLabel(['', 'news', 'event', 'achievement'][currentTab])}가 없습니다`}
              </Alert>
            </Grid>
          )}
        </Grid>

        {/* 뉴스 추가/수정 다이얼로그 */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {selectedPost ? '뉴스 수정' : '뉴스 작성'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="제목"
                fullWidth
                value={editingPost.title || ''}
                onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                required
              />

              <TextField
                label="요약"
                fullWidth
                multiline
                rows={2}
                value={editingPost.summary || ''}
                onChange={(e) => setEditingPost({ ...editingPost, summary: e.target.value })}
                helperText="카드에 표시될 짧은 요약"
              />

              <TextField
                label="내용"
                fullWidth
                multiline
                rows={6}
                value={editingPost.content || ''}
                onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                required
              />

              <TextField
                label="썸네일 이미지 URL"
                fullWidth
                value={editingPost.thumbnail_image || ''}
                onChange={(e) => setEditingPost({ ...editingPost, thumbnail_image: e.target.value })}
                helperText="카드에 표시될 이미지"
              />

              <FormControl fullWidth>
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={editingPost.category || 'news'}
                  onChange={(e) => setEditingPost({ ...editingPost, category: e.target.value as any })}
                  label="카테고리"
                >
                  <MenuItem value="news">뉴스</MenuItem>
                  <MenuItem value="event">이벤트</MenuItem>
                  <MenuItem value="achievement">성과</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={editingPost.is_featured || false}
                    onChange={(e) => setEditingPost({ ...editingPost, is_featured: e.target.checked })}
                  />
                }
                label="특집 기사로 설정"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={editingPost.is_published !== false}
                    onChange={(e) => setEditingPost({ ...editingPost, is_published: e.target.checked })}
                  />
                }
                label="바로 발행"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave} variant="contained">
              {selectedPost ? '수정' : '작성'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 삭제 확인 다이얼로그 */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>뉴스 삭제</DialogTitle>
          <DialogContent>
            <Typography>
              "{selectedPost?.title}" 뉴스를 삭제하시겠습니까?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
            <Button onClick={handleDelete} color="error">
              삭제
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </AuthGuard>
  )
}