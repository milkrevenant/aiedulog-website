'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
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
import AuthGuard from '@/components/AuthGuard'
import AppHeader from '@/components/AppHeader'
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

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      <AnimatePresence mode="wait">
        {value === index && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            {...other}
          >
            <Box sx={{ py: 3 }}>{children}</Box>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
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

// Animation presets
const ANIMATION_PRESETS = {
  fadeIn: { name: '페이드 인', config: { initial: { opacity: 0 }, animate: { opacity: 1 } } },
  slideUp: { name: '슬라이드 업', config: { initial: { opacity: 0, y: 50 }, animate: { opacity: 1, y: 0 } } },
  slideLeft: { name: '슬라이드 왼쪽', config: { initial: { opacity: 0, x: 50 }, animate: { opacity: 1, x: 0 } } },
  scaleIn: { name: '스케일 인', config: { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 } } },
  rotateIn: { name: '로테이트 인', config: { initial: { opacity: 0, rotate: 10 }, animate: { opacity: 1, rotate: 0 } } },
}

function MainContentManagement() {
  // Main state
  const [tabValue, setTabValue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sections, setSections] = useState<ContentSection[]>([])
  const [selectedSection, setSelectedSection] = useState<ContentSection | null>(null)
  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  const [templates, setTemplates] = useState<ContentTemplate[]>([])
  
  // Dialog states
  const [sectionDialog, setSectionDialog] = useState(false)
  const [blockDialog, setBlockDialog] = useState(false)
  const [previewDialog, setPreviewDialog] = useState(false)
  const [historyDialog, setHistoryDialog] = useState(false)
  const [templateDialog, setTemplateDialog] = useState(false)
  
  // Editing states
  const [editingSection, setEditingSection] = useState<ContentSection | null>(null)
  const [editingBlock, setEditingBlock] = useState<ContentBlock | null>(null)
  const [draggedBlock, setDraggedBlock] = useState<ContentBlock | null>(null)
  
  // UI states
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' })
  
  const supabase = createClient()
  const router = useRouter()
  
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

  // Data loading
  useEffect(() => {
    loadSections()
    loadTemplates()
  }, [])
  
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
  
  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/admin/main-content/templates')
      const data = await response.json()
      
      if (response.ok) {
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }
  
  // Utility functions
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
      const payload = editingSection ? { type: 'section', id: editingSection.id, data } : { type: 'section', data }
      
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
  const handleCreateBlock = (blockType: string) => {
    if (!selectedSection) {
      showSnackbar('Please select a section first', 'warning')
      return
    }
    
    setEditingBlock(null)
    blockForm.reset({
      section_id: selectedSection.id,
      block_type: blockType,
      content: getDefaultBlockContent(blockType),
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
      const payload = editingBlock ? { id: editingBlock.id, ...data } : data
      
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
  
  // Get default content for block types
  const getDefaultBlockContent = (blockType: string): any => {
    const defaults: Record<string, any> = {
      hero: {
        title: { ko: '', en: '' },
        subtitle: { ko: '', en: '' },
        description: { ko: '', en: '' },
        backgroundType: 'gradient',
        ctaButton: { text: { ko: '자세히 보기', en: 'Learn More' }, href: '#' }
      },
      feature_grid: {
        title: { ko: '', en: '' },
        columns: 3,
        items: []
      },
      stats: {
        title: { ko: '', en: '' },
        items: []
      },
      timeline: {
        title: { ko: '', en: '' },
        orientation: 'vertical',
        items: []
      },
      text_rich: {
        content: { ko: '', en: '' }
      },
      image_gallery: {
        title: { ko: '', en: '' },
        layout: 'grid',
        images: []
      },
      video_embed: {
        title: { ko: '', en: '' },
        videoUrl: '',
        thumbnail: ''
      },
      cta: {
        title: { ko: '', en: '' },
        description: { ko: '', en: '' },
        button: { text: { ko: '시작하기', en: 'Get Started' }, href: '#' }
      },
      testimonial: {
        title: { ko: '', en: '' },
        testimonials: []
      },
      faq: {
        title: { ko: '', en: '' },
        items: []
      }
    }
    
    return defaults[blockType] || {}
  }

  // Drag and drop handling
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) {
      return
    }
    
    const oldIndex = blocks.findIndex(block => block.id === active.id)
    const newIndex = blocks.findIndex(block => block.id === over.id)
    
    if (oldIndex === -1 || newIndex === -1) {
      return
    }
    
    const newBlocks = arrayMove(blocks, oldIndex, newIndex)
    
    // Update sort_order for all blocks
    const updatedBlocks = newBlocks.map((block, index) => ({
      ...block,
      sort_order: index
    }))
    
    setBlocks(updatedBlocks)
    
    // Update in backend
    try {
      for (const block of updatedBlocks) {
        await fetch('/api/admin/main-content/blocks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: block.id,
            sort_order: block.sort_order
          })
        })
      }
      showSnackbar('Block order updated successfully', 'success')
    } catch (error) {
      console.error('Error updating block order:', error)
      showSnackbar('Failed to update block order', 'error')
      // Revert on error
      setBlocks(blocks)
    }
  }, [blocks])

  // Filter functions
  const filteredSections = sections.filter(section => {
    const matchesSearch = searchTerm === '' || 
      (section.title.ko && section.title.ko.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (section.title.en && section.title.en.toLowerCase().includes(searchTerm.toLowerCase())) ||
      section.section_key.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || section.status === filterStatus
    
    return matchesSearch && matchesStatus
  })
  
  const filteredBlocks = blocks.filter(block => {
    const matchesType = filterType === 'all' || block.block_type === filterType
    return matchesType
  })
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2, alignSelf: 'center' }}>
          Loading content management system...
        </Typography>
      </Box>
    )
  }

  return (
    <>
      <AppHeader />
      <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ mb: 4 }}>
            <Breadcrumbs sx={{ mb: 2 }}>
              <Link href="/admin" underline="hover" color="inherit">
                <Dashboard sx={{ mr: 0.5 }} fontSize="inherit" />
                Admin
              </Link>
              <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
                <ViewModule sx={{ mr: 0.5 }} fontSize="inherit" />
                Main Content
              </Typography>
            </Breadcrumbs>
            
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Box>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                  메인 콘텐츠 관리 시스템
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Enterprise-grade content management for dynamic sections and blocks
                </Typography>
              </Box>
              
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<History />}
                  onClick={() => setHistoryDialog(true)}
                >
                  Version History
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Preview />}
                  onClick={() => setPreviewDialog(true)}
                  disabled={!selectedSection}
                >
                  Preview
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreateSection}
                  sx={{ 
                    background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                    boxShadow: '0 3px 5px 2px rgba(25, 118, 210, .3)',
                  }}
                >
                  Create Section
                </Button>
              </Stack>
            </Stack>
            
            {/* Quick Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid
                size={{
                  xs: 12,
                  sm: 6,
                  md: 3
                }}>
                <Card sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {sections.length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
                    Total Sections
                  </Typography>
                </Card>
              </Grid>
              <Grid
                size={{
                  xs: 12,
                  sm: 6,
                  md: 3
                }}>
                <Card sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {blocks.length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
                    Active Blocks
                  </Typography>
                </Card>
              </Grid>
              <Grid
                size={{
                  xs: 12,
                  sm: 6,
                  md: 3
                }}>
                <Card sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {sections.filter(s => s.status === 'published').length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
                    Published
                  </Typography>
                </Card>
              </Grid>
              <Grid
                size={{
                  xs: 12,
                  sm: 6,
                  md: 3
                }}>
                <Card sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {templates.length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
                    Templates
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </motion.div>

        {/* Main Content Area */}
        <Paper sx={{ width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              '& .MuiTab-root': {
                minHeight: '72px',
                fontSize: '0.95rem',
                fontWeight: 500,
              },
              '& .Mui-selected': {
                background: 'linear-gradient(45deg, rgba(25, 118, 210, 0.1) 0%, rgba(66, 165, 245, 0.1) 100%)',
              }
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab 
              icon={<Dashboard />} 
              label="Overview" 
              iconPosition="start"
              sx={{ flexDirection: 'row', gap: 1 }}
            />
            <Tab 
              icon={<ViewModule />} 
              label="Sections" 
              iconPosition="start"
              sx={{ flexDirection: 'row', gap: 1 }}
            />
            <Tab 
              icon={<GridOn />} 
              label="Content Blocks" 
              iconPosition="start"
              sx={{ flexDirection: 'row', gap: 1 }}
              disabled={!selectedSection}
            />
            <Tab 
              icon={<Palette />} 
              label="Design & Animation" 
              iconPosition="start"
              sx={{ flexDirection: 'row', gap: 1 }}
              disabled={!selectedSection}
            />
            <Tab 
              icon={<FileCopy />} 
              label="Templates" 
              iconPosition="start"
              sx={{ flexDirection: 'row', gap: 1 }}
              onClick={() => router.push('/admin/templates')}
            />
            <Tab 
              icon={<BarChart />} 
              label="Analytics" 
              iconPosition="start"
              sx={{ flexDirection: 'row', gap: 1 }}
              onClick={() => router.push('/admin/analytics')}
            />
            <Tab 
              icon={<Schedule />} 
              label="Scheduling" 
              iconPosition="start"
              sx={{ flexDirection: 'row', gap: 1 }}
              onClick={() => router.push('/admin/scheduler')}
            />
            <Tab 
              icon={<Translate />} 
              label="Translations" 
              iconPosition="start"
              sx={{ flexDirection: 'row', gap: 1 }}
              onClick={() => router.push('/admin/translations')}
            />
          </Tabs>

          {/* Overview Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Dashboard color="primary" />
                Content Overview
              </Typography>
              
              {/* Section Selection */}
              <Card sx={{ mb: 3, p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Current Section
                </Typography>
                {selectedSection ? (
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                      <Chip 
                        label={selectedSection.status} 
                        color={selectedSection.status === 'published' ? 'success' : selectedSection.status === 'draft' ? 'warning' : 'default'}
                        size="small"
                      />
                      <Chip 
                        label={selectedSection.visibility} 
                        variant="outlined"
                        size="small"
                      />
                      <Typography variant="body2" color="text.secondary">
                        Version {selectedSection.version_number}
                      </Typography>
                    </Stack>
                    <Typography variant="h6">{selectedSection.title.ko}</Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {selectedSection.description?.ko}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Last updated: {new Date(selectedSection.updated_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                ) : (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    No section selected. Create a new section or select one from the sections tab.
                  </Alert>
                )}
              </Card>
              
              {/* Recent Activity */}
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                <List dense>
                  <ListItem>
                    <Chip 
                      icon={<Add />} 
                      label="Content management system initialized" 
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                    />
                  </ListItem>
                  {selectedSection && (
                    <ListItem>
                      <Chip 
                        icon={<Edit />} 
                        label={`Section "${selectedSection.title.ko}" selected - ${blocks.length} blocks`}
                        size="small" 
                        color="success" 
                        variant="outlined" 
                      />
                    </ListItem>
                  )}
                </List>
              </Card>
            </Box>
          </TabPanel>

          {/* Sections Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ViewModule color="primary" />
                  Content Sections
                </Typography>
                
                <Stack direction="row" spacing={2}>
                  <TextField
                    size="small"
                    placeholder="Search sections..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filterStatus}
                      label="Status"
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="draft">Draft</MenuItem>
                      <MenuItem value="published">Published</MenuItem>
                      <MenuItem value="archived">Archived</MenuItem>
                      <MenuItem value="scheduled">Scheduled</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleCreateSection}
                  >
                    Create Section
                  </Button>
                </Stack>
              </Stack>
              
              {/* Sections Grid */}
              <Grid container spacing={3}>
                {filteredSections.map((section) => (
                  <Grid
                    key={section.id}
                    size={{
                      xs: 12,
                      md: 6,
                      lg: 4
                    }}>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Card 
                        sx={{ 
                          height: '100%',
                          cursor: 'pointer',
                          border: selectedSection?.id === section.id ? 2 : 0,
                          borderColor: 'primary.main',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                          }
                        }}
                        onClick={() => setSelectedSection(section)}
                      >
                        <CardContent>
                          <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 2 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="h6" gutterBottom>
                                {section.title.ko || section.section_key}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                {section.description?.ko || 'No description'}
                              </Typography>
                            </Box>
                            {section.is_featured && (
                              <Star sx={{ color: 'warning.main' }} />
                            )}
                          </Stack>
                          
                          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                            <Chip 
                              label={section.status} 
                              size="small"
                              color={section.status === 'published' ? 'success' : section.status === 'draft' ? 'warning' : 'default'}
                            />
                            <Chip 
                              label={section.visibility} 
                              size="small"
                              variant="outlined"
                            />
                            <Chip 
                              label={`v${section.version_number}`} 
                              size="small"
                              color="info"
                              variant="outlined"
                            />
                          </Stack>
                          
                          <Typography variant="caption" color="text.secondary">
                            Updated: {new Date(section.updated_at).toLocaleDateString()}
                          </Typography>
                        </CardContent>
                        
                        <CardActions>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditSection(section)
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteSection(section.id)
                            }}
                            color="error"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                          <Box sx={{ flexGrow: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            {section.blocks?.length || 0} blocks
                          </Typography>
                        </CardActions>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
              
              {filteredSections.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <ViewModule sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No sections found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {searchTerm || filterStatus !== 'all' ? 'Try adjusting your filters' : 'Get started by creating your first content section'}
                  </Typography>
                  {!searchTerm && filterStatus === 'all' && (
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={handleCreateSection}
                    >
                      Create First Section
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          </TabPanel>

          {/* Content Blocks Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ p: 3 }}>
              {selectedSection ? (
                <>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                    <Box>
                      <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <GridOn color="primary" />
                        Content Blocks
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Managing blocks for: {selectedSection.title.ko}
                      </Typography>
                    </Box>
                    
                    <Stack direction="row" spacing={2}>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Block Type</InputLabel>
                        <Select
                          value={filterType}
                          label="Block Type"
                          onChange={(e) => setFilterType(e.target.value)}
                        >
                          <MenuItem value="all">All Types</MenuItem>
                          {Object.entries(BLOCK_TYPES).map(([key, config]) => (
                            <MenuItem key={key} value={key}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                {config.icon}
                                <span>{config.name}</span>
                              </Stack>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>
                  </Stack>
                  
                  {/* Block Creation Palette */}
                  <Card sx={{ mb: 3, p: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                      Add New Block
                    </Typography>
                    <Grid container spacing={2}>
                      {Object.entries(BLOCK_TYPES).map(([key, config]) => (
                        <Grid key={key}>
                          <Button
                            variant="outlined"
                            onClick={() => handleCreateBlock(key)}
                            sx={{
                              color: 'white',
                              borderColor: 'white',
                              minWidth: 120,
                              '&:hover': {
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                borderColor: 'white',
                              }
                            }}
                            startIcon={config.icon}
                          >
                            {config.name}
                          </Button>
                        </Grid>
                      ))}
                    </Grid>
                  </Card>
                  
                  {/* Blocks List with Drag and Drop */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={filteredBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                      <Stack spacing={2}>
                        {filteredBlocks.map((block, index) => (
                          <SortableBlockCard
                            key={block.id}
                            block={block}
                            index={index}
                            onEdit={handleEditBlock}
                            onDelete={handleDeleteBlock}
                          />
                        ))}
                      </Stack>
                    </SortableContext>
                  </DndContext>
                  
                  {filteredBlocks.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <GridOn sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No content blocks yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Start building your section by adding content blocks
                      </Typography>
                    </Box>
                  )}
                </>
              ) : (
                <Alert severity="info" sx={{ mt: 4 }}>
                  Please select a section from the Sections tab to manage its content blocks.
                </Alert>
              )}
            </Box>
          </TabPanel>

          {/* Design & Animation Tab */}
          <TabPanel value={tabValue} index={3}>
            <Box sx={{ p: 3 }}>
              {selectedSection ? (
                <>
                  <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Palette color="primary" />
                    Design & Animation
                  </Typography>
                  
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Advanced design and animation configuration system will be implemented here.
                  </Alert>
                  
                  <Grid container spacing={3}>
                    {/* Animation Settings */}
                    <Grid
                      size={{
                        xs: 12,
                        md: 6
                      }}>
                      <Card sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Animation />
                          Animation Presets
                        </Typography>
                        
                        <Stack spacing={2}>
                          {Object.entries(ANIMATION_PRESETS).map(([key, preset]) => (
                            <Box key={key} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                  <Typography variant="subtitle2">{preset.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {key}
                                  </Typography>
                                </Box>
                                <Button size="small" variant="outlined">
                                  Preview
                                </Button>
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                      </Card>
                    </Grid>
                    
                    {/* Theme Settings */}
                    <Grid
                      size={{
                        xs: 12,
                        md: 6
                      }}>
                      <Card sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Palette />
                          Theme Settings
                        </Typography>
                        
                        <Stack spacing={3}>
                          <FormControl fullWidth>
                            <InputLabel>Template</InputLabel>
                            <Select
                              value={selectedSection.template}
                              label="Template"
                            >
                              <MenuItem value="default">Default</MenuItem>
                              <MenuItem value="modern">Modern</MenuItem>
                              <MenuItem value="classic">Classic</MenuItem>
                              <MenuItem value="minimal">Minimal</MenuItem>
                            </Select>
                          </FormControl>
                          
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>
                              Background Style
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid size={6}>
                                <Card sx={{ p: 2, textAlign: 'center', cursor: 'pointer', background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)' }}>
                                  <Typography variant="body2" sx={{ color: 'white' }}>Gradient</Typography>
                                </Card>
                              </Grid>
                              <Grid size={6}>
                                <Card sx={{ p: 2, textAlign: 'center', cursor: 'pointer', backgroundColor: 'background.paper' }}>
                                  <Typography variant="body2">Solid</Typography>
                                </Card>
                              </Grid>
                            </Grid>
                          </Box>
                        </Stack>
                      </Card>
                    </Grid>
                  </Grid>
                </>
              ) : (
                <Alert severity="info">
                  Please select a section to configure design and animations.
                </Alert>
              )}
            </Box>
          </TabPanel>
          
          {/* Templates Tab - Redirect */}
          <TabPanel value={tabValue} index={4}>
            <Box sx={{ p: 3 }}>
              <Alert severity="info" action={
                <Button 
                  color="primary" 
                  size="small" 
                  onClick={() => router.push('/admin/templates')}
                >
                  Go to Template Library
                </Button>
              }>
                <Typography variant="h6" gutterBottom>Advanced Template Library</Typography>
                Access the enterprise template library with industry templates, AI-powered suggestions, and advanced customization options.
              </Alert>
              
              <Grid container spacing={3} sx={{ mt: 3 }}>
                <Grid
                  size={{
                    xs: 12,
                    md: 4
                  }}>
                  <Card sx={{ textAlign: 'center', p: 3 }}>
                    <FileCopy sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>Enterprise Templates</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Professional templates for education, business, technology, and healthcare industries.
                    </Typography>
                  </Card>
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    md: 4
                  }}>
                  <Card sx={{ textAlign: 'center', p: 3 }}>
                    <Preview sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>Live Preview</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Preview templates with real-time rendering before applying to your content.
                    </Typography>
                  </Card>
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    md: 4
                  }}>
                  <Card sx={{ textAlign: 'center', p: 3 }}>
                    <Star sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>Template Ratings</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Community ratings and usage statistics to help you choose the best templates.
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </TabPanel>
          
          {/* Analytics Tab - Redirect */}
          <TabPanel value={tabValue} index={5}>
            <Box sx={{ p: 3 }}>
              <Alert severity="info" action={
                <Button 
                  color="primary" 
                  size="small" 
                  onClick={() => router.push('/admin/analytics')}
                >
                  Open Analytics Dashboard
                </Button>
              }>
                <Typography variant="h6" gutterBottom>Advanced Content Analytics</Typography>
                Access comprehensive analytics with real-time data, user behavior insights, and performance metrics.
              </Alert>
              
              <Grid container spacing={3} sx={{ mt: 3 }}>
                <Grid
                  size={{
                    xs: 12,
                    md: 3
                  }}>
                  <Card sx={{ p: 3, textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>Real-time</Typography>
                    <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>Live Analytics</Typography>
                  </Card>
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    md: 3
                  }}>
                  <Card sx={{ p: 3, textAlign: 'center', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>A/B Testing</Typography>
                    <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>Content Optimization</Typography>
                  </Card>
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    md: 3
                  }}>
                  <Card sx={{ p: 3, textAlign: 'center', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>Heatmaps</Typography>
                    <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>User Behavior</Typography>
                  </Card>
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    md: 3
                  }}>
                  <Card sx={{ p: 3, textAlign: 'center', background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>Export</Typography>
                    <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>PDF Reports</Typography>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </TabPanel>
          
          {/* Scheduling Tab - Redirect */}
          <TabPanel value={tabValue} index={6}>
            <Box sx={{ p: 3 }}>
              <Alert severity="info" action={
                <Button 
                  color="primary" 
                  size="small" 
                  onClick={() => router.push('/admin/scheduler')}
                >
                  Open Content Scheduler
                </Button>
              }>
                <Typography variant="h6" gutterBottom>Advanced Content Scheduler</Typography>
                Automate content publishing, updates, and lifecycle management with enterprise-grade scheduling features.
              </Alert>
              
              <Grid container spacing={3} sx={{ mt: 3 }}>
                <Grid
                  size={{
                    xs: 12,
                    md: 6
                  }}>
                  <Card sx={{ p: 3 }}>
                    <Schedule sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>Automated Publishing</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Schedule content to be published, unpublished, or archived automatically at specific times.
                    </Typography>
                  </Card>
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    md: 6
                  }}>
                  <Card sx={{ p: 3 }}>
                    <Autorenew sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>Recurring Schedules</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Set up recurring patterns for regular content updates and maintenance tasks.
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </TabPanel>
          
          {/* Translations Tab - Redirect */}
          <TabPanel value={tabValue} index={7}>
            <Box sx={{ p: 3 }}>
              <Alert severity="info" action={
                <Button 
                  color="primary" 
                  size="small" 
                  onClick={() => router.push('/admin/translations')}
                >
                  Open Translation Management
                </Button>
              }>
                <Typography variant="h6" gutterBottom>Enhanced Multilingual System</Typography>
                Professional translation workflow with AI assistance, quality control, and project management.
              </Alert>
              
              <Grid container spacing={3} sx={{ mt: 3 }}>
                <Grid
                  size={{
                    xs: 12,
                    md: 4
                  }}>
                  <Card sx={{ p: 3, textAlign: 'center' }}>
                    <SmartToy sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>AI Translation</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Automated translation with multiple AI engines and quality scoring.
                    </Typography>
                  </Card>
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    md: 4
                  }}>
                  <Card sx={{ p: 3, textAlign: 'center' }}>
                    <Assessment sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>Quality Control</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Professional review workflow with quality metrics and approval process.
                    </Typography>
                  </Card>
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    md: 4
                  }}>
                  <Card sx={{ p: 3, textAlign: 'center' }}>
                    <Language sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>Multi-Language</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Support for multiple languages with RTL layout and cultural adaptation.
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </TabPanel>
        </Paper>
        
        {/* Section Dialog */}
        <SectionDialog
          open={sectionDialog}
          onClose={() => setSectionDialog(false)}
          section={editingSection}
          onSave={handleSaveSection}
          saving={saving}
          form={sectionForm}
        />
        
        {/* Block Dialog */}
        <BlockDialog
          open={blockDialog}
          onClose={() => setBlockDialog(false)}
          block={editingBlock}
          onSave={handleSaveBlock}
          saving={saving}
          form={blockForm}
        />
        
        {/* Preview Dialog */}
        <PreviewDialog
          open={previewDialog}
          onClose={() => setPreviewDialog(false)}
          section={selectedSection}
          blocks={blocks}
        />
        
        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
        
        {/* Floating Action Button for quick actions */}
        <SpeedDial
          ariaLabel="Quick Actions"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          icon={<SpeedDialIcon />}
        >
          <SpeedDialAction
            icon={<Add />}
            tooltipTitle="Create Section"
            onClick={handleCreateSection}
          />
          <SpeedDialAction
            icon={<Preview />}
            tooltipTitle="Preview"
            onClick={() => setPreviewDialog(true)}
          />
          <SpeedDialAction
            icon={<Refresh />}
            tooltipTitle="Refresh Data"
            onClick={loadSections}
          />
        </SpeedDial>
      </Container>
    </>
  );
}

// Sortable Block Card Component
interface SortableBlockCardProps {
  block: ContentBlock
  index: number
  onEdit: (block: ContentBlock) => void
  onDelete: (blockId: string) => void
}

function SortableBlockCard({ block, index, onEdit, onDelete }: SortableBlockCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const blockConfig = BLOCK_TYPES[block.block_type] || { icon: <Article />, name: 'Unknown', color: '#666' }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card sx={{ 
        border: 1, 
        borderColor: 'divider',
        '&:hover': { 
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          borderColor: 'primary.main' 
        }
      }}>
        <CardContent sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              {...listeners}
              sx={{
                cursor: 'grab',
                color: 'text.secondary',
                '&:active': { cursor: 'grabbing' }
              }}
            >
              <DragIndicator />
            </Box>
            
            <Box sx={{ 
              p: 1,
              borderRadius: 1,
              backgroundColor: blockConfig.color + '20',
              color: blockConfig.color,
              display: 'flex',
              alignItems: 'center'
            }}>
              {blockConfig.icon}
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h6">
                  {block.block_key || blockConfig.name}
                </Typography>
                <Chip
                  label={block.block_type}
                  size="small"
                  sx={{ 
                    backgroundColor: blockConfig.color + '20',
                    color: blockConfig.color,
                    fontWeight: 500
                  }}
                />
                <Chip
                  label={block.visibility}
                  size="small"
                  variant="outlined"
                />
                {!block.is_active && (
                  <Chip label="Inactive" size="small" color="error" variant="outlined" />
                )}
              </Stack>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Sort: {block.sort_order} | Updated: {new Date(block.updated_at).toLocaleDateString()}
              </Typography>
            </Box>
            
            <Stack direction="row" spacing={1}>
              <IconButton
                size="small"
                onClick={() => onEdit(block)}
                sx={{ color: 'primary.main' }}
              >
                <Edit fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => onDelete(block.id)}
                sx={{ color: 'error.main' }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </div>
  )
}

// Section Dialog Component
interface SectionDialogProps {
  open: boolean
  onClose: () => void
  section: ContentSection | null
  onSave: (data: any) => void
  saving: boolean
  form: any
}

function SectionDialog({ open, onClose, section, onSave, saving, form }: SectionDialogProps) {
  const { control, handleSubmit, reset } = form
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {section ? 'Edit Section' : 'Create New Section'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSave)}>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <Controller
                name="section_key"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Section Key"
                    required
                    disabled={!!section}
                    helperText="Unique identifier for this section"
                  />
                )}
              />
            </Grid>
            
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select {...field} label="Status">
                      <MenuItem value="draft">Draft</MenuItem>
                      <MenuItem value="published">Published</MenuItem>
                      <MenuItem value="archived">Archived</MenuItem>
                      <MenuItem value="scheduled">Scheduled</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            
            <Grid size={12}>
              <Typography variant="h6" gutterBottom>Korean Content</Typography>
            </Grid>
            
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <Controller
                name="title.ko"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Title (Korean)"
                    required
                  />
                )}
              />
            </Grid>
            
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <Controller
                name="slug.ko"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Slug (Korean)"
                    helperText="URL-friendly identifier"
                  />
                )}
              />
            </Grid>
            
            <Grid size={12}>
              <Controller
                name="description.ko"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Description (Korean)"
                    multiline
                    rows={3}
                  />
                )}
              />
            </Grid>
            
            <Grid size={12}>
              <Typography variant="h6" gutterBottom>English Content</Typography>
            </Grid>
            
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <Controller
                name="title.en"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Title (English)"
                  />
                )}
              />
            </Grid>
            
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <Controller
                name="slug.en"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Slug (English)"
                    helperText="URL-friendly identifier"
                  />
                )}
              />
            </Grid>
            
            <Grid size={12}>
              <Controller
                name="description.en"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Description (English)"
                    multiline
                    rows={3}
                  />
                )}
              />
            </Grid>
            
            <Grid size={12}>
              <Typography variant="h6" gutterBottom>Settings</Typography>
            </Grid>
            
            <Grid
              size={{
                xs: 12,
                sm: 4
              }}>
              <Controller
                name="visibility"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Visibility</InputLabel>
                    <Select {...field} label="Visibility">
                      <MenuItem value="public">Public</MenuItem>
                      <MenuItem value="members_only">Members Only</MenuItem>
                      <MenuItem value="admin_only">Admin Only</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            
            <Grid
              size={{
                xs: 12,
                sm: 4
              }}>
              <Controller
                name="template"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Template</InputLabel>
                    <Select {...field} label="Template">
                      <MenuItem value="default">Default</MenuItem>
                      <MenuItem value="modern">Modern</MenuItem>
                      <MenuItem value="classic">Classic</MenuItem>
                      <MenuItem value="minimal">Minimal</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            
            <Grid
              size={{
                xs: 12,
                sm: 4
              }}>
              <Controller
                name="sort_order"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Sort Order"
                    type="number"
                    helperText="Display order (0 = first)"
                  />
                )}
              />
            </Grid>
            
            <Grid size={12}>
              <Controller
                name="is_featured"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch {...field} checked={field.value} />}
                    label="Featured Section"
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          >
            {saving ? 'Saving...' : 'Save Section'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// Block Dialog Component
interface BlockDialogProps {
  open: boolean
  onClose: () => void
  block: ContentBlock | null
  onSave: (data: any) => void
  saving: boolean
  form: any
}

function BlockDialog({ open, onClose, block, onSave, saving, form }: BlockDialogProps) {
  const { control, handleSubmit, watch } = form
  const blockType = watch('block_type')
  const blockConfig = blockType ? BLOCK_TYPES[blockType as keyof typeof BLOCK_TYPES] : null
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          {blockConfig && (
            <Box sx={{ 
              p: 1,
              borderRadius: 1,
              backgroundColor: blockConfig.color + '20',
              color: blockConfig.color,
              display: 'flex',
              alignItems: 'center'
            }}>
              {blockConfig.icon}
            </Box>
          )}
          <Box>
            <Typography variant="h6">
              {block ? 'Edit Block' : 'Create New Block'}
            </Typography>
            {blockConfig && (
              <Typography variant="body2" color="text.secondary">
                {blockConfig.name}
              </Typography>
            )}
          </Box>
        </Stack>
      </DialogTitle>
      <form onSubmit={handleSubmit(onSave)}>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid size={12}>
              <Alert severity="info">
                Block content editor will be implemented with a rich content editor (TipTap) for dynamic content management.
              </Alert>
            </Grid>
            
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <Controller
                name="block_key"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Block Key (Optional)"
                    helperText="Unique identifier for this block"
                  />
                )}
              />
            </Grid>
            
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <Controller
                name="visibility"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Visibility</InputLabel>
                    <Select {...field} label="Visibility">
                      <MenuItem value="public">Public</MenuItem>
                      <MenuItem value="members_only">Members Only</MenuItem>
                      <MenuItem value="admin_only">Admin Only</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            
            <Grid size={12}>
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch {...field} checked={field.value} />}
                    label="Active Block"
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          >
            {saving ? 'Saving...' : 'Save Block'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// Preview Dialog Component
interface PreviewDialogProps {
  open: boolean
  onClose: () => void
  section: ContentSection | null
  blocks: ContentBlock[]
}

function PreviewDialog({ open, onClose, section, blocks }: PreviewDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <AppBar sx={{ position: 'relative' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onClose}>
            <Close />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6">
            Preview: {section?.title.ko}
          </Typography>
          <Button color="inherit" startIcon={<Preview />}>
            Open in New Tab
          </Button>
        </Toolbar>
      </AppBar>
      
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 4, backgroundColor: 'background.default', minHeight: '60vh' }}>
          {section ? (
            <>
              <Typography variant="h3" gutterBottom>
                {section.title.ko}
              </Typography>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {section.description?.ko}
              </Typography>
              
              {blocks.map((block, index) => (
                <Card key={block.id} sx={{ mt: 3, p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                    {BLOCK_TYPES[block.block_type] && BLOCK_TYPES[block.block_type].icon}
                    <Typography variant="h6">
                      {BLOCK_TYPES[block.block_type]?.name || block.block_type}
                    </Typography>
                    <Chip label={`Block ${index + 1}`} size="small" variant="outlined" />
                  </Stack>
                  
                  <Typography variant="body2" color="text.secondary">
                    Block content will be rendered here based on the block type and configuration.
                  </Typography>
                </Card>
              ))}
              
              {blocks.length === 0 && (
                <Alert severity="info" sx={{ mt: 3 }}>
                  No content blocks have been added to this section yet.
                </Alert>
              )}
            </>
          ) : (
            <Alert severity="warning">
              No section selected for preview.
            </Alert>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default function MainContentPage() {
  return (
    <AuthGuard requireAuth requireModerator>
      <MainContentManagement />
    </AuthGuard>
  )
}