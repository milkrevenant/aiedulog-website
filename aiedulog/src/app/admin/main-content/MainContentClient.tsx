'use client'
/**
 * Main Content Management - Client Component
 * MIGRATION: Updated to Client Component with API routes (2025-10-14)
 * 
 * This is a complex content management system with:
 * - Drag-and-drop block editor
 * - Content versioning
 * - Template system
 * - Animation presets
 * - Multi-language support
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useForm, Controller } from 'react-hook-form'
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Stack,
  IconButton,
  TextField,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Drawer,
  AppBar,
  Toolbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Breadcrumbs,
  Link,
  Badge,
  Skeleton,
  Fab,
  SpeedDial,
  SpeedDialIcon,
  SpeedDialAction,
  Snackbar,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import {
  Edit,
  Delete,
  Add,
  Save,
  Cancel,
  DragIndicator,
  Visibility,
  VisibilityOff,
  ArrowUpward,
  ArrowDownward,
  Settings,
  Menu as MenuIcon,
  Article,
  Campaign,
  Newspaper,
  Dashboard,
  ViewModule,
  Preview,
  History,
  Translate,
  Schedule,
  Palette,
  Animation,
  Code,
  Image,
  VideoCall,
  TextFields,
  GridOn,
  BarChart,
  Timeline as TimelineIcon,
  QuestionAnswer,
  Star,
  CloudUpload,
  FileCopy,
  ExpandMore,
  FilterList,
  Search,
  Close,
  Check,
  Warning,
  Info,
  Error,
  Refresh,
  Help,
  SmartToy,
  Assessment,
  Language,
  Autorenew,
} from '@mui/icons-material'

// Types for content management
interface ContentSection {
  id: string
  section_key: string
  title: any
  slug: any
  description: any
  status: 'draft' | 'published' | 'archived' | 'scheduled'
  published_at?: string
  sort_order: number
  is_featured: boolean
  visibility: 'public' | 'members_only' | 'admin_only'
  settings: any
  template: string
  version_number: number
  last_published_version: number
  blocks?: ContentBlock[]
  created_at: string
  updated_at: string
}

interface ContentBlock {
  id: string
  section_id: string
  parent_block_id?: string
  block_type: 'hero' | 'feature_grid' | 'stats' | 'timeline' | 'text_rich' | 'image_gallery' | 'video_embed' | 'cta' | 'testimonial' | 'faq'
  block_key?: string
  content: any
  metadata: any
  layout_config: any
  animation_config: any
  sort_order: number
  is_active: boolean
  visibility: 'public' | 'members_only' | 'admin_only'
  created_at: string
  updated_at: string
}

interface ContentTemplate {
  id: string
  template_key: string
  name: any
  description: any
  template_type: 'section' | 'block' | 'page'
  category: string
  template_data: any
  preview_image_url?: string
  is_public: boolean
  usage_count: number
}

interface MainContentClientProps {
  initialSections: ContentSection[]
  initialTemplates: ContentTemplate[]
}

// Block Type Configurations
const BLOCK_TYPES = {
  hero: { icon: <Campaign />, name: '히어로 섹션', color: '#1976d2' },
  feature_grid: { icon: <GridOn />, name: '특징 그리드', color: '#7c4dff' },
  stats: { icon: <BarChart />, name: '통계 카운터', color: '#00c853' },
  timeline: { icon: <TimelineIcon />, name: '타임라인', color: '#ff6f00' },
  text_rich: { icon: <TextFields />, name: '리치 텍스트', color: '#546e7a' },
  image_gallery: { icon: <Image />, name: '이미지 갤러리', color: '#e91e63' },
  video_embed: { icon: <VideoCall />, name: '비디오 임베드', color: '#f44336' },
  cta: { icon: <Star />, name: '콜투액션', color: '#ff9800' },
  testimonial: { icon: <QuestionAnswer />, name: '고객 후기', color: '#9c27b0' },
  faq: { icon: <Help />, name: 'FAQ', color: '#607d8b' },
}

export function MainContentClient({ initialSections, initialTemplates }: MainContentClientProps) {
  const router = useRouter()
  
  // Main state
  const [tabValue, setTabValue] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sections, setSections] = useState<ContentSection[]>(initialSections)
  const [selectedSection, setSelectedSection] = useState<ContentSection | null>(
    initialSections.length > 0 ? initialSections[0] : null
  )
  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  const [templates, setTemplates] = useState<ContentTemplate[]>(initialTemplates)
  
  // Dialog states
  const [sectionDialog, setSectionDialog] = useState(false)
  const [blockDialog, setBlockDialog] = useState(false)
  const [previewDialog, setPreviewDialog] = useState(false)
  const [historyDialog, setHistoryDialog] = useState(false)
  const [templateDialog, setTemplateDialog] = useState(false)
  
  // Editing states
  const [editingSection, setEditingSection] = useState<ContentSection | null>(null)
  const [editingBlock, setEditingBlock] = useState<ContentBlock | null>(null)
  
  // UI states
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  })
  
  // Form hooks
  const sectionForm = useForm()
  const blockForm = useForm()
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Load blocks when section changes
  useEffect(() => {
    if (selectedSection) {
      loadBlocks(selectedSection.id)
    }
  }, [selectedSection])

  const loadSections = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/main-content?includeBlocks=false')
      const data = await response.json()
      
      if (response.ok) {
        setSections(data.sections || [])
        if (data.sections && data.sections.length > 0 && !selectedSection) {
          setSelectedSection(data.sections[0])
        }
      } else {
        showSnackbar(data.error || 'Failed to load sections', 'error')
      }
    } catch (error) {
      console.error('Error loading sections:', error)
      showSnackbar('Failed to load content sections', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  const loadBlocks = async (sectionId: string) => {
    try {
      const response = await fetch(`/api/admin/main-content/blocks?sectionId=${sectionId}`)
      const data = await response.json()
      
      if (response.ok) {
        setBlocks(data.blocks || [])
      } else {
        showSnackbar(data.error || 'Failed to load blocks', 'error')
      }
    } catch (error) {
      console.error('Error loading blocks:', error)
      showSnackbar('Failed to load content blocks', 'error')
    }
  }

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false })
  }

  // Section management
  const handleCreateSection = () => {
    setEditingSection(null)
    sectionForm.reset({
      section_key: '',
      title: { ko: '', en: '' },
      slug: { ko: '', en: '' },
      description: { ko: '', en: '' },
      status: 'draft',
      visibility: 'public',
      template: 'default',
      sort_order: sections.length,
      is_featured: false,
      settings: {}
    })
    setSectionDialog(true)
  }
  
  const handleEditSection = (section: ContentSection) => {
    setEditingSection(section)
    sectionForm.reset(section)
    setSectionDialog(true)
  }
  
  const handleSaveSection = async (data: any) => {
    setSaving(true)
    try {
      const url = '/api/admin/main-content'
      const method = editingSection ? 'PUT' : 'POST'
      const payload = editingSection 
        ? { type: 'section', id: editingSection.id, data } 
        : { type: 'section', data }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        showSnackbar(
          editingSection ? 'Section updated successfully' : 'Section created successfully',
          'success'
        )
        setSectionDialog(false)
        await loadSections()
        router.refresh()
      } else {
        showSnackbar(result.error || 'Failed to save section', 'error')
      }
    } catch (error) {
      console.error('Error saving section:', error)
      showSnackbar('Failed to save section', 'error')
    } finally {
      setSaving(false)
    }
  }
  
  const handleDeleteSection = async (sectionId: string) => {
    if (!window.confirm('Are you sure you want to delete this section? This will also delete all its content blocks.')) {
      return
    }
    
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/main-content?id=${sectionId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        showSnackbar('Section deleted successfully', 'success')
        if (selectedSection?.id === sectionId) {
          setSelectedSection(null)
          setBlocks([])
        }
        await loadSections()
        router.refresh()
      } else {
        const result = await response.json()
        showSnackbar(result.error || 'Failed to delete section', 'error')
      }
    } catch (error) {
      console.error('Error deleting section:', error)
      showSnackbar('Failed to delete section', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Block management
  const handleCreateBlock = () => {
    if (!selectedSection) {
      showSnackbar('Please select a section first', 'warning')
      return
    }
    
    setEditingBlock(null)
    blockForm.reset({
      section_id: selectedSection.id,
      block_type: 'text_rich',
      content: {},
      metadata: {},
      layout_config: {},
      animation_config: {},
      sort_order: blocks.length,
      is_active: true,
      visibility: 'public'
    })
    setBlockDialog(true)
  }

  const handleEditBlock = (block: ContentBlock) => {
    setEditingBlock(block)
    blockForm.reset(block)
    setBlockDialog(true)
  }

  const handleSaveBlock = async (data: any) => {
    setSaving(true)
    try {
      const url = '/api/admin/main-content/blocks'
      const method = editingBlock ? 'PUT' : 'POST'
      const payload = editingBlock 
        ? { id: editingBlock.id, ...data } 
        : data
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        showSnackbar(
          editingBlock ? 'Block updated successfully' : 'Block created successfully',
          'success'
        )
        setBlockDialog(false)
        if (selectedSection) {
          await loadBlocks(selectedSection.id)
        }
      } else {
        showSnackbar(result.error || 'Failed to save block', 'error')
      }
    } catch (error) {
      console.error('Error saving block:', error)
      showSnackbar('Failed to save block', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBlock = async (blockId: string) => {
    if (!window.confirm('Are you sure you want to delete this block?')) {
      return
    }
    
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/main-content/blocks?id=${blockId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        showSnackbar('Block deleted successfully', 'success')
        if (selectedSection) {
          await loadBlocks(selectedSection.id)
        }
      } else {
        const result = await response.json()
        showSnackbar(result.error || 'Failed to delete block', 'error')
      }
    } catch (error) {
      console.error('Error deleting block:', error)
      showSnackbar('Failed to delete block', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Drag and drop handler
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) {
      return
    }
    
    const oldIndex = blocks.findIndex((b) => b.id === active.id)
    const newIndex = blocks.findIndex((b) => b.id === over.id)
    
    const newBlocks = arrayMove(blocks, oldIndex, newIndex)
    setBlocks(newBlocks)
    
    // Update sort order on server
    try {
      await fetch('/api/admin/main-content/blocks/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: active.id,
          newPosition: newIndex
        })
      })
    } catch (error) {
      console.error('Error reordering blocks:', error)
      showSnackbar('Failed to reorder blocks', 'error')
      // Revert on error
      if (selectedSection) {
        loadBlocks(selectedSection.id)
      }
    }
  }

  // Filtered sections
  const filteredSections = sections.filter((section) => {
    const matchesSearch = !searchTerm || 
      section.title?.ko?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.title?.en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.section_key.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || section.status === filterStatus
    
    return matchesSearch && matchesStatus
  })

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            메인 콘텐츠 관리
          </Typography>
          <Typography variant="body2" color="text.secondary">
            웹사이트 메인 페이지의 콘텐츠 섹션과 블록을 관리합니다
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<Preview />} onClick={() => setPreviewDialog(true)}>
            미리보기
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={handleCreateSection}>
            섹션 추가
          </Button>
        </Stack>
      </Box>

      {/* Search and Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth
              placeholder="섹션 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>상태</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="상태"
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="draft">초안</MenuItem>
                <MenuItem value="published">발행됨</MenuItem>
                <MenuItem value="scheduled">예약됨</MenuItem>
                <MenuItem value="archived">보관됨</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 12, md: 5 }}>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Chip
                label={`전체 ${sections.length}개`}
                color="default"
                size="small"
              />
              <Chip
                label={`발행 ${sections.filter(s => s.status === 'published').length}개`}
                color="success"
                size="small"
              />
              <Chip
                label={`초안 ${sections.filter(s => s.status === 'draft').length}개`}
                color="warning"
                size="small"
              />
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Sections List */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, height: '70vh', overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              섹션 목록
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List>
              {filteredSections.map((section) => (
                <ListItem
                  key={section.id}
                  onClick={() => setSelectedSection(section)}
                  sx={{
                    mb: 1,
                    borderRadius: 1,
                    cursor: 'pointer',
                    bgcolor: selectedSection?.id === section.id ? 'action.selected' : 'transparent'
                  }}
                >
                  <ListItemText
                    primary={section.title?.ko || section.section_key}
                    secondary={
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Chip
                          label={section.status}
                          size="small"
                          color={section.status === 'published' ? 'success' : 'default'}
                        />
                        {section.is_featured && (
                          <Chip label="Featured" size="small" color="primary" />
                        )}
                      </Stack>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton size="small" onClick={() => handleEditSection(section)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteSection(section.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Blocks Editor */}
        <Grid size={{ xs: 12, md: 8 }}>
          {selectedSection ? (
            <Paper sx={{ p: 3, height: '70vh', overflow: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h6">
                    {selectedSection.title?.ko || selectedSection.section_key}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {blocks.length}개의 콘텐츠 블록
                  </Typography>
                </Box>
                <Button variant="contained" startIcon={<Add />} onClick={handleCreateBlock}>
                  블록 추가
                </Button>
              </Box>
              <Divider sx={{ mb: 3 }} />
              
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  <Stack spacing={2}>
                    {blocks.map((block) => (
                      <Card key={block.id} variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <DragIndicator sx={{ cursor: 'grab', color: 'text.secondary' }} />
                            <Box sx={{ flex: 1 }}>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <Chip
                                  icon={BLOCK_TYPES[block.block_type]?.icon}
                                  label={BLOCK_TYPES[block.block_type]?.name || block.block_type}
                                  size="small"
                                  sx={{ bgcolor: BLOCK_TYPES[block.block_type]?.color + '20' }}
                                />
                                {!block.is_active && (
                                  <Chip label="비활성" size="small" color="default" />
                                )}
                              </Stack>
                              <Typography variant="body2" color="text.secondary">
                                {block.block_key || `Block ${block.sort_order + 1}`}
                              </Typography>
                            </Box>
                            <Stack direction="row" spacing={1}>
                              <IconButton size="small" onClick={() => handleEditBlock(block)}>
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleDeleteBlock(block.id)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                    {blocks.length === 0 && (
                      <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography variant="body2" color="text.secondary">
                          이 섹션에는 아직 블록이 없습니다.
                        </Typography>
                        <Button
                          variant="outlined"
                          startIcon={<Add />}
                          onClick={handleCreateBlock}
                          sx={{ mt: 2 }}
                        >
                          첫 번째 블록 추가
                        </Button>
                      </Box>
                    )}
                  </Stack>
                </SortableContext>
              </DndContext>
            </Paper>
          ) : (
            <Paper sx={{ p: 8, height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ textAlign: 'center' }}>
                <ViewModule sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  섹션을 선택하세요
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  왼쪽 목록에서 섹션을 선택하여 콘텐츠 블록을 편집하세요
                </Typography>
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Section Dialog - Simplified */}
      <Dialog open={sectionDialog} onClose={() => setSectionDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingSection ? '섹션 수정' : '섹션 추가'}</DialogTitle>
        <form onSubmit={sectionForm.handleSubmit(handleSaveSection)}>
          <DialogContent>
            <Stack spacing={3}>
              <TextField
                label="섹션 키"
                fullWidth
                {...sectionForm.register('section_key')}
                required
              />
              <TextField
                label="제목 (한국어)"
                fullWidth
                {...sectionForm.register('title.ko')}
                required
              />
              <TextField
                label="제목 (영어)"
                fullWidth
                {...sectionForm.register('title.en')}
              />
              <TextField
                label="설명"
                fullWidth
                multiline
                rows={3}
                {...sectionForm.register('description.ko')}
              />
              <Grid container spacing={2}>
                <Grid size={6}>
                  <FormControl fullWidth>
                    <InputLabel>상태</InputLabel>
                    <Select
                      {...sectionForm.register('status')}
                      label="상태"
                      defaultValue="draft"
                    >
                      <MenuItem value="draft">초안</MenuItem>
                      <MenuItem value="published">발행</MenuItem>
                      <MenuItem value="scheduled">예약</MenuItem>
                      <MenuItem value="archived">보관</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={6}>
                  <FormControl fullWidth>
                    <InputLabel>공개 범위</InputLabel>
                    <Select
                      {...sectionForm.register('visibility')}
                      label="공개 범위"
                      defaultValue="public"
                    >
                      <MenuItem value="public">전체 공개</MenuItem>
                      <MenuItem value="members_only">회원 전용</MenuItem>
                      <MenuItem value="admin_only">관리자 전용</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              <Controller
                name="is_featured"
                control={sectionForm.control}
                defaultValue={false}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch {...field} checked={field.value} />}
                    label="추천 섹션으로 표시"
                  />
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSectionDialog(false)}>취소</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? <CircularProgress size={20} /> : (editingSection ? '수정' : '추가')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Block Dialog - Simplified */}
      <Dialog open={blockDialog} onClose={() => setBlockDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingBlock ? '블록 수정' : '블록 추가'}</DialogTitle>
        <form onSubmit={blockForm.handleSubmit(handleSaveBlock)}>
          <DialogContent>
            <Stack spacing={3}>
              <FormControl fullWidth>
                <InputLabel>블록 타입</InputLabel>
                <Select
                  {...blockForm.register('block_type')}
                  label="블록 타입"
                  defaultValue="text_rich"
                >
                  {Object.entries(BLOCK_TYPES).map(([key, value]) => (
                    <MenuItem key={key} value={key}>
                      {value.icon} {value.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="블록 키 (선택사항)"
                fullWidth
                {...blockForm.register('block_key')}
              />
              <Alert severity="info">
                블록 콘텐츠는 블록 타입에 따라 다른 편집기로 관리됩니다. 
                저장 후 상세 편집을 진행하세요.
              </Alert>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <FormControl fullWidth>
                    <InputLabel>공개 범위</InputLabel>
                    <Select
                      {...blockForm.register('visibility')}
                      label="공개 범위"
                      defaultValue="public"
                    >
                      <MenuItem value="public">전체 공개</MenuItem>
                      <MenuItem value="members_only">회원 전용</MenuItem>
                      <MenuItem value="admin_only">관리자 전용</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={6}>
                  <Controller
                    name="is_active"
                    control={blockForm.control}
                    defaultValue={true}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="블록 활성화"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBlockDialog(false)}>취소</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? <CircularProgress size={20} /> : (editingBlock ? '수정' : '추가')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialog} onClose={() => setPreviewDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>콘텐츠 미리보기</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            실제 페이지에서 보여질 모습을 미리 확인할 수 있습니다.
          </Alert>
          <Box sx={{ minHeight: 400, bgcolor: 'background.default', p: 3, borderRadius: 1 }}>
            {selectedSection && (
              <Typography variant="h5" gutterBottom>
                {selectedSection.title?.ko}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              미리보기 기능은 추후 구현 예정입니다.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  )
}
