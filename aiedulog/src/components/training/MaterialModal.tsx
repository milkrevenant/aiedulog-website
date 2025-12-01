'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  FormControl,
  InputLabel,
  Select,
  Box,
  Chip,
  OutlinedInput,
  SelectChangeEvent
} from '@mui/material'

export interface Material {
  id?: string
  title: string
  subtitle: string
  description: string
  type: 'canva' | 'google_slides' | 'pptx' | 'pdf' | 'video' | 'link'
  embed_code?: string
  file_url?: string
  thumbnail_url?: string
  tags: string[]
  category: 'elementary' | 'middle' | 'high' | 'etc'
  training_date: string
  instructor: string
}

interface MaterialModalProps {
  open: boolean
  onClose: () => void
  onSave: (material: Material) => Promise<void>
  initialData?: Material | null
}



const CATEGORIES = [
  { value: 'elementary', label: '초등' },
  { value: 'middle', label: '중등' },
  { value: 'high', label: '고등' },
  { value: 'etc', label: '기타' },
]

export default function MaterialModal({ open, onClose, onSave, initialData }: MaterialModalProps) {
  const [formData, setFormData] = useState<Material>({
    title: '',
    subtitle: '',
    description: '',
    type: 'canva',
    file_url: '',
    tags: [],
    category: 'etc',
    training_date: new Date().toISOString().split('T')[0],
    instructor: ''
  })
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    } else {
      setFormData({
        title: '',
        subtitle: '',
        description: '',
        type: 'canva',
        file_url: '',
        tags: [],
        category: 'etc',
        training_date: new Date().toISOString().split('T')[0],
        instructor: ''
      })
    }
  }, [initialData, open])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      const newData = { ...prev, [name]: value }
      
      // Auto-detect type from URL
      if (name === 'file_url') {
        if (value.includes('canva.com')) newData.type = 'canva'
        else if (value.includes('docs.google.com/presentation')) newData.type = 'google_slides'
        else if (value.endsWith('.pdf')) newData.type = 'pdf'
        else if (value.endsWith('.pptx')) newData.type = 'pptx'
        else if (value.includes('youtube.com') || value.includes('youtu.be') || value.includes('vimeo.com')) newData.type = 'video'
        else newData.type = 'link'
      }
      
      return newData
    })
  }

  const handleSelectChange = (e: SelectChangeEvent) => {
    setFormData(prev => ({ ...prev, type: e.target.value as any }))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      if (!formData.tags.includes(tagInput.trim())) {
        setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }))
      }
      setTagInput('')
    }
  }

  const handleDeleteTag = (tagToDelete: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToDelete) }))
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Failed to save material:', error)
      alert('Failed to save material. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{initialData ? 'Edit Material' : 'Add New Material'}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            fullWidth
            required
          />
          <TextField
            label="Subtitle"
            name="subtitle"
            value={formData.subtitle}
            onChange={handleChange}
            fullWidth
          />


          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category}
              label="Category"
              name="category"
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
            >
              {CATEGORIES.map(cat => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            label="File URL / Link"
            name="file_url"
            value={formData.file_url || ''}
            onChange={handleChange}
            fullWidth
            helperText="For Canva, paste the view link (e.g., https://www.canva.com/.../view)"
          />

          <TextField
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            multiline
            rows={4}
            fullWidth
          />

          <Stack direction="row" spacing={2}>
            <TextField
              label="Instructor"
              name="instructor"
              value={formData.instructor}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              label="Date"
              name="training_date"
              type="date"
              value={formData.training_date}
              onChange={handleChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>

          <Box>
            <TextField
              label="Tags (Press Enter to add)"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              fullWidth
              placeholder="AI, EdTech, etc."
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
              {formData.tags.map(tag => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleDeleteTag(tag)}
                  sx={{ mt: 1 }}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading || !formData.title}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
