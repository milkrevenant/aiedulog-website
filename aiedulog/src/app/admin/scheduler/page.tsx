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
  Button,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  IconButton,
  Tabs,
  Tab,
  Breadcrumbs,
  Link,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  Divider,
  Badge,
  Tooltip,
  Snackbar,
} from '@mui/material'
import {
  Dashboard,
  Schedule,
  Add,
  Edit,
  Delete,
  PlayArrow,
  Pause,
  Stop,
  History,
  Event,
  CalendarMonth,
  Timeline,
  Pending,
  CheckCircle,
  Error,
  Cancel,
  Autorenew,
  Publish,
  Unpublished,
  Archive,
  Update,
  AccessTime,
  Today,
  DateRange,
  Notifications,
  NotificationImportant,
} from '@mui/icons-material'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import type { ContentSchedule, ScheduleType, ScheduleStatus } from '@/types/content-management'

// Theme colors
const THEME_COLORS = {
  primary: '#2E86AB', // Ocean Blue
  secondary: '#A23B72', // Rose Pink
  tertiary: '#E6800F', // Orange
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  grey: '#9e9e9e'
};

// Schedule types and status configurations
const SCHEDULE_TYPES = {
  publish: {
    name: 'Publish',
    icon: <Publish />,
    color: THEME_COLORS.success,
    description: 'Automatically publish content'
  },
  unpublish: {
    name: 'Unpublish',
    icon: <Unpublished />,
    color: THEME_COLORS.warning,
    description: 'Remove content from public view'
  },
  archive: {
    name: 'Archive',
    icon: <Archive />,
    color: THEME_COLORS.grey,
    description: 'Move content to archive'
  },
  update: {
    name: 'Update',
    icon: <Update />,
    color: THEME_COLORS.primary,
    description: 'Automatically update content'
  }
}

const SCHEDULE_STATUS = {
  pending: {
    name: 'Pending',
    icon: <Pending />,
    color: THEME_COLORS.warning,
    description: 'Waiting for execution'
  },
  executed: {
    name: 'Executed',
    icon: <CheckCircle />,
    color: THEME_COLORS.success,
    description: 'Successfully executed'
  },
  failed: {
    name: 'Failed',
    icon: <Error />,
    color: THEME_COLORS.error,
    description: 'Execution failed with error'
  },
  cancelled: {
    name: 'Cancelled',
    icon: <Cancel />,
    color: THEME_COLORS.grey,
    description: 'Cancelled by user'
  }
}

