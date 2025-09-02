'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import AppHeader from '@/components/AppHeader'
import {
  Box,
  Container,
  Typography,
  GridLegacy as Grid,
  Card,
  CardContent,
  CardActions,
  Paper,
  Stack,
  Button,
  IconButton,
  Tabs,
  Tab,
  Breadcrumbs,
  Link,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  Alert,
  AlertTitle,
  LinearProgress,
  Divider,
  Badge,
  Tooltip,
  Rating,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Checkbox,
  Menu,
  Fade,
  Skeleton,
  Snackbar,
} from '@mui/material'
import {
  Dashboard,
  Translate,
  Add,
  Edit,
  Delete,
  Check,
  Close,
  AutoMode,
  Person,
  Business,
  Language,
  History,
  Assessment,
  Speed,
  Warning,
  CheckCircle,
  Schedule,
  SmartToy,
  Psychology,
  ExpandMore,
  Compare,
  Visibility,
  Download,
  Upload,
  Refresh,
  Settings,
  Search,
  FilterList,
  MoreVert,
  PlayArrow,
  Pause,
  Stop,
  ArrowUpward,
  ArrowDownward,
  TrendingUp,
  TrendingDown,
  StarRate,
  CheckBoxOutlineBlank,
  CheckBox,
  IndeterminateCheckBox,
  PublishedWithChanges,
  Unpublished,
  PendingActions,
  RateReview,
  Assignment,
  Engineering,
  Groups,
} from '@mui/icons-material'

// Translation interfaces based on new database schema
interface ContentTranslation {
  id: string
  content_type: string
  content_id: string
  field_name: string
  language_code: 'ko' | 'en'
  original_text: string
  translated_text?: string
  translation_status: 'pending' | 'draft' | 'translated' | 'reviewed' | 'published'
  translation_method: 'manual' | 'ai' | 'professional'
  quality_score?: number
  translator_id?: string
  reviewer_id?: string
  translator?: {
    email: string
    first_name?: string
    last_name?: string
  }
  reviewer?: {
    email: string
    first_name?: string
    last_name?: string
  }
  translated_at?: string
  reviewed_at?: string
  created_at: string
  updated_at: string
}

interface TranslationStats {
  total: number
  pending: number
  draft: number
  translated: number
  reviewed: number
  published: number
  averageQuality: number
  byLanguage: { [key: string]: number }
  byMethod: { [key: string]: number }
}

interface BulkAction {
  action: 'approve' | 'reject' | 'publish' | 'ai_translate' | 'delete'
  translationIds: string[]
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
          >
            <Box sx={{ py: 3 }}>{children}</Box>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const TRANSLATION_STATUS = {
  pending: { name: 'Pending', icon: <Schedule />, color: '#FF9800', bgColor: '#FFF3E0' },
  draft: { name: 'Draft', icon: <Edit />, color: '#9E9E9E', bgColor: '#F5F5F5' },
  translated: { name: 'Translated', icon: <Translate />, color: '#2E86AB', bgColor: '#E3F2FD' },
  reviewed: { name: 'Reviewed', icon: <RateReview />, color: '#A23B72', bgColor: '#FCE4EC' },
  published: { name: 'Published', icon: <PublishedWithChanges />, color: '#4CAF50', bgColor: '#E8F5E8' },
}

const TRANSLATION_METHODS = {
  manual: { name: 'Manual', icon: <Person />, color: '#2E86AB', bgColor: '#E3F2FD' },
  ai: { name: 'AI Translation', icon: <SmartToy />, color: '#E6800F', bgColor: '#FFF3E0' },
  professional: { name: 'Professional', icon: <Business />, color: '#A23B72', bgColor: '#FCE4EC' },
}

const THEME_COLORS = {
  primary: '#2E86AB',
  secondary: '#A23B72', 
  tertiary: '#E6800F',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3'
}

function TranslationManagement() {
  // State management
  const [loading, setLoading] = useState(true)
  const [translations, setTranslations] = useState<ContentTranslation[]>([])
  const [stats, setStats] = useState<TranslationStats>({ 
    total: 0, pending: 0, draft: 0, translated: 0, reviewed: 0, published: 0, 
    averageQuality: 0, byLanguage: {}, byMethod: {} 
  })
  const [selectedTranslation, setSelectedTranslation] = useState<ContentTranslation | null>(null)
  const [selectedTranslations, setSelectedTranslations] = useState<string[]>([])
  
  // Table states
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [sortBy, setSortBy] = useState<keyof ContentTranslation>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  // Filter states
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterLanguage, setFilterLanguage] = useState('all')
  const [filterMethod, setFilterMethod] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [qualityFilter, setQualityFilter] = useState<number | null>(null)
  
