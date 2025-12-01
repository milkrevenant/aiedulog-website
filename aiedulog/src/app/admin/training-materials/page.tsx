'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Stack,
  Alert,
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  ArrowBack,
  OpenInNew,
} from '@mui/icons-material'
import AppHeader from '@/components/AppHeader'
import AuthGuard from '@/components/AuthGuard'

interface TrainingMaterial {
  id: string
  title: string
  subtitle: string | null
  description: string | null
  type: string
  file_url: string | null
  embed_code: string | null
  tags: string[] | null
  category: string
  training_date: string
  instructor: string | null
  created_at: string
}

const CATEGORIES = [
  { value: 'elementary', label: '초등' },
  { value: 'middle', label: '중등' },
  { value: 'high', label: '고등' },
  { value: 'etc', label: '기타' },
]

const TYPES = [
  { value: 'canva', label: 'Canva' },
  { value: 'google_slides', label: 'Google Slides' },
  { value: 'pptx', label: 'PowerPoint' },
  { value: 'pdf', label: 'PDF' },
  { value: 'video', label: '동영상' },
  { value: 'link', label: '링크' },
]

export default function AdminTrainingMaterialsPage() {
  const router = useRouter()
  const [materials, setMaterials] = useState<TrainingMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<TrainingMaterial | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    type: 'canva',
    file_url: '',
    embed_code: '',
    tags: '',
    category: 'etc',
    training_date: new Date().toISOString().split('T')[0],
    instructor: '',
  })

  useEffect(() => {
    fetchMaterials()
  }, [])

  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/training-materials')
      if (response.ok) {
        const data = await response.json()
        setMaterials(data)
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error)
      setError('자료 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (material?: TrainingMaterial) => {
    if (material) {
      setEditingMaterial(material)
      setFormData({
        title: material.title,
        subtitle: material.subtitle || '',
        description: material.description || '',
        type: material.type,
        file_url: material.file_url || '',
        embed_code: material.embed_code || '',
        tags: material.tags?.join(', ') || '',
        category: material.category,
        training_date: material.training_date,
        instructor: material.instructor || '',
      })
    } else {
      setEditingMaterial(null)
      setFormData({
        title: '',
        subtitle: '',
        description: '',
        type: 'canva',
        file_url: '',
        embed_code: '',
        tags: '',
        category: 'etc',
        training_date: new Date().toISOString().split('T')[0],
        instructor: '',
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingMaterial(null)
    setError(null)
  }

  const handleSave = async () => {
    try {
      const method = editingMaterial ? 'PUT' : 'POST'
      const tagsArray = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t)

      const body = {
        ...(editingMaterial ? { id: editingMaterial.id } : {}),
        title: formData.title,
        subtitle: formData.subtitle || null,
        description: formData.description || null,
        type: formData.type,
        file_url: formData.file_url || null,
        embed_code: formData.embed_code || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        category: formData.category,
        training_date: formData.training_date,
        instructor: formData.instructor || null,
      }

      const response = await fetch('/api/training-materials', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to save')

      await fetchMaterials()
      handleCloseDialog()
    } catch (error) {
      console.error('Save error:', error)
      setError('저장에 실패했습니다.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/training-materials?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      await fetchMaterials()
    } catch (error) {
      console.error('Delete error:', error)
      setError('삭제에 실패했습니다.')
    }
  }

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.label || category
  }

  const getTypeLabel = (type: string) => {
    return TYPES.find(t => t.value === type)?.label || type
  }

  return (
    <AuthGuard requireAuth requireModerator>
      <AppHeader />
      <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <IconButton onClick={() => router.push('/admin')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            연수자료 관리
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6">연수자료 목록</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
            >
              새 자료 추가
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>제목</TableCell>
                  <TableCell width={100}>카테고리</TableCell>
                  <TableCell width={100}>유형</TableCell>
                  <TableCell width={120}>연수일</TableCell>
                  <TableCell width={100}>강사</TableCell>
                  <TableCell width={150}>태그</TableCell>
                  <TableCell width={120} align="center">관리</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {materials.map((material) => (
                  <TableRow key={material.id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{material.title}</Typography>
                      {material.subtitle && (
                        <Typography variant="caption" color="text.secondary">
                          {material.subtitle}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={getCategoryLabel(material.category)} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={getTypeLabel(material.type)} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{material.training_date}</TableCell>
                    <TableCell>{material.instructor || '-'}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                        {material.tags?.slice(0, 2).map((tag, idx) => (
                          <Chip key={idx} label={tag} size="small" sx={{ fontSize: '0.7rem' }} />
                        ))}
                        {(material.tags?.length || 0) > 2 && (
                          <Chip label={`+${material.tags!.length - 2}`} size="small" sx={{ fontSize: '0.7rem' }} />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="center">
                      {material.file_url && (
                        <IconButton size="small" href={material.file_url} target="_blank">
                          <OpenInNew fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton size="small" onClick={() => handleOpenDialog(material)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(material.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {materials.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">등록된 연수자료가 없습니다.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingMaterial ? '연수자료 수정' : '새 연수자료 추가'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label="제목"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                fullWidth
                required
              />

              <TextField
                label="부제목"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                fullWidth
              />

              <TextField
                label="설명"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />

              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>카테고리</InputLabel>
                  <Select
                    value={formData.category}
                    label="카테고리"
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {CATEGORIES.map((cat) => (
                      <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>자료 유형</InputLabel>
                  <Select
                    value={formData.type}
                    label="자료 유형"
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    {TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction="row" spacing={2}>
                <TextField
                  label="연수일"
                  type="date"
                  value={formData.training_date}
                  onChange={(e) => setFormData({ ...formData, training_date: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  label="강사"
                  value={formData.instructor}
                  onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                  fullWidth
                />
              </Stack>

              <TextField
                label="자료 URL"
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                fullWidth
                helperText="Canva, Google Slides, PDF 등의 URL"
              />

              <TextField
                label="임베드 코드 (선택)"
                value={formData.embed_code}
                onChange={(e) => setFormData({ ...formData, embed_code: e.target.value })}
                fullWidth
                multiline
                rows={3}
                helperText="Canva 임베드 코드를 직접 입력할 수 있습니다"
              />

              <TextField
                label="태그"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                fullWidth
                helperText="쉼표로 구분 (예: AI, EdTech, Training)"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>취소</Button>
            <Button variant="contained" onClick={handleSave}>
              {editingMaterial ? '수정' : '추가'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </AuthGuard>
  )
}