interface ScheduleWithDetails extends ContentSchedule {
  content_title?: string
  next_run_time?: string
  is_recurring?: boolean
  execution_attempts?: number
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

function ContentScheduler() {
  // State management
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [schedules, setSchedules] = useState<ScheduleWithDetails[]>([])
  const [filteredSchedules, setFilteredSchedules] = useState<ScheduleWithDetails[]>([])
  const [stats, setStats] = useState<any>({})
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleWithDetails | null>(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' })
  const [tabValue, setTabValue] = useState(0)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  
  // Filter states
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Dialog states
  const [createDialog, setCreateDialog] = useState(false)
  const [editDialog, setEditDialog] = useState(false)
  const [detailsDialog, setDetailsDialog] = useState(false)
  
  // Form states
  const [formData, setFormData] = useState({
    content_type: 'section' as 'section' | 'block',
    content_id: '',
    schedule_type: 'publish' as ScheduleType,
    scheduled_time: new Date(),
    timezone: 'Asia/Seoul',
    recurrence_rule: '',
    action_data: {}
  })

  const router = useRouter()

  // API functions
  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.append('status', filterStatus)
      if (filterType !== 'all') params.append('schedule_type', filterType)
      params.append('limit', '100')

      const response = await fetch(`/api/admin/scheduler?${params}`)
      const data = await response.json()

      if (data.success) {
        const schedulesWithDetails = data.schedules.map((schedule: any) => ({
          ...schedule,
          content_title: schedule.sections?.title?.en || schedule.blocks?.content?.title?.en || schedule.content_id,
          is_recurring: Boolean(schedule.recurrence_rule),
          execution_attempts: schedule.execution_attempts || 0
        }))
        setSchedules(schedulesWithDetails)
        setStats(data.stats || {})
      } else {
        showSnackbar('Failed to fetch schedules', 'error')
      }
    } catch (error) {
      console.error('Error fetching schedules:', error)
      showSnackbar('Error fetching schedules', 'error')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterType])

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setSnackbar({ open: true, message, severity })
  }

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  // Filter schedules based on criteria
  useEffect(() => {
    let filtered = schedules

    if (searchTerm) {
      filtered = filtered.filter(schedule =>
        schedule.content_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.content_id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(schedule => schedule.status === filterStatus)
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(schedule => schedule.schedule_type === filterType)
    }

    setFilteredSchedules(filtered)
  }, [schedules, searchTerm, filterStatus, filterType])

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleCreateSchedule = () => {
    setSelectedSchedule(null)
    setFormData({
      content_type: 'section',
      content_id: '',
      schedule_type: 'publish',
      scheduled_time: new Date(),
      timezone: 'Asia/Seoul',
      recurrence_rule: '',
      action_data: {}
    })
    setCreateDialog(true)
  }

  const handleSubmitSchedule = async () => {
    try {
      setSubmitting(true)
      const response = await fetch('/api/admin/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        showSnackbar('Schedule created successfully')
        setCreateDialog(false)
        fetchSchedules()
      } else {
        showSnackbar(data.error || 'Failed to create schedule', 'error')
      }
    } catch (error) {
      console.error('Error creating schedule:', error)
      showSnackbar('Error creating schedule', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSchedule = (schedule: ScheduleWithDetails) => {
    setSelectedSchedule(schedule)
    setFormData({
      content_type: schedule.content_type,
      content_id: schedule.content_id,
      schedule_type: schedule.schedule_type,
      scheduled_time: new Date(schedule.scheduled_time),
      timezone: schedule.timezone,
      recurrence_rule: schedule.recurrence_rule || '',
      action_data: schedule.action_data || {}
    })
    setEditDialog(true)
  }

  const handleUpdateSchedule = async () => {
    if (!selectedSchedule) return
    
    try {
      setSubmitting(true)
      const response = await fetch('/api/admin/scheduler', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedSchedule.id,
          ...formData
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        showSnackbar('Schedule updated successfully')
        setEditDialog(false)
        fetchSchedules()
      } else {
        showSnackbar(data.error || 'Failed to update schedule', 'error')
      }
    } catch (error) {
      console.error('Error updating schedule:', error)
      showSnackbar('Error updating schedule', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        const response = await fetch(`/api/admin/scheduler?id=${scheduleId}`, {
          method: 'DELETE'
        })
        
        const data = await response.json()
        
        if (data.success) {
          showSnackbar('Schedule deleted successfully')
          fetchSchedules()
        } else {
          showSnackbar(data.error || 'Failed to delete schedule', 'error')
        }
      } catch (error) {
        console.error('Error deleting schedule:', error)
        showSnackbar('Error deleting schedule', 'error')
      }
    }
  }

  const handleExecuteSchedule = async (scheduleId: string) => {
    try {
      const response = await fetch('/api/admin/scheduler', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: scheduleId, action: 'execute' })
      })
      
      const data = await response.json()
      
      if (data.success) {
        showSnackbar('Schedule executed successfully')
        fetchSchedules()
      } else {
        showSnackbar(data.error || 'Failed to execute schedule', 'error')
      }
    } catch (error) {
      console.error('Error executing schedule:', error)
      showSnackbar('Error executing schedule', 'error')
    }
  }

  const handlePauseSchedule = async (scheduleId: string) => {
    try {
      const response = await fetch('/api/admin/scheduler', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: scheduleId, action: 'pause' })
      })
      
      const data = await response.json()
      
      if (data.success) {
        showSnackbar('Schedule paused successfully')
        fetchSchedules()
      } else {
        showSnackbar(data.error || 'Failed to pause schedule', 'error')
      }
    } catch (error) {
      console.error('Error pausing schedule:', error)
      showSnackbar('Error pausing schedule', 'error')
    }
  }

  const handleResumeSchedule = async (scheduleId: string) => {
    try {
      const response = await fetch('/api/admin/scheduler', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: scheduleId, action: 'resume' })
      })
      
      const data = await response.json()
      
      if (data.success) {
        showSnackbar('Schedule resumed successfully')
        fetchSchedules()
      } else {
        showSnackbar(data.error || 'Failed to resume schedule', 'error')
      }
    } catch (error) {
      console.error('Error resuming schedule:', error)
      showSnackbar('Error resuming schedule', 'error')
    }
  }

  const getPendingSchedules = () => {
    return schedules.filter(s => s.status === 'pending')
  }

  const getExecutedSchedules = () => {
    return schedules.filter(s => s.status === 'executed')
  }

  const getFailedSchedules = () => {
    return schedules.filter(s => s.status === 'failed')
  }

  const getCancelledSchedules = () => {
    return schedules.filter(s => s.status === 'cancelled')
  }

  const getUpcomingSchedules = () => {
    return schedules
      .filter(s => s.status === 'pending' && new Date(s.scheduled_time) > new Date())
      .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime())
      .slice(0, 5)
  }

  const getOverdueSchedules = () => {
    return schedules
      .filter(s => s.status === 'pending' && new Date(s.scheduled_time) < new Date())
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const isOverdue = (schedule: ScheduleWithDetails) => {
    return schedule.status === 'pending' && new Date(schedule.scheduled_time) < new Date()
  }

  const getStatusColor = (status: ScheduleStatus) => {
    return SCHEDULE_STATUS[status]?.color || THEME_COLORS.grey
  }

  const getTypeColor = (type: ScheduleType) => {
    return SCHEDULE_TYPES[type]?.color || THEME_COLORS.primary
  }

  const renderScheduleCard = (schedule: ScheduleWithDetails) => {
    const statusConfig = SCHEDULE_STATUS[schedule.status]
    const typeConfig = SCHEDULE_TYPES[schedule.schedule_type]
    const overdue = isOverdue(schedule)

    return (
      <Card 
        key={schedule.id}
        sx={{ 
          mb: 2,
          border: overdue ? 2 : 1,
          borderColor: overdue ? 'error.main' : 'divider',
          '&:hover': {
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }
        }}
      >
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar 
              sx={{ 
                backgroundColor: `${typeConfig.color}20`,
                color: typeConfig.color,
                width: 48,
                height: 48
              }}
            >
              {typeConfig.icon}
            </Avatar>
            
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="h6">
                  {schedule.content_title || schedule.content_id}
                </Typography>
                <Chip
                  label={typeConfig.name}
                  size="small"
                  sx={{
                    backgroundColor: `${typeConfig.color}20`,
                    color: typeConfig.color
                  }}
                />
                {schedule.is_recurring && (
                  <Chip
                    icon={<Autorenew />}
                    label="반복"
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {schedule.content_type === 'section' ? '콘텐츠 섹션' : '콘텐츠 블록'}
              </Typography>
              
              <Stack direction="row" alignItems="center" spacing={3}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <AccessTime fontSize="small" color="action" />
                  <Typography variant="caption">
                    {formatDateTime(schedule.scheduled_time)}
                  </Typography>
                  {overdue && (
                    <Chip
                      label="지연"
                      size="small"
                      color="error"
                      variant="outlined"
                    />
                  )}
                </Stack>
                
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Badge
                    color={statusConfig.color as any}
                    variant="dot"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {statusConfig.name}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
            
            <Stack direction="row" spacing={1}>
              {schedule.status === 'pending' && (
                <Tooltip title="즉시 실행">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleExecuteSchedule(schedule.id)}
                  >
                    <PlayArrow />
                  </IconButton>
                </Tooltip>
              )}
              
              {schedule.status === 'pending' && (
                <Tooltip title="일시 중지">
                  <IconButton
                    size="small"
                    color="warning"
                    onClick={() => handlePauseSchedule(schedule.id)}
                  >
                    <Pause />
                  </IconButton>
                </Tooltip>
              )}
              
              <Tooltip title="편집">
                <IconButton
                  size="small"
                  onClick={() => handleEditSchedule(schedule)}
                >
                  <Edit />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="삭제">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteSchedule(schedule.id)}
                >
                  <Delete />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="세부 정보">
                <IconButton
                  size="small"
                  onClick={() => {
                    setSelectedSchedule(schedule)
                    setDetailsDialog(true)
                  }}
                >
                  <History />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
          
          {schedule.error_message && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="caption">
                {schedule.error_message}
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading content scheduler...
        </Typography>
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
                <Schedule sx={{ mr: 0.5 }} fontSize="inherit" />
                Content Scheduler
              </Typography>
            </Breadcrumbs>
            
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Box>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                  Advanced Content Scheduler
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Automate content publishing, updates, and lifecycle management
                </Typography>
              </Box>
              
              <Stack direction="row" spacing={2}>
                {getOverdueSchedules().length > 0 && (
                  <Alert severity="warning" sx={{ mr: 2 }}>
                    {getOverdueSchedules().length} schedule(s) are overdue
                  </Alert>
                )}
                <Button
                  variant="outlined"
                  startIcon={<History />}
                  sx={{ borderColor: THEME_COLORS.secondary, color: THEME_COLORS.secondary }}
                >
                  Execution History
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreateSchedule}
                  sx={{ 
                    background: `linear-gradient(45deg, ${THEME_COLORS.primary} 30%, ${THEME_COLORS.primary}BB 90%)`,
                    boxShadow: `0 3px 5px 2px ${THEME_COLORS.primary}33`,
                    '&:hover': {
                      background: `linear-gradient(45deg, ${THEME_COLORS.primary}DD 30%, ${THEME_COLORS.primary} 90%)`
                    }
                  }}
                >
                  Schedule Content
                </Button>
              </Stack>
            </Stack>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ 
                  p: 2, 
                  textAlign: 'center', 
                  background: `linear-gradient(135deg, ${THEME_COLORS.warning} 0%, ${THEME_COLORS.warning}CC 100%)`,
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <Badge 
                    badgeContent={getOverdueSchedules().length > 0 ? getOverdueSchedules().length : null}
                    color="error"
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                  />
                  <Pending sx={{ fontSize: 32, color: 'white', mb: 1, opacity: 0.8 }} />
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {getPendingSchedules().length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
                    Pending
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ 
                  p: 2, 
                  textAlign: 'center', 
                  background: `linear-gradient(135deg, ${THEME_COLORS.success} 0%, ${THEME_COLORS.success}CC 100%)`,
                  position: 'relative'
                }}>
                  <CheckCircle sx={{ fontSize: 32, color: 'white', mb: 1, opacity: 0.8 }} />
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {getExecutedSchedules().length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
                    Executed
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ 
                  p: 2, 
                  textAlign: 'center', 
                  background: `linear-gradient(135deg, ${THEME_COLORS.error} 0%, ${THEME_COLORS.error}CC 100%)`,
                  position: 'relative'
                }}>
                  <Error sx={{ fontSize: 32, color: 'white', mb: 1, opacity: 0.8 }} />
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {getFailedSchedules().length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
                    Failed
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ 
                  p: 2, 
                  textAlign: 'center', 
                  background: `linear-gradient(135deg, ${THEME_COLORS.tertiary} 0%, ${THEME_COLORS.tertiary}CC 100%)`,
                  position: 'relative'
                }}>
                  <Autorenew sx={{ fontSize: 32, color: 'white', mb: 1, opacity: 0.8 }} />
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {schedules.filter(s => s.is_recurring).length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
                    Recurring
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </motion.div>

        <Grid container spacing={3}>
          {/* Main Content */}
          <Grid item xs={12} lg={8}>
            {/* Search and Filters */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                <TextField
                  placeholder="Search schedules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ flex: 1, minWidth: 200 }}
                />
                
                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filterStatus}
                    label="Status"
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    {Object.entries(SCHEDULE_STATUS).map(([key, config]) => (
                      <MenuItem key={key} value={key}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {config.icon}
                          <span>{config.name}</span>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={filterType}
                    label="Type"
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    {Object.entries(SCHEDULE_TYPES).map(([key, config]) => (
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
            </Paper>

            {/* Schedules List */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                All Schedules ({filteredSchedules.length})
              </Typography>
              
              {filteredSchedules.length > 0 ? (
                filteredSchedules.map(schedule => renderScheduleCard(schedule))
              ) : (
                <Alert severity="info">
                  No schedules match your current filters.
                </Alert>
              )}
            </Paper>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} lg={4}>
            {/* Upcoming Schedules */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <NotificationImportant color="primary" />
                Upcoming
              </Typography>
              
              <List dense>
                {getUpcomingSchedules().map((schedule, index) => (
                  <ListItem key={schedule.id} divider={index < getUpcomingSchedules().length - 1}>
                    <ListItemAvatar>
                      <Avatar sx={{ 
                        backgroundColor: `${SCHEDULE_TYPES[schedule.schedule_type].color}20`,
                        color: SCHEDULE_TYPES[schedule.schedule_type].color,
                        width: 32,
                        height: 32
                      }}>
                        {SCHEDULE_TYPES[schedule.schedule_type].icon}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2" noWrap>
                          {schedule.content_title || schedule.content_id}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {formatDateTime(schedule.scheduled_time)}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
              
              {getUpcomingSchedules().length === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No upcoming schedules.
                </Alert>
              )}
            </Paper>

            {/* Quick Actions */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              
              <Stack spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  fullWidth
                  onClick={handleCreateSchedule}
                  sx={{ borderColor: THEME_COLORS.primary, color: THEME_COLORS.primary }}
                >
                  New Schedule
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PlayArrow />}
                  fullWidth
                  sx={{ borderColor: THEME_COLORS.success, color: THEME_COLORS.success }}
                  onClick={() => {
                    // Execute all pending schedules
                    getPendingSchedules().forEach(schedule => {
                      if (!isOverdue(schedule)) {
                        handleExecuteSchedule(schedule.id)
                      }
                    })
                  }}
                  disabled={getPendingSchedules().length === 0}
                >
                  Run Pending ({getPendingSchedules().length})
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<History />}
                  fullWidth
                  sx={{ borderColor: THEME_COLORS.secondary, color: THEME_COLORS.secondary }}
                >
                  View History
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CalendarMonth />}
                  fullWidth
                  sx={{ borderColor: THEME_COLORS.tertiary, color: THEME_COLORS.tertiary }}
                >
                  Calendar View
                </Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* Create Schedule Dialog */}
        <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Add />
              <Typography variant="h6">Schedule Content Action</Typography>
            </Stack>
          </DialogTitle>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Content Type</InputLabel>
                    <Select
                      value={formData.content_type}
                      label="Content Type"
                      onChange={(e) => setFormData(prev => ({ ...prev, content_type: e.target.value as any }))}
                    >
                      <MenuItem value="section">Content Section</MenuItem>
                      <MenuItem value="block">Content Block</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Content ID"
                    value={formData.content_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, content_id: e.target.value }))}
                    helperText="Enter the content ID to schedule"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Schedule Type</InputLabel>
                    <Select
                      value={formData.schedule_type}
                      label="Schedule Type"
                      onChange={(e) => setFormData(prev => ({ ...prev, schedule_type: e.target.value as any }))}
                    >
                      {Object.entries(SCHEDULE_TYPES).map(([key, config]) => (
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
                
                <Grid item xs={12} sm={6}>
                  <DateTimePicker
                    label="Scheduled Time"
                    value={formData.scheduled_time}
                    onChange={(newValue) => {
                      if (newValue) {
                        setFormData(prev => ({ ...prev, scheduled_time: newValue }))
                      }
                    }}
                    sx={{ width: '100%' }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Recurrence Rule (Optional)"
                    value={formData.recurrence_rule}
                    onChange={(e) => setFormData(prev => ({ ...prev, recurrence_rule: e.target.value }))}
                    helperText="RRULE format for recurring schedules (e.g., FREQ=DAILY;INTERVAL=1)"
                    multiline
                    rows={2}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button 
                onClick={() => setCreateDialog(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button 
                variant="contained" 
                onClick={handleSubmitSchedule}
                disabled={submitting || !formData.content_id || !formData.scheduled_time}
                sx={{
                  background: `linear-gradient(45deg, ${THEME_COLORS.primary} 30%, ${THEME_COLORS.primary}BB 90%)`,
                  '&:disabled': {
                    background: THEME_COLORS.grey
                  }
                }}
              >
                {submitting ? (
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                ) : (
                  <Add sx={{ mr: 1 }} />
                )}
                Create Schedule
              </Button>
            </DialogActions>
          </LocalizationProvider>
        </Dialog>

        {/* Edit Schedule Dialog */}
        <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Edit sx={{ color: THEME_COLORS.secondary }} />
              <Typography variant="h6">Edit Schedule</Typography>
            </Stack>
          </DialogTitle>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DialogContent sx={{ pt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Content Type</InputLabel>
                    <Select
                      value={formData.content_type}
                      label="Content Type"
                      onChange={(e) => setFormData(prev => ({ ...prev, content_type: e.target.value as any }))}
                    >
                      <MenuItem value="section">Content Section</MenuItem>
                      <MenuItem value="block">Content Block</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Content ID"
                    value={formData.content_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, content_id: e.target.value }))}
                    helperText="Enter the content ID to schedule"
                    required
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Schedule Type</InputLabel>
                    <Select
                      value={formData.schedule_type}
                      label="Schedule Type"
                      onChange={(e) => setFormData(prev => ({ ...prev, schedule_type: e.target.value as any }))}
                    >
                      {Object.entries(SCHEDULE_TYPES).map(([key, config]) => (
                        <MenuItem key={key} value={key}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Box sx={{ color: config.color }}>{config.icon}</Box>
                            <span>{config.name}</span>
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <DateTimePicker
                    label="Scheduled Time"
                    value={formData.scheduled_time}
                    onChange={(newValue) => {
                      if (newValue) {
                        setFormData(prev => ({ ...prev, scheduled_time: newValue }))
                      }
                    }}
                    minDateTime={new Date()}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        helperText: 'Schedule must be in the future'
                      }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Recurrence Rule (Optional)"
                    value={formData.recurrence_rule}
                    onChange={(e) => setFormData(prev => ({ ...prev, recurrence_rule: e.target.value }))}
                    helperText="RRULE format (e.g., FREQ=DAILY;INTERVAL=1, FREQ=WEEKLY;BYDAY=MO)"
                    placeholder="FREQ=DAILY;INTERVAL=1"
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button 
                onClick={() => setEditDialog(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button 
                variant="contained" 
                onClick={handleUpdateSchedule}
                disabled={submitting || !formData.content_id || !formData.scheduled_time}
                sx={{
                  background: `linear-gradient(45deg, ${THEME_COLORS.secondary} 30%, ${THEME_COLORS.secondary}BB 90%)`,
                  '&:disabled': {
                    background: THEME_COLORS.grey
                  }
                }}
              >
                {submitting ? (
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                ) : (
                  <Edit sx={{ mr: 1 }} />
                )}
                Update Schedule
              </Button>
            </DialogActions>
          </LocalizationProvider>
        </Dialog>

        {/* Schedule Details Dialog */}
        <Dialog open={detailsDialog} onClose={() => setDetailsDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={2}>
              <History sx={{ color: THEME_COLORS.tertiary }} />
              <Typography variant="h6">Schedule Details</Typography>
            </Stack>
          </DialogTitle>
          <DialogContent>
            {selectedSchedule && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {selectedSchedule.content_title || selectedSchedule.content_id}
                      </Typography>
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">Type:</Typography>
                          <Chip 
                            label={selectedSchedule.content_type === 'section' ? 'Section' : 'Block'}
                            size="small"
                          />
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">Action:</Typography>
                          <Chip 
                            icon={SCHEDULE_TYPES[selectedSchedule.schedule_type].icon}
                            label={SCHEDULE_TYPES[selectedSchedule.schedule_type].name}
                            size="small"
                            sx={{ backgroundColor: `${getTypeColor(selectedSchedule.schedule_type)}20` }}
                          />
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">Status:</Typography>
                          <Chip 
                            icon={SCHEDULE_STATUS[selectedSchedule.status].icon}
                            label={SCHEDULE_STATUS[selectedSchedule.status].name}
                            size="small"
                            sx={{ backgroundColor: `${getStatusColor(selectedSchedule.status)}20` }}
                          />
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">Scheduled:</Typography>
                          <Typography variant="body2">
                            {formatDateTime(selectedSchedule.scheduled_time)}
                          </Typography>
                        </Stack>
                        {selectedSchedule.executed_at && (
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">Executed:</Typography>
                            <Typography variant="body2">
                              {formatDateTime(selectedSchedule.executed_at)}
                            </Typography>
                          </Stack>
                        )}
                        {selectedSchedule.is_recurring && (
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">Recurrence:</Typography>
                            <Typography variant="body2" fontFamily="monospace">
                              {selectedSchedule.recurrence_rule}
                            </Typography>
                          </Stack>
                        )}
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">Attempts:</Typography>
                          <Typography variant="body2">
                            {selectedSchedule.execution_attempts || 0} / {selectedSchedule.max_retries}
                          </Typography>
                        </Stack>
                        {selectedSchedule.error_message && (
                          <Alert severity="error" sx={{ mt: 2 }}>
                            <Typography variant="body2">
                              {selectedSchedule.error_message}
                            </Typography>
                          </Alert>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsDialog(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </>
  )
}

export default function ContentSchedulerPage() {
  return (
    <AuthGuard requireAuth requireModerator>
      <ContentScheduler />
    </AuthGuard>
  )
}