'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  CircularProgress,
  Avatar,
  Card,
  CardContent,
  GridLegacy as Grid,
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon,
  PushPin as PinIcon,
  PushPinOutlined as UnpinIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Article as ArticleIcon,
  Comment as CommentIcon,
  ThumbUp as LikeIcon,
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { createClient } from '@/lib/supabase/client'

// Board category configuration
const BOARD_CATEGORIES = {
  lectures: { label: '강의', icon: '📚', color: 'primary' },
  announcements: { label: '공지사항', icon: '📢', color: 'error' },
  news: { label: '뉴스', icon: '📰', color: 'info' },
  'regular-meetings': { label: '정기모임', icon: '👥', color: 'success' },
  'training-programs': { label: '연수프로그램', icon: '🎓', color: 'warning' },
} as const

type BoardCategory = keyof typeof BOARD_CATEGORIES

interface Post {
  id: string
  title: string
  content: string
  excerpt?: string
  category: string
  board_type: BoardCategory
  author_id: string
  author_name?: string
  author_email?: string
  status: 'draft' | 'published' | 'archived'
  is_pinned: boolean
  is_featured: boolean
  view_count: number
  like_count: number
  comment_count: number
  tags?: string[]
  created_at: string
  updated_at: string
  published_at?: string
  featured_image?: string
  author_profile?: {
    nickname?: string
    full_name?: string
    avatar_url?: string
  }
}

interface PostManagementSystemProps {
  boardType: BoardCategory
}