  // Dialog states
  const [createDialog, setCreateDialog] = useState(false)
  const [editDialog, setEditDialog] = useState(false)
  const [compareDialog, setCompareDialog] = useState(false)
  const [bulkDialog, setBulkDialog] = useState(false)
  const [aiDialog, setAiDialog] = useState(false)
  
  // UI states
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' })
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const router = useRouter()

  // API functions
  const fetchTranslations = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: (rowsPerPage * (page + 1)).toString()
      })
      
      if (filterStatus !== 'all') params.append('status', filterStatus)
      if (filterLanguage !== 'all') params.append('language_code', filterLanguage)
      
      const response = await fetch(`/api/admin/translations?${params}`)
      if (!response.ok) throw new Error('Failed to fetch translations')
      
      const data = await response.json()
      setTranslations(data.translations || [])
      
      // Calculate stats
      const translations = data.translations || []
      const statsByStatus = translations.reduce((acc: any, t: ContentTranslation) => {
        acc[t.translation_status] = (acc[t.translation_status] || 0) + 1
        return acc
      }, {})
      
      const statsByLanguage = translations.reduce((acc: any, t: ContentTranslation) => {
        acc[t.language_code] = (acc[t.language_code] || 0) + 1
        return acc
      }, {})
      
      const statsByMethod = translations.reduce((acc: any, t: ContentTranslation) => {
        acc[t.translation_method] = (acc[t.translation_method] || 0) + 1
        return acc
      }, {})
      
      const qualityScores = translations.filter((t: ContentTranslation) => t.quality_score).map((t: ContentTranslation) => t.quality_score!)
      const averageQuality = qualityScores.length > 0 ? qualityScores.reduce((a: number, b: number) => a + b, 0) / qualityScores.length : 0
      
      setStats({
        total: translations.length,
        pending: statsByStatus.pending || 0,
        draft: statsByStatus.draft || 0,
        translated: statsByStatus.translated || 0,
        reviewed: statsByStatus.reviewed || 0,
        published: statsByStatus.published || 0,
        averageQuality,
        byLanguage: statsByLanguage,
        byMethod: statsByMethod
      })
      
    } catch (error) {
      console.error('Error fetching translations:', error)
      setSnackbar({ open: true, message: 'Failed to load translations', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, filterStatus, filterLanguage])

  const updateTranslation = async (id: string, action: string, data?: any) => {
    try {
      setActionLoading(id)
      const response = await fetch('/api/admin/translations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, ...data })
      })
      
      if (!response.ok) throw new Error('Failed to update translation')
      
      const result = await response.json()
      setSnackbar({ open: true, message: result.message, severity: 'success' })
      fetchTranslations()
      
    } catch (error) {
      console.error('Error updating translation:', error)
      setSnackbar({ open: true, message: 'Failed to update translation', severity: 'error' })
    } finally {
      setActionLoading(null)
    }
  }

  const deleteTranslation = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this translation?')) return
    
    try {
      setActionLoading(id)
      const response = await fetch(`/api/admin/translations?id=${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to delete translation')
      
      const result = await response.json()
      setSnackbar({ open: true, message: result.message, severity: 'success' })
      fetchTranslations()
      
    } catch (error) {
      console.error('Error deleting translation:', error)
      setSnackbar({ open: true, message: 'Failed to delete translation', severity: 'error' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkAction = async (action: string, translationIds: string[]) => {
    if (translationIds.length === 0) {
      setSnackbar({ open: true, message: 'No translations selected', severity: 'warning' })
      return
    }
    
    try {
      setActionLoading('bulk')
      const promises = translationIds.map(id => updateTranslation(id, action))
      await Promise.all(promises)
      
      setSelectedTranslations([])
      setSnackbar({ open: true, message: `Bulk ${action} completed successfully`, severity: 'success' })
      
    } catch (error) {
      console.error('Error in bulk action:', error)
      setSnackbar({ open: true, message: `Bulk ${action} failed`, severity: 'error' })
    } finally {
      setActionLoading(null)
    }
  }


  useEffect(() => {
    fetchTranslations()
  }, [fetchTranslations])

  // Filtered translations
  const filteredTranslations = translations.filter(translation => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      if (!(
        translation.content_id.toLowerCase().includes(searchLower) ||
        translation.field_name.toLowerCase().includes(searchLower) ||
        translation.original_text.toLowerCase().includes(searchLower) ||
        translation.translated_text?.toLowerCase().includes(searchLower) ||
        translation.translator?.email?.toLowerCase().includes(searchLower) ||
        translation.reviewer?.email?.toLowerCase().includes(searchLower)
      )) {
        return false
      }
    }
    
    if (filterStatus !== 'all' && translation.translation_status !== filterStatus) {
      return false
    }
    
    if (filterLanguage !== 'all' && translation.language_code !== filterLanguage) {
      return false
    }
    
    if (filterMethod !== 'all' && translation.translation_method !== filterMethod) {
      return false
    }
    
    if (qualityFilter !== null && (!translation.quality_score || translation.quality_score < qualityFilter)) {
      return false
    }
    
    return true
  })
  
  // Sorted translations
  const sortedTranslations = [...filteredTranslations].sort((a, b) => {
    const aVal = a[sortBy]
    const bVal = b[sortBy]
    
    if (aVal != null && bVal != null && aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal != null && bVal != null && aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })
  
  // Paginated translations
  const paginatedTranslations = sortedTranslations.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  )

  // Event handlers
  const handleSort = (property: keyof ContentTranslation) => {
    const isAsc = sortBy === property && sortDirection === 'asc'
    setSortBy(property)
    setSortDirection(isAsc ? 'desc' : 'asc')
  }
  
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedTranslations(paginatedTranslations.map(t => t.id))
    } else {
      setSelectedTranslations([])
    }
  }
  
  const handleSelectOne = (id: string) => {
    const selectedIndex = selectedTranslations.indexOf(id)
    let newSelected: string[] = []
    
    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedTranslations, id)
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedTranslations.slice(1))
    } else if (selectedIndex === selectedTranslations.length - 1) {
      newSelected = newSelected.concat(selectedTranslations.slice(0, -1))
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedTranslations.slice(0, selectedIndex),
        selectedTranslations.slice(selectedIndex + 1)
      )
    }
    
    setSelectedTranslations(newSelected)
  }
  
  const resetFilters = () => {
    setFilterStatus('all')
    setFilterLanguage('all')
    setFilterMethod('all')
    setQualityFilter(null)
    setSearchTerm('')
  }

  // Utility functions
  const getStatusColor = (status: string) => {
    const statusConfig = TRANSLATION_STATUS[status as keyof typeof TRANSLATION_STATUS]
    return statusConfig?.color || THEME_COLORS.info
  }
  
  const getStatusBgColor = (status: string) => {
    const statusConfig = TRANSLATION_STATUS[status as keyof typeof TRANSLATION_STATUS]
    return statusConfig?.bgColor || '#E3F2FD'
  }

  const getMethodColor = (method: string) => {
    const methodConfig = TRANSLATION_METHODS[method as keyof typeof TRANSLATION_METHODS]
    return methodConfig?.color || THEME_COLORS.info
  }
  
  const getMethodBgColor = (method: string) => {
    const methodConfig = TRANSLATION_METHODS[method as keyof typeof TRANSLATION_METHODS]
    return methodConfig?.bgColor || '#E3F2FD'
  }

  const getQualityColor = (score?: number) => {
    if (!score) return THEME_COLORS.info
    if (score >= 0.9) return THEME_COLORS.success
    if (score >= 0.8) return THEME_COLORS.warning
    if (score >= 0.7) return THEME_COLORS.tertiary
    return THEME_COLORS.error
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  const getUserName = (user?: { email: string; first_name?: string; last_name?: string }) => {
    if (!user) return 'N/A'
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim()
    }
    return user.email
  }

  const renderTranslationRow = (translation: ContentTranslation) => {
    const isSelected = selectedTranslations.includes(translation.id)
    const statusConfig = TRANSLATION_STATUS[translation.translation_status]
    const methodConfig = TRANSLATION_METHODS[translation.translation_method]
    
    return (
      <TableRow
        key={translation.id}
        hover
        selected={isSelected}
        sx={{ 
          '&.Mui-selected': { backgroundColor: `${THEME_COLORS.primary}08` },
          cursor: 'pointer'
        }}
      >
        <TableCell padding="checkbox">
          <Checkbox
            checked={isSelected}
            onChange={() => handleSelectOne(translation.id)}
          />
        </TableCell>
        
        <TableCell>
          <Stack spacing={0.5}>
            <Typography variant="body2" fontWeight={600}>
              {translation.content_id}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {translation.content_type}
            </Typography>
          </Stack>
        </TableCell>
        
        <TableCell>
          <Typography variant="body2">
            {translation.field_name}
          </Typography>
        </TableCell>
        
        <TableCell>
          <Chip
            label={translation.language_code.toUpperCase()}
            size="small"
            sx={{
              backgroundColor: translation.language_code === 'ko' ? '#E8F5E8' : '#E3F2FD',
              color: translation.language_code === 'ko' ? '#2E7D32' : '#1976D2',
              fontWeight: 600
            }}
          />
        </TableCell>
        
        <TableCell>
          <Chip
            icon={statusConfig.icon}
            label={statusConfig.name}
            size="small"
            sx={{
              backgroundColor: statusConfig.bgColor,
              color: statusConfig.color,
              fontWeight: 600
            }}
          />
        </TableCell>
        
        <TableCell>
          <Chip
            icon={methodConfig.icon}
            label={methodConfig.name}
            size="small"
            sx={{
              backgroundColor: methodConfig.bgColor,
              color: methodConfig.color,
              fontWeight: 500
            }}
          />
        </TableCell>
        
        <TableCell>
          {translation.quality_score ? (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Rating
                value={translation.quality_score * 5}
                size="small"
                readOnly
                precision={0.1}
                sx={{ color: getQualityColor(translation.quality_score) }}
              />
              <Typography variant="caption" fontWeight={600}>
                {Math.round(translation.quality_score * 100)}%
              </Typography>
            </Stack>
          ) : (
            <Typography variant="caption" color="text.secondary">N/A</Typography>
          )}
        </TableCell>
        
        <TableCell>
          <Stack spacing={0.5}>
            <Typography variant="caption">
              {getUserName(translation.translator)}
            </Typography>
            {translation.reviewer && (
              <Typography variant="caption" color="text.secondary">
                Rev: {getUserName(translation.reviewer)}
              </Typography>
            )}
          </Stack>
        </TableCell>
        
        <TableCell>
          <Stack spacing={0.5}>
            <Typography variant="caption">
              {formatDate(translation.created_at)}
            </Typography>
            {translation.translated_at && (
              <Typography variant="caption" color="text.secondary">
                Trans: {formatDate(translation.translated_at)}
              </Typography>
            )}
          </Stack>
        </TableCell>
        
        <TableCell align="right">
          <Stack direction="row" spacing={0.5}>
            {translation.translation_status === 'translated' && (
              <>
                <Tooltip title="Approve">
                  <IconButton
                    size="small"
                    onClick={() => updateTranslation(translation.id, 'approve')}
                    disabled={actionLoading === translation.id}
                    sx={{ color: THEME_COLORS.success }}
                  >
                    <Check fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reject">
                  <IconButton
                    size="small"
                    onClick={() => updateTranslation(translation.id, 'reject')}
                    disabled={actionLoading === translation.id}
                    sx={{ color: THEME_COLORS.error }}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
            
            {translation.translation_status === 'reviewed' && (
              <Tooltip title="Publish">
                <IconButton
                  size="small"
                  onClick={() => updateTranslation(translation.id, 'publish')}
                  disabled={actionLoading === translation.id}
                  sx={{ color: THEME_COLORS.primary }}
                >
                  <PublishedWithChanges fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            
            <Tooltip title="Compare">
              <IconButton
                size="small"
                onClick={() => {
                  setSelectedTranslation(translation)
                  setCompareDialog(true)
                }}
              >
                <Compare fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="More actions">
              <IconButton
                size="small"
                onClick={(e) => {
                  setAnchorEl(e.currentTarget)
                  setSelectedTranslation(translation)
                }}
              >
                <MoreVert fontSize="small" />
              </IconButton>
            </Tooltip>
            
            {actionLoading === translation.id && (
              <CircularProgress size={16} />
            )}
          </Stack>
        </TableCell>
      </TableRow>
    )
  }

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <AppHeader />
        <Container maxWidth="xl" sx={{ mt: 3 }}>
          <Stack spacing={3}>
            <Skeleton variant="rectangular" height={80} />
            <Grid container spacing={2}>
              {[1, 2, 3, 4].map(i => (
                <Grid item xs={12} sm={6} md={3} key={i}>
                  <Skeleton variant="rectangular" height={100} />
                </Grid>
              ))}
            </Grid>
            <Skeleton variant="rectangular" height={400} />
          </Stack>
        </Container>
      </Box>
    )
  }

  return (
    <>
      <AppHeader />
      <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
        {/* Header */}
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
                <Translate sx={{ mr: 0.5 }} fontSize="inherit" />
                Translation Management
              </Typography>
            </Breadcrumbs>
            
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Box>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                  Enhanced Multilingual System
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Professional translation workflow with AI assistance and quality control
                </Typography>
              </Box>
              
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<SmartToy />}
                  onClick={() => setAiDialog(true)}
                  sx={{ 
                    color: THEME_COLORS.tertiary,
                    borderColor: THEME_COLORS.tertiary,
                    '&:hover': {
                      backgroundColor: `${THEME_COLORS.tertiary}10`,
                      borderColor: THEME_COLORS.tertiary
                    }
                  }}
                >
                  AI Translation
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Upload />}
                  onClick={() => setBulkDialog(true)}
                  sx={{ 
                    color: THEME_COLORS.secondary,
                    borderColor: THEME_COLORS.secondary,
                    '&:hover': {
                      backgroundColor: `${THEME_COLORS.secondary}10`,
                      borderColor: THEME_COLORS.secondary
                    }
                  }}
                >
                  Bulk Actions
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setCreateDialog(true)}
                  sx={{ 
                    backgroundColor: THEME_COLORS.primary,
                    '&:hover': { backgroundColor: THEME_COLORS.primary },
                  }}
                >
                  New Translation
                </Button>
              </Stack>
            </Stack>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 3, 
                    textAlign: 'center', 
                    backgroundColor: `${THEME_COLORS.primary}15`,
                    border: `1px solid ${THEME_COLORS.primary}30`,
                    borderRadius: 2
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mb: 1 }}>
                    <Assignment sx={{ color: THEME_COLORS.primary }} />
                    <Typography variant="h4" sx={{ color: THEME_COLORS.primary, fontWeight: 'bold' }}>
                      {stats.total}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Total Translations
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 3, 
                    textAlign: 'center', 
                    backgroundColor: `${THEME_COLORS.success}15`,
                    border: `1px solid ${THEME_COLORS.success}30`,
                    borderRadius: 2
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mb: 1 }}>
                    <PublishedWithChanges sx={{ color: THEME_COLORS.success }} />
                    <Typography variant="h4" sx={{ color: THEME_COLORS.success, fontWeight: 'bold' }}>
                      {stats.published}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Published
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 3, 
                    textAlign: 'center', 
                    backgroundColor: `${THEME_COLORS.secondary}15`,
                    border: `1px solid ${THEME_COLORS.secondary}30`,
                    borderRadius: 2
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mb: 1 }}>
                    <PendingActions sx={{ color: THEME_COLORS.secondary }} />
                    <Typography variant="h4" sx={{ color: THEME_COLORS.secondary, fontWeight: 'bold' }}>
                      {stats.translated}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Pending Review
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 3, 
                    textAlign: 'center', 
                    backgroundColor: `${THEME_COLORS.tertiary}15`,
                    border: `1px solid ${THEME_COLORS.tertiary}30`,
                    borderRadius: 2
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mb: 1 }}>
                    <StarRate sx={{ color: THEME_COLORS.tertiary }} />
                    <Typography variant="h4" sx={{ color: THEME_COLORS.tertiary, fontWeight: 'bold' }}>
                      {Math.round(stats.averageQuality * 100)}%
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Avg. Quality
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </motion.div>

        {/* Filters and Controls */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, backgroundColor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search translations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} />
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                    '&:hover fieldset': { borderColor: THEME_COLORS.primary },
                    '&.Mui-focused fieldset': { borderColor: THEME_COLORS.primary }
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                  sx={{ backgroundColor: 'white' }}
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  {Object.entries(TRANSLATION_STATUS).map(([key, config]) => (
                    <MenuItem key={key} value={key}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        {config.icon}
                        <span>{config.name}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Language</InputLabel>
                <Select
                  value={filterLanguage}
                  label="Language"
                  onChange={(e) => setFilterLanguage(e.target.value)}
                  sx={{ backgroundColor: 'white' }}
                >
                  <MenuItem value="all">All Languages</MenuItem>
                  <MenuItem value="ko">Korean</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Method</InputLabel>
                <Select
                  value={filterMethod}
                  label="Method"
                  onChange={(e) => setFilterMethod(e.target.value)}
                  sx={{ backgroundColor: 'white' }}
                >
                  <MenuItem value="all">All Methods</MenuItem>
                  {Object.entries(TRANSLATION_METHODS).map(([key, config]) => (
                    <MenuItem key={key} value={key}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        {config.icon}
                        <span>{config.name}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Stack direction="row" spacing={1}>
                <Tooltip title="Reset Filters">
                  <IconButton onClick={resetFilters} sx={{ color: THEME_COLORS.secondary }}>
                    <Refresh />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Export Data">
                  <IconButton sx={{ color: THEME_COLORS.primary }}>
                    <Download />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Grid>
          </Grid>
          
          {/* Bulk Actions */}
          {selectedTranslations.length > 0 && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: `${THEME_COLORS.primary}10`, borderRadius: 1 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {selectedTranslations.length} translation(s) selected:
                </Typography>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => handleBulkAction('approve', selectedTranslations)}
                  sx={{ color: THEME_COLORS.success, borderColor: THEME_COLORS.success }}
                >
                  Approve All
                </Button>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => handleBulkAction('publish', selectedTranslations)}
                  sx={{ color: THEME_COLORS.primary, borderColor: THEME_COLORS.primary }}
                >
                  Publish All
                </Button>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => handleBulkAction('ai_translate', selectedTranslations)}
                  sx={{ color: THEME_COLORS.tertiary, borderColor: THEME_COLORS.tertiary }}
                >
                  AI Translate
                </Button>
                <Button 
                  size="small" 
                  variant="outlined" 
                  color="error"
                  onClick={() => handleBulkAction('delete', selectedTranslations)}
                >
                  Delete All
                </Button>
              </Stack>
            </Box>
          )}
        </Paper>

        {/* Translations Table */}
        <Paper elevation={0} sx={{ overflow: 'hidden', border: '1px solid', borderColor: 'grey.200' }}>
          <TableContainer sx={{ maxHeight: '70vh' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow sx={{ '& th': { backgroundColor: 'grey.50', fontWeight: 600 } }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedTranslations.length > 0 && selectedTranslations.length < paginatedTranslations.length}
                      checked={paginatedTranslations.length > 0 && selectedTranslations.length === paginatedTranslations.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'content_id'}
                      direction={sortBy === 'content_id' ? sortDirection : 'asc'}
                      onClick={() => handleSort('content_id')}
                      sx={{ color: THEME_COLORS.primary, fontWeight: 600 }}
                    >
                      Content
                    </TableSortLabel>
                  </TableCell>
                  
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'field_name'}
                      direction={sortBy === 'field_name' ? sortDirection : 'asc'}
                      onClick={() => handleSort('field_name')}
                      sx={{ color: THEME_COLORS.primary, fontWeight: 600 }}
                    >
                      Field
                    </TableSortLabel>
                  </TableCell>
                  
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'language_code'}
                      direction={sortBy === 'language_code' ? sortDirection : 'asc'}
                      onClick={() => handleSort('language_code')}
                      sx={{ color: THEME_COLORS.primary, fontWeight: 600 }}
                    >
                      Language
                    </TableSortLabel>
                  </TableCell>
                  
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'translation_status'}
                      direction={sortBy === 'translation_status' ? sortDirection : 'asc'}
                      onClick={() => handleSort('translation_status')}
                      sx={{ color: THEME_COLORS.primary, fontWeight: 600 }}
                    >
                      Status
                    </TableSortLabel>
                  </TableCell>
                  
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'translation_method'}
                      direction={sortBy === 'translation_method' ? sortDirection : 'asc'}
                      onClick={() => handleSort('translation_method')}
                      sx={{ color: THEME_COLORS.primary, fontWeight: 600 }}
                    >
                      Method
                    </TableSortLabel>
                  </TableCell>
                  
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'quality_score'}
                      direction={sortBy === 'quality_score' ? sortDirection : 'asc'}
                      onClick={() => handleSort('quality_score')}
                      sx={{ color: THEME_COLORS.primary, fontWeight: 600 }}
                    >
                      Quality
                    </TableSortLabel>
                  </TableCell>
                  
                  <TableCell sx={{ color: THEME_COLORS.primary, fontWeight: 600 }}>
                    Users
                  </TableCell>
                  
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'created_at'}
                      direction={sortBy === 'created_at' ? sortDirection : 'asc'}
                      onClick={() => handleSort('created_at')}
                      sx={{ color: THEME_COLORS.primary, fontWeight: 600 }}
                    >
                      Dates
                    </TableSortLabel>
                  </TableCell>
                  
                  <TableCell align="right" sx={{ color: THEME_COLORS.primary, fontWeight: 600 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              
              <TableBody>
                {paginatedTranslations.length > 0 ? (
                  paginatedTranslations.map(translation => renderTranslationRow(translation))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} sx={{ textAlign: 'center', py: 4 }}>
                      <Stack alignItems="center" spacing={2}>
                        <Translate sx={{ fontSize: 48, color: 'grey.400' }} />
                        <Typography variant="body1" color="text.secondary">
                          {filteredTranslations.length === 0 ? 'No translations found' : 'No translations match your filters'}
                        </Typography>
                        {filteredTranslations.length !== translations.length && (
                          <Button 
                            variant="outlined" 
                            startIcon={<Refresh />}
                            onClick={resetFilters}
                            sx={{ color: THEME_COLORS.primary }}
                          >
                            Reset Filters
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Table Pagination */}
          <TablePagination
            component="div"
            count={filteredTranslations.length}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10))
              setPage(0)
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            showFirstButton
            showLastButton
            sx={{
              borderTop: '1px solid',
              borderColor: 'grey.200',
              backgroundColor: 'grey.50'
            }}
          />
        </Paper>

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={() => {
            if (selectedTranslation) {
              setSelectedTranslation(selectedTranslation)
              setEditDialog(true)
            }
            setAnchorEl(null)
          }}>
            <Edit sx={{ mr: 1, color: THEME_COLORS.primary }} />
            Edit Translation
          </MenuItem>
          <MenuItem onClick={() => {
            if (selectedTranslation) {
              updateTranslation(selectedTranslation.id, 'ai_translate')
            }
            setAnchorEl(null)
          }}>
            <SmartToy sx={{ mr: 1, color: THEME_COLORS.tertiary }} />
            AI Translate
          </MenuItem>
          <Divider />
          <MenuItem 
            onClick={() => {
              if (selectedTranslation) {
                deleteTranslation(selectedTranslation.id)
              }
              setAnchorEl(null)
            }}
            sx={{ color: THEME_COLORS.error }}
          >
            <Delete sx={{ mr: 1 }} />
            Delete Translation
          </MenuItem>
        </Menu>
        
        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert 
            severity={snackbar.severity} 
            onClose={() => setSnackbar({ ...snackbar, open: false })}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        
        {/* Create/Edit Translation Dialog */}
        <Dialog 
          open={createDialog || editDialog} 
          onClose={() => {
            setCreateDialog(false)
            setEditDialog(false)
            setSelectedTranslation(null)
          }} 
          maxWidth="lg" 
          fullWidth
        >
          <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Translate sx={{ color: THEME_COLORS.primary }} />
              <Typography variant="h6">
                {editDialog ? 'Edit Translation' : 'Create New Translation'}
              </Typography>
            </Stack>
          </DialogTitle>
          
          <DialogContent sx={{ p: 0 }}>
            <Grid container sx={{ minHeight: 500 }}>
              {/* Original Text */}
              <Grid item xs={12} md={6} sx={{ p: 3, borderRight: { md: 1 }, borderColor: 'divider' }}>
                <Typography variant="h6" gutterBottom sx={{ color: THEME_COLORS.primary }}>
                  Original Text
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  value={selectedTranslation?.original_text || ''}
                  placeholder="Enter original text..."
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'grey.50'
                    }
                  }}
                />
                
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <TextField
                    label="Content ID"
                    value={selectedTranslation?.content_id || ''}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Field Name"
                    value={selectedTranslation?.field_name || ''}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                </Stack>
              </Grid>
              
              {/* Translation */}
              <Grid item xs={12} md={6} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ color: THEME_COLORS.secondary }}>
                  Translation
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  value={selectedTranslation?.translated_text || ''}
                  placeholder="Enter translation here..."
                  variant="outlined"
                />
                
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Language</InputLabel>
                    <Select 
                      value={selectedTranslation?.language_code || 'en'} 
                      label="Language"
                    >
                      <MenuItem value="ko">Korean</MenuItem>
                      <MenuItem value="en">English</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Method</InputLabel>
                    <Select 
                      value={selectedTranslation?.translation_method || 'manual'} 
                      label="Method"
                    >
                      <MenuItem value="manual">Manual</MenuItem>
                      <MenuItem value="ai">AI Translation</MenuItem>
                      <MenuItem value="professional">Professional</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Grid>
            </Grid>
          </DialogContent>
          
          <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
            <Button 
              onClick={() => {
                setCreateDialog(false)
                setEditDialog(false)
                setSelectedTranslation(null)
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              startIcon={editDialog ? <Edit /> : <Add />}
              sx={{ backgroundColor: THEME_COLORS.primary }}
            >
              {editDialog ? 'Update Translation' : 'Create Translation'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* AI Translation Dialog */}
        <Dialog open={aiDialog} onClose={() => setAiDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <SmartToy sx={{ color: THEME_COLORS.tertiary }} />
              <Typography variant="h6">AI Translation Assistant</Typography>
            </Stack>
          </DialogTitle>
          
          <DialogContent sx={{ p: 3 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <AlertTitle>AI-Powered Translation</AlertTitle>
              Configure AI translation settings and let our advanced models handle the translation work for you.
            </Alert>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Translation Engine</InputLabel>
                  <Select defaultValue="gpt4">
                    <MenuItem value="gpt4">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <SmartToy fontSize="small" />
                        <span>GPT-4 Turbo</span>
                      </Stack>
                    </MenuItem>
                    <MenuItem value="claude">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Psychology fontSize="small" />
                        <span>Claude 3</span>
                      </Stack>
                    </MenuItem>
                    <MenuItem value="google">Google Translate</MenuItem>
                    <MenuItem value="deepl">DeepL</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Quality Level</InputLabel>
                  <Select defaultValue="high">
                    <MenuItem value="high">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <StarRate fontSize="small" sx={{ color: THEME_COLORS.success }} />
                        <span>High Quality (Slower)</span>
                      </Stack>
                    </MenuItem>
                    <MenuItem value="medium">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <TrendingUp fontSize="small" sx={{ color: THEME_COLORS.warning }} />
                        <span>Medium Quality</span>
                      </Stack>
                    </MenuItem>
                    <MenuItem value="fast">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Speed fontSize="small" sx={{ color: THEME_COLORS.info }} />
                        <span>Fast Translation</span>
                      </Stack>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          
          <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
            <Button onClick={() => setAiDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              startIcon={<SmartToy />}
              sx={{ backgroundColor: THEME_COLORS.tertiary }}
            >
              Start AI Translation
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Compare Translation Dialog */}
        <Dialog open={compareDialog} onClose={() => setCompareDialog(false)} maxWidth="lg" fullWidth>
          <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Compare sx={{ color: THEME_COLORS.primary }} />
              <Typography variant="h6">Translation Comparison</Typography>
            </Stack>
          </DialogTitle>
          
          <DialogContent sx={{ p: 0 }}>
            {selectedTranslation && (
              <Grid container sx={{ minHeight: 400 }}>
                <Grid item xs={12} md={6} sx={{ p: 3, borderRight: { md: 1 }, borderColor: 'divider', backgroundColor: 'grey.50' }}>
                  <Stack spacing={2}>
                    <Typography variant="h6" sx={{ color: THEME_COLORS.primary }}>
                      Original ({selectedTranslation.language_code === 'en' ? 'Korean' : 'English'})
                    </Typography>
                    <Paper elevation={0} sx={{ p: 2, backgroundColor: 'white', border: 1, borderColor: 'grey.300' }}>
                      <Typography variant="body1">
                        {selectedTranslation.original_text}
                      </Typography>
                    </Paper>
                    
                    <Stack direction="row" spacing={2}>
                      <Chip 
                        label={selectedTranslation.content_type} 
                        size="small" 
                        variant="outlined" 
                      />
                      <Chip 
                        label={selectedTranslation.field_name} 
                        size="small" 
                        variant="outlined" 
                      />
                    </Stack>
                  </Stack>
                </Grid>
                
                <Grid item xs={12} md={6} sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Typography variant="h6" sx={{ color: THEME_COLORS.secondary }}>
                      Translation ({selectedTranslation.language_code.toUpperCase()})
                    </Typography>
                    <Paper elevation={0} sx={{ p: 2, backgroundColor: `${THEME_COLORS.secondary}08`, border: 1, borderColor: `${THEME_COLORS.secondary}30` }}>
                      <Typography variant="body1">
                        {selectedTranslation.translated_text || 'No translation available'}
                      </Typography>
                    </Paper>
                    
                    <Stack direction="row" spacing={2}>
                      <Chip 
                        icon={TRANSLATION_METHODS[selectedTranslation.translation_method].icon}
                        label={TRANSLATION_METHODS[selectedTranslation.translation_method].name} 
                        size="small" 
                        sx={{
                          backgroundColor: getMethodBgColor(selectedTranslation.translation_method),
                          color: getMethodColor(selectedTranslation.translation_method)
                        }}
                      />
                      {selectedTranslation.quality_score && (
                        <Chip 
                          icon={<StarRate fontSize="small" />}
                          label={`${Math.round(selectedTranslation.quality_score * 100)}% Quality`} 
                          size="small" 
                          sx={{
                            backgroundColor: `${getQualityColor(selectedTranslation.quality_score)}15`,
                            color: getQualityColor(selectedTranslation.quality_score)
                          }}
                        />
                      )}
                    </Stack>
                  </Stack>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          
          <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
            <Button onClick={() => setCompareDialog(false)}>
              Close
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<Edit />}
              onClick={() => {
                setCompareDialog(false)
                setEditDialog(true)
              }}
              sx={{ color: THEME_COLORS.primary, borderColor: THEME_COLORS.primary }}
            >
              Edit Translation
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Bulk Actions Dialog */}
        <Dialog open={bulkDialog} onClose={() => setBulkDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Groups sx={{ color: THEME_COLORS.secondary }} />
              <Typography variant="h6">Bulk Actions</Typography>
            </Stack>
          </DialogTitle>
          
          <DialogContent sx={{ p: 3 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <AlertTitle>Bulk Operations</AlertTitle>
              Perform actions on multiple translations at once to improve workflow efficiency.
            </Alert>
            
            <Stack spacing={3}>
              <Paper elevation={0} sx={{ p: 2, backgroundColor: 'grey.50', border: 1, borderColor: 'grey.200' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Available Actions:
                </Typography>
                <Stack spacing={1}>
                  <Button 
                    variant="outlined" 
                    startIcon={<SmartToy />} 
                    fullWidth 
                    sx={{ justifyContent: 'flex-start', color: THEME_COLORS.tertiary, borderColor: THEME_COLORS.tertiary }}
                  >
                    AI Translate Selected
                  </Button>
                  <Button 
                    variant="outlined" 
                    startIcon={<Check />} 
                    fullWidth 
                    sx={{ justifyContent: 'flex-start', color: THEME_COLORS.success, borderColor: THEME_COLORS.success }}
                  >
                    Approve All Selected
                  </Button>
                  <Button 
                    variant="outlined" 
                    startIcon={<PublishedWithChanges />} 
                    fullWidth 
                    sx={{ justifyContent: 'flex-start', color: THEME_COLORS.primary, borderColor: THEME_COLORS.primary }}
                  >
                    Publish All Selected
                  </Button>
                  <Button 
                    variant="outlined" 
                    startIcon={<Download />} 
                    fullWidth 
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Export Selected
                  </Button>
                </Stack>
              </Paper>
            </Stack>
          </DialogContent>
          
          <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
            <Button onClick={() => setBulkDialog(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  )
}

export default function TranslationManagementPage() {
  return (
    <AuthGuard requireAuth requireModerator>
      <TranslationManagement />
    </AuthGuard>
  )
}