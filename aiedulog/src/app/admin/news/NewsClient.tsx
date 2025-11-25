'use client'

/**
 * News Management - Client Component
 * MIGRATION: Extracted from Server Component (2025-10-14)
 * Handles all interactivity and CRUD operations via API routes
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Alert,
  Snackbar,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material'

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

interface NewsClientProps {
  initialNewsPosts: NewsPost[]
}

export function NewsClient({ initialNewsPosts }: NewsClientProps) {
  const router = useRouter()
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>(initialNewsPosts)
  const [currentTab, setCurrentTab] = useState<string>('all')
  const [openDialog, setOpenDialog] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [selectedNewsPost, setSelectedNewsPost] = useState<NewsPost | null>(null)
  const [editingNewsPost, setEditingNewsPost] = useState<Partial<NewsPost>>({
    title: '',
    content: '',
    summary: '',
    category: 'news',
    is_featured: false,
    is_published: false,
  })
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  })

  // Refresh news posts from server
  const refreshNewsPosts = async () => {
    try {
      router.refresh()
      // Optionally fetch from API if needed
      const res = await fetch('/api/admin/news')
      if (res.ok) {
        const data = await res.json()
        setNewsPosts(data)
      }
    } catch (error) {
      console.error('Error refreshing news posts:', error)
    }
  }

  const handleOpenDialog = (newsPost?: NewsPost) => {
    if (newsPost) {
      setSelectedNewsPost(newsPost)
      setEditingNewsPost({
        title: newsPost.title,
        content: newsPost.content,
        summary: newsPost.summary,
        category: newsPost.category,
        is_featured: newsPost.is_featured,
        is_published: newsPost.is_published,
      })
    } else {
      setSelectedNewsPost(null)
      setEditingNewsPost({
        title: '',
        content: '',
        summary: '',
        category: 'news',
        is_featured: false,
        is_published: false,
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setSelectedNewsPost(null)
    setEditingNewsPost({
      title: '',
      content: '',
      summary: '',
      category: 'news',
      is_featured: false,
      is_published: false,
    })
  }

  const handleSave = async () => {
    try {
      if (selectedNewsPost) {
        // Update existing news post
        const res = await fetch(`/api/admin/news/${selectedNewsPost.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingNewsPost),
        })

        if (!res.ok) throw new Error('Failed to update news post')

        setSnackbar({
          open: true,
          message: 'News post updated successfully',
          severity: 'success',
        })
      } else {
        // Create new news post
        const res = await fetch('/api/admin/news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingNewsPost),
        })

        if (!res.ok) throw new Error('Failed to create news post')

        setSnackbar({
          open: true,
          message: 'News post created successfully',
          severity: 'success',
        })
      }

      handleCloseDialog()
      refreshNewsPosts()
    } catch (error) {
      console.error('Error saving news post:', error)
      setSnackbar({
        open: true,
        message: 'Failed to save news post',
        severity: 'error',
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedNewsPost) return

    try {
      const res = await fetch(`/api/admin/news/${selectedNewsPost.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete news post')

      setSnackbar({
        open: true,
        message: 'News post deleted successfully',
        severity: 'success',
      })

      setOpenDeleteDialog(false)
      setSelectedNewsPost(null)
      refreshNewsPosts()
    } catch (error) {
      console.error('Error deleting news post:', error)
      setSnackbar({
        open: true,
        message: 'Failed to delete news post',
        severity: 'error',
      })
    }
  }

  const handleToggleFeatured = async (newsPost: NewsPost) => {
    try {
      const res = await fetch(`/api/admin/news/${newsPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newsPost,
          is_featured: !newsPost.is_featured,
        }),
      })

      if (!res.ok) throw new Error('Failed to toggle featured status')

      setSnackbar({
        open: true,
        message: `News post ${!newsPost.is_featured ? 'featured' : 'unfeatured'} successfully`,
        severity: 'success',
      })

      refreshNewsPosts()
    } catch (error) {
      console.error('Error toggling featured status:', error)
      setSnackbar({
        open: true,
        message: 'Failed to toggle featured status',
        severity: 'error',
      })
    }
  }

  const handleTogglePublished = async (newsPost: NewsPost) => {
    try {
      const res = await fetch(`/api/admin/news/${newsPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newsPost,
          is_published: !newsPost.is_published,
        }),
      })

      if (!res.ok) throw new Error('Failed to toggle published status')

      setSnackbar({
        open: true,
        message: `News post ${!newsPost.is_published ? 'published' : 'unpublished'} successfully`,
        severity: 'success',
      })

      refreshNewsPosts()
    } catch (error) {
      console.error('Error toggling published status:', error)
      setSnackbar({
        open: true,
        message: 'Failed to toggle published status',
        severity: 'error',
      })
    }
  }

  const filteredNewsPosts = newsPosts.filter((newsPost) => {
    if (currentTab === 'all') return true
    return newsPost.category === currentTab
  })

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">News Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add News Post
        </Button>
      </Box>

      <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="All" value="all" />
        <Tab label="News" value="news" />
        <Tab label="Events" value="event" />
        <Tab label="Achievements" value="achievement" />
      </Tabs>

      <Box sx={{ display: 'grid', gap: 2 }}>
        {filteredNewsPosts.map((newsPost) => (
          <Card key={newsPost.id}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                    <Typography variant="h6">{newsPost.title}</Typography>
                    <Chip
                      label={newsPost.category}
                      size="small"
                      color={
                        newsPost.category === 'news'
                          ? 'primary'
                          : newsPost.category === 'event'
                            ? 'secondary'
                            : 'success'
                      }
                    />
                    {newsPost.is_featured && (
                      <Chip label="Featured" size="small" color="warning" />
                    )}
                    {newsPost.is_published ? (
                      <Chip label="Published" size="small" color="success" />
                    ) : (
                      <Chip label="Draft" size="small" color="default" />
                    )}
                  </Box>
                  {newsPost.summary && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {newsPost.summary}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    By {newsPost.author?.name || newsPost.author?.nickname || newsPost.author?.email || 'Unknown'} •{' '}
                    {new Date(newsPost.published_at).toLocaleDateString()} • {newsPost.view_count} views
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => handleToggleFeatured(newsPost)}
                    color={newsPost.is_featured ? 'warning' : 'default'}
                  >
                    <ViewIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(newsPost)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedNewsPost(newsPost)
                      setOpenDeleteDialog(true)
                    }}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedNewsPost ? 'Edit News Post' : 'Create News Post'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Title"
              value={editingNewsPost.title || ''}
              onChange={(e) =>
                setEditingNewsPost({ ...editingNewsPost, title: e.target.value })
              }
              fullWidth
              required
            />
            <TextField
              label="Summary"
              value={editingNewsPost.summary || ''}
              onChange={(e) =>
                setEditingNewsPost({ ...editingNewsPost, summary: e.target.value })
              }
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Content"
              value={editingNewsPost.content || ''}
              onChange={(e) =>
                setEditingNewsPost({ ...editingNewsPost, content: e.target.value })
              }
              fullWidth
              multiline
              rows={8}
              required
            />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={editingNewsPost.category || 'news'}
                onChange={(e) =>
                  setEditingNewsPost({
                    ...editingNewsPost,
                    category: e.target.value as 'news' | 'event' | 'achievement',
                  })
                }
                label="Category"
              >
                <MenuItem value="news">News</MenuItem>
                <MenuItem value="event">Event</MenuItem>
                <MenuItem value="achievement">Achievement</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={editingNewsPost.is_featured || false}
                  onChange={(e) =>
                    setEditingNewsPost({
                      ...editingNewsPost,
                      is_featured: e.target.checked,
                    })
                  }
                />
              }
              label="Featured"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editingNewsPost.is_published || false}
                  onChange={(e) =>
                    setEditingNewsPost({
                      ...editingNewsPost,
                      is_published: e.target.checked,
                    })
                  }
                />
              }
              label="Published"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!editingNewsPost.title || !editingNewsPost.content}
          >
            {selectedNewsPost ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this news post? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