export default function PostManagementSystem({ boardType }: PostManagementSystemProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all')
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tabValue, setTabValue] = useState(0)
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    archived: 0,
    pinned: 0,
  })

  const [editFormData, setEditFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: '',
    status: 'published' as Post['status'],
    is_pinned: false,
    is_featured: false,
    tags: [] as string[],
    featured_image: '',
  })

  const supabase = createClient()
  const boardConfig = BOARD_CATEGORIES[boardType]

  useEffect(() => {
    fetchPosts()
  }, [boardType, statusFilter])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          author_profile:user_profiles!posts_author_id_fkey (
            nickname,
            full_name,
            avatar_url
          )
        `)
        .eq('board_type', boardType)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error

      const processedPosts = data?.map(post => ({
        ...post,
        author_name: post.author_profile?.nickname || post.author_profile?.full_name || post.author_email,
      })) || []

      setPosts(processedPosts)
      updateStats(processedPosts)
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateStats = (posts: Post[]) => {
    setStats({
      total: posts.length,
      published: posts.filter(p => p.status === 'published').length,
      draft: posts.filter(p => p.status === 'draft').length,
      archived: posts.filter(p => p.status === 'archived').length,
      pinned: posts.filter(p => p.is_pinned).length,
    })
  }

  const handleEdit = (post: Post) => {
    setSelectedPost(post)
    setEditFormData({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt || '',
      category: post.category,
      status: post.status,
      is_pinned: post.is_pinned,
      is_featured: post.is_featured,
      tags: post.tags || [],
      featured_image: post.featured_image || '',
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedPost) return

    try {
      const { error } = await supabase
        .from('posts')
        .update({
          ...editFormData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedPost.id)

      if (error) throw error

      setEditDialogOpen(false)
      fetchPosts()
      alert('게시글이 성공적으로 수정되었습니다.')
    } catch (error) {
      console.error('Error updating post:', error)
      alert('게시글 수정 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async () => {
    if (!selectedPost) return

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', selectedPost.id)

      if (error) throw error

      setDeleteDialogOpen(false)
      fetchPosts()
      alert('게시글이 성공적으로 삭제되었습니다.')
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('게시글 삭제 중 오류가 발생했습니다.')
    }
  }

  const togglePin = async (post: Post) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_pinned: !post.is_pinned })
        .eq('id', post.id)

      if (error) throw error
      fetchPosts()
    } catch (error) {
      console.error('Error toggling pin:', error)
    }
  }

  const toggleStatus = async (post: Post) => {
    const newStatus = post.status === 'published' ? 'archived' : 'published'
    try {
      const { error } = await supabase
        .from('posts')
        .update({ 
          status: newStatus,
          published_at: newStatus === 'published' ? new Date().toISOString() : null
        })
        .eq('id', post.id)

      if (error) throw error
      fetchPosts()
    } catch (error) {
      console.error('Error toggling status:', error)
    }
  }

  const getStatusColor = (status: Post['status']): any => {
    switch (status) {
      case 'published': return 'success'
      case 'draft': return 'warning'
      case 'archived': return 'default'
      default: return 'default'
    }
  }

  const getStatusLabel = (status: Post['status']) => {
    switch (status) {
      case 'published': return '발행됨'
      case 'draft': return '초안'
      case 'archived': return '보관됨'
      default: return status
    }
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = searchTerm === '' || 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (post.author_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesTab = tabValue === 0 || 
      (tabValue === 1 && post.status === 'published') ||
      (tabValue === 2 && post.status === 'draft') ||
      (tabValue === 3 && post.is_pinned)

    return matchesSearch && matchesTab
  })

  const paginatedPosts = filteredPosts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {boardConfig.icon} {boardConfig.label} 관리
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {boardConfig.label} 게시판의 게시글을 관리합니다
            </Typography>
          </Box>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={3}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center">
                  <ArticleIcon color="primary" />
                  <Box>
                    <Typography variant="h6">{stats.total}</Typography>
                    <Typography variant="caption" color="text.secondary">전체 게시글</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={3}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center">
                  <ViewIcon color="success" />
                  <Box>
                    <Typography variant="h6">{stats.published}</Typography>
                    <Typography variant="caption" color="text.secondary">발행됨</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={3}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center">
                  <EditIcon color="warning" />
                  <Box>
                    <Typography variant="h6">{stats.draft}</Typography>
                    <Typography variant="caption" color="text.secondary">초안</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={3}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center">
                  <PinIcon color="error" />
                  <Box>
                    <Typography variant="h6">{stats.pinned}</Typography>
                    <Typography variant="caption" color="text.secondary">고정됨</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters and Search */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Stack spacing={2}>
            <TextField
              placeholder="제목, 내용, 작성자로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
              variant="outlined"
              size="small"
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
              }}
            />

            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
              <Tab label={`전체 (${stats.total})`} />
              <Tab 
                label={
                  <Badge badgeContent={stats.published} color="success">
                    <span>발행됨</span>
                  </Badge>
                } 
              />
              <Tab 
                label={
                  <Badge badgeContent={stats.draft} color="warning">
                    <span>초안</span>
                  </Badge>
                } 
              />
              <Tab 
                label={
                  <Badge badgeContent={stats.pinned} color="error">
                    <span>고정됨</span>
                  </Badge>
                } 
              />
            </Tabs>
          </Stack>
        </Paper>

        {/* Posts Table */}
        <Paper>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>게시글</TableCell>
                      <TableCell>작성자</TableCell>
                      <TableCell align="center">상태</TableCell>
                      <TableCell align="center">통계</TableCell>
                      <TableCell>작성일</TableCell>
                      <TableCell align="center">작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedPosts.map((post) => (
                      <TableRow key={post.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {post.is_pinned && <PinIcon color="primary" fontSize="small" />}
                              <Typography variant="subtitle2" noWrap sx={{ maxWidth: 300 }}>
                                {post.title}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
                              {post.excerpt || post.content.substring(0, 100)}...
                            </Typography>
                            {post.tags && post.tags.length > 0 && (
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {post.tags.slice(0, 3).map((tag, index) => (
                                  <Chip key={index} label={tag} size="small" variant="outlined" />
                                ))}
                                {post.tags.length > 3 && <Chip label={`+${post.tags.length - 3}`} size="small" />}
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar 
                              src={post.author_profile?.avatar_url} 
                              sx={{ width: 24, height: 24 }}
                            >
                              {post.author_name?.[0]?.toUpperCase()}
                            </Avatar>
                            <Typography variant="body2">
                              {post.author_name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Stack spacing={0.5} alignItems="center">
                            <Chip 
                              label={getStatusLabel(post.status)}
                              color={getStatusColor(post.status)}
                              size="small"
                            />
                            {post.is_featured && (
                              <Chip label="추천" color="secondary" size="small" variant="outlined" />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          <Stack spacing={0.5} alignItems="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <ViewIcon fontSize="small" color="disabled" />
                              <Typography variant="caption">{post.view_count}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LikeIcon fontSize="small" color="disabled" />
                              <Typography variant="caption">{post.like_count}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CommentIcon fontSize="small" color="disabled" />
                              <Typography variant="caption">{post.comment_count}</Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {new Date(post.created_at).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="고정 토글">
                              <IconButton size="small" onClick={() => togglePin(post)}>
                                {post.is_pinned ? <PinIcon /> : <UnpinIcon />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="상태 토글">
                              <IconButton size="small" onClick={() => toggleStatus(post)}>
                                {post.status === 'published' ? <HideIcon /> : <ViewIcon />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="수정">
                              <IconButton size="small" onClick={() => handleEdit(post)}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="삭제">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => {
                                  setSelectedPost(post)
                                  setDeleteDialogOpen(true)
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={filteredPosts.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10))
                  setPage(0)
                }}
                labelRowsPerPage="페이지당 행:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 전체 ${count}개`}
              />
            </>
          )}
        </Paper>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>게시글 수정</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="제목"
                fullWidth
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
              />
              
              <TextField
                label="요약"
                fullWidth
                multiline
                rows={2}
                value={editFormData.excerpt}
                onChange={(e) => setEditFormData({ ...editFormData, excerpt: e.target.value })}
              />

              <TextField
                label="내용"
                fullWidth
                multiline
                rows={8}
                value={editFormData.content}
                onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
              />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>상태</InputLabel>
                    <Select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                      label="상태"
                    >
                      <MenuItem value="draft">초안</MenuItem>
                      <MenuItem value="published">발행됨</MenuItem>
                      <MenuItem value="archived">보관됨</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={6}>
                  <TextField
                    label="카테고리"
                    fullWidth
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  />
                </Grid>
              </Grid>

              <Stack direction="row" spacing={2}>
                <label>
                  <input
                    type="checkbox"
                    checked={editFormData.is_pinned}
                    onChange={(e) => setEditFormData({ ...editFormData, is_pinned: e.target.checked })}
                  />
                  고정
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={editFormData.is_featured}
                    onChange={(e) => setEditFormData({ ...editFormData, is_featured: e.target.checked })}
                  />
                  추천
                </label>
              </Stack>

              <TextField
                label="태그 (쉼표로 구분)"
                fullWidth
                value={editFormData.tags.join(', ')}
                onChange={(e) => setEditFormData({ 
                  ...editFormData, 
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                })}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>취소</Button>
            <Button onClick={handleSaveEdit} variant="contained">수정 저장</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>게시글 삭제</DialogTitle>
          <DialogContent>
            <Alert severity="error" sx={{ mb: 2 }}>
              이 작업은 되돌릴 수 없습니다.
            </Alert>
            <Typography>
              "{selectedPost?.title}" 게시글을 삭제하시겠습니까?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              이 게시글과 관련된 모든 댓글도 함께 삭제됩니다.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
            <Button onClick={handleDelete} color="error" variant="contained">삭제</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  )
}