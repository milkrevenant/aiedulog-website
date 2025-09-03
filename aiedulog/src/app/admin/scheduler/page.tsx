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
  ToggleButton,
  ToggleButtonGroup,
  Checkbox,
  FormControlLabel,
  Menu,
  Fade,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
} from '@mui/material'
import Grid from '@mui/material/Grid'
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
  ViewList,
  ViewModule,
  FilterList,
  Search,
  ClearAll,
  SelectAll,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  MoreVert,
  Save,
  Restore,
  Speed,
  CheckBoxOutlineBlank,
  CheckBox,
  KeyboardDoubleArrowLeft,
  KeyboardDoubleArrowRight,
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
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([])
  const [bulkActionMenu, setBulkActionMenu] = useState<null | HTMLElement>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    template_config: {}
  })
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month')
  
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

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay())
    
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }
    
    return days
  }

  const getSchedulesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.scheduled_time).toISOString().split('T')[0]
      return scheduleDate === dateStr
    })
  }

  const goToPreviousPeriod = () => {
    const newDate = new Date(calendarDate)
    if (calendarView === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setDate(newDate.getDate() - 7)
    }
    setCalendarDate(newDate)
  }

  const goToNextPeriod = () => {
    const newDate = new Date(calendarDate)
    if (calendarView === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else {
      newDate.setDate(newDate.getDate() + 7)
    }
    setCalendarDate(newDate)
  }

  const goToToday = () => {
    setCalendarDate(new Date())
  }

  // Bulk operations
  const handleSelectAll = () => {
    if (selectedSchedules.length === filteredSchedules.length) {
      setSelectedSchedules([])
    } else {
      setSelectedSchedules(filteredSchedules.map(s => s.id))
    }
  }

  const handleSelectSchedule = (scheduleId: string) => {
    setSelectedSchedules(prev => 
      prev.includes(scheduleId) 
        ? prev.filter(id => id !== scheduleId)
        : [...prev, scheduleId]
    )
  }

  const handleBulkAction = async (action: string) => {
    if (selectedSchedules.length === 0) return

    const promises = selectedSchedules.map(async (scheduleId) => {
      switch (action) {
        case 'execute':
          return handleExecuteSchedule(scheduleId)
        case 'pause':
          return handlePauseSchedule(scheduleId)
        case 'delete':
          return handleDeleteSchedule(scheduleId)
        default:
          return Promise.resolve()
      }
    })

    try {
      await Promise.all(promises)
      showSnackbar(`Bulk ${action} completed successfully`)
      setSelectedSchedules([])
      setBulkActionMenu(null)
      fetchSchedules()
    } catch (error) {
      showSnackbar(`Bulk ${action} failed`, 'error')
    }
  }

  // Template operations
  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/scheduler/templates')
      const data = await response.json()
      if (data.success) {
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }, [])

  const handleSaveTemplate = async () => {
    if (!templateData.name) {
      showSnackbar('Template name is required', 'error')
      return
    }

    try {
      const response = await fetch('/api/admin/scheduler/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateData.name,
          description: templateData.description,
          template_config: {
            schedule_type: formData.schedule_type,
            timezone: formData.timezone,
            recurrence_rule: formData.recurrence_rule,
            action_data: formData.action_data
          }
        })
      })

      const data = await response.json()
      if (data.success) {
        showSnackbar('Template saved successfully')
        setShowTemplateDialog(false)
        setTemplateData({ name: '', description: '', template_config: {} })
        fetchTemplates()
      } else {
        showSnackbar(data.error || 'Failed to save template', 'error')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      showSnackbar('Error saving template', 'error')
    }
  }

  const handleApplyTemplate = (template: any) => {
    const config = template.template_config
    setFormData(prev => ({
      ...prev,
      schedule_type: config.schedule_type || 'publish',
      timezone: config.timezone || 'Asia/Seoul',
      recurrence_rule: config.recurrence_rule || '',
      action_data: config.action_data || {}
    }))
    showSnackbar('Template applied successfully')
  }

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
    fetchTemplates()
  }, [fetchSchedules, fetchTemplates])

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
    const isSelected = selectedSchedules.includes(schedule.id)

    return (
      <Card 
        key={schedule.id}
        sx={{ 
          mb: 2,
          border: overdue ? 2 : 1,
          borderColor: overdue ? 'error.main' : isSelected ? 'primary.main' : 'divider',
          bgcolor: isSelected ? 'primary.50' : 'background.paper',
          '&:hover': {
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }
        }}
      >
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2}>
            {viewMode === 'list' && (
              <Checkbox
                checked={isSelected}
                onChange={() => handleSelectSchedule(schedule.id)}
              />
            )}
            
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

  // Calendar view renderers
  const renderMonthView = () => {
    const days = getDaysInMonth(calendarDate)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    return (
      <Box>
        {/* Day headers */}
        <Grid container sx={{ mb: 1 }}>
          {dayNames.map(day => (
            <Grid key={day} size="grow">
              <Typography variant="caption" sx={{ p: 1, textAlign: 'center', display: 'block', fontWeight: 'bold' }}>
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>
        {/* Calendar grid */}
        <Grid container sx={{ minHeight: '400px' }}>
          {days.map((day, index) => (
            <Grid key={index} size="grow">
              <Paper 
                variant="outlined" 
                sx={{ 
                  minHeight: 80, 
                  p: 1, 
                  cursor: day ? 'pointer' : 'default',
                  bgcolor: day ? 'background.paper' : 'grey.50',
                  '&:hover': {
                    bgcolor: day ? 'action.hover' : 'grey.50'
                  }
                }}
                onClick={() => {
                  if (day) {
                    const schedules = getSchedulesForDate(day)
                    if (schedules.length === 0) {
                      setFormData(prev => ({ ...prev, scheduled_time: day }))
                      handleCreateSchedule()
                    }
                  }
                }}
              >
                {day && (
                  <>
                    <Typography variant="caption" sx={{ fontWeight: day.toDateString() === new Date().toDateString() ? 'bold' : 'normal' }}>
                      {day.getDate()}
                    </Typography>
                    
                    {getSchedulesForDate(day).map((schedule) => {
                      const typeConfig = SCHEDULE_TYPES[schedule.schedule_type]
                      return (
                        <Chip
                          key={schedule.id}
                          label={schedule.content_title?.substring(0, 15) || schedule.content_id.substring(0, 15)}
                          size="small"
                          sx={{
                            display: 'block',
                            mt: 0.5,
                            maxWidth: '100%',
                            height: 'auto',
                            '& .MuiChip-label': {
                              fontSize: '0.65rem',
                              lineHeight: 1.2,
                              whiteSpace: 'normal',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            },
                            bgcolor: `${typeConfig.color}20`,
                            color: typeConfig.color,
                            cursor: 'pointer'
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedSchedule(schedule)
                            setDetailsDialog(true)
                          }}
                        />
                      )
                    })}
                  </>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  const renderWeekView = () => {
    const days = getWeekDays(calendarDate)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const hours = Array.from({ length: 24 }, (_, i) => i)

    return (
      <Box>
        {/* Week header */}
        <Grid container sx={{ mb: 2 }}>
          <Grid size={1}></Grid> {/* Time column spacer */}
          {days.map((day, index) => (
            <Grid key={day.toISOString()} size="grow">
              <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {dayNames[index]}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: day.toDateString() === new Date().toDateString() ? 'bold' : 'normal' }}>
                  {day.getDate()}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
        {/* Week grid */}
        <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
          {hours.map(hour => (
            <Grid container key={hour} sx={{ minHeight: 40, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Grid size={1}>
                <Typography variant="caption" sx={{ p: 1 }}>
                  {hour.toString().padStart(2, '0')}:00
                </Typography>
              </Grid>
              {days.map(day => {
                const daySchedules = getSchedulesForDate(day).filter(schedule => {
                  const scheduleHour = new Date(schedule.scheduled_time).getHours()
                  return scheduleHour === hour
                })
                
                return (
                  <Grid key={`${day.toISOString()}-${hour}`} size="grow">
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        minHeight: 38, 
                        p: 0.5, 
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'action.hover'
                        }
                      }}
                      onClick={() => {
                        const scheduledTime = new Date(day)
                        scheduledTime.setHours(hour, 0, 0, 0)
                        setFormData(prev => ({ ...prev, scheduled_time: scheduledTime }))
                        handleCreateSchedule()
                      }}
                    >
                      {daySchedules.map(schedule => {
                        const typeConfig = SCHEDULE_TYPES[schedule.schedule_type]
                        return (
                          <Chip
                            key={schedule.id}
                            label={schedule.content_title?.substring(0, 10) || schedule.content_id.substring(0, 10)}
                            size="small"
                            sx={{
                              fontSize: '0.6rem',
                              height: 20,
                              bgcolor: `${typeConfig.color}20`,
                              color: typeConfig.color
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedSchedule(schedule)
                              setDetailsDialog(true)
                            }}
                          />
                        )
                      })}
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          ))}
        </Box>
      </Box>
    );
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
              
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                {getOverdueSchedules().length > 0 && (
                  <Alert severity="warning" sx={{ mr: 2 }}>
                    {getOverdueSchedules().length} schedule(s) are overdue
                  </Alert>
                )}
                
                {/* View Toggle */}
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(e, newMode) => newMode && setViewMode(newMode)}
                  size="small"
                >
                  <ToggleButton value="list">
                    <ViewList />
                  </ToggleButton>
                  <ToggleButton value="calendar">
                    <ViewModule />
                  </ToggleButton>
                </ToggleButtonGroup>
                
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
              <Grid
                size={{
                  xs: 12,
                  sm: 3
                }}>
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
              <Grid
                size={{
                  xs: 12,
                  sm: 3
                }}>
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
              <Grid
                size={{
                  xs: 12,
                  sm: 3
                }}>
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
              <Grid
                size={{
                  xs: 12,
                  sm: 3
                }}>
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
          <Grid
            size={{
              xs: 12,
              lg: 8
            }}>
            {/* Bulk Actions Bar */}
            {selectedSchedules.length > 0 && viewMode === 'list' && (
              <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Typography variant="body2" color="primary.main">
                      {selectedSchedules.length} schedule(s) selected
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setSelectedSchedules([])}
                      startIcon={<ClearAll />}
                    >
                      Clear
                    </Button>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      onClick={(e) => setBulkActionMenu(e.currentTarget)}
                      startIcon={<MoreVert />}
                    >
                      Actions
                    </Button>
                    <Menu
                      anchorEl={bulkActionMenu}
                      open={Boolean(bulkActionMenu)}
                      onClose={() => setBulkActionMenu(null)}
                    >
                      <MenuItem onClick={() => handleBulkAction('execute')}>
                        <PlayArrow sx={{ mr: 1 }} /> Execute All
                      </MenuItem>
                      <MenuItem onClick={() => handleBulkAction('pause')}>
                        <Pause sx={{ mr: 1 }} /> Pause All
                      </MenuItem>
                      <MenuItem onClick={() => handleBulkAction('delete')}>
                        <Delete sx={{ mr: 1 }} /> Delete All
                      </MenuItem>
                    </Menu>
                  </Stack>
                </Stack>
              </Paper>
            )}
            {/* Search and Filters */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                <TextField
                  placeholder="Search schedules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
                  }}
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
                
                {viewMode === 'list' && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedSchedules.length === filteredSchedules.length && filteredSchedules.length > 0}
                        indeterminate={selectedSchedules.length > 0 && selectedSchedules.length < filteredSchedules.length}
                        onChange={handleSelectAll}
                      />
                    }
                    label="Select All"
                  />
                )}
              </Stack>
            </Paper>

            {/* Schedules Content */}
            <Paper sx={{ p: 3 }}>
              {viewMode === 'list' ? (
                <>
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
                </>
              ) : (
                <>
                  {/* Calendar Header */}
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Typography variant="h6">
                        {calendarView === 'month' 
                          ? calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                          : `Week of ${calendarDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        }
                      </Typography>
                      <ToggleButtonGroup
                        value={calendarView}
                        exclusive
                        onChange={(e, newView) => newView && setCalendarView(newView)}
                        size="small"
                      >
                        <ToggleButton value="month">Month</ToggleButton>
                        <ToggleButton value="week">Week</ToggleButton>
                      </ToggleButtonGroup>
                    </Stack>
                    
                    <Stack direction="row" spacing={1}>
                      <IconButton onClick={goToPreviousPeriod}>
                        <KeyboardArrowLeft />
                      </IconButton>
                      <Button onClick={goToToday} size="small">
                        Today
                      </Button>
                      <IconButton onClick={goToNextPeriod}>
                        <KeyboardArrowRight />
                      </IconButton>
                    </Stack>
                  </Stack>
                  
                  {/* Calendar Grid */}
                  {calendarView === 'month' ? renderMonthView() : renderWeekView()}
                </>
              )}
            </Paper>
          </Grid>

          {/* Sidebar */}
          <Grid
            size={{
              xs: 12,
              lg: 4
            }}>
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
                  startIcon={<Save />}
                  fullWidth
                  onClick={() => setShowTemplateDialog(true)}
                  sx={{ borderColor: THEME_COLORS.tertiary, color: THEME_COLORS.tertiary }}
                >
                  Save Template
                </Button>
                
                {templates.length > 0 && (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Quick Templates
                    </Typography>
                    <Stack spacing={1}>
                      {templates.slice(0, 3).map((template) => (
                        <Button
                          key={template.id}
                          variant="text"
                          size="small"
                          onClick={() => handleApplyTemplate(template)}
                          sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                        >
                          {template.name}
                        </Button>
                      ))}
                    </Stack>
                  </Paper>
                )}
                
                {/* Calendar Legend */}
                {viewMode === 'calendar' && (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Schedule Types
                    </Typography>
                    <Stack spacing={1}>
                      {Object.entries(SCHEDULE_TYPES).map(([key, config]) => (
                        <Stack key={key} direction="row" alignItems="center" spacing={1}>
                          <Box 
                            sx={{ 
                              width: 12, 
                              height: 12, 
                              borderRadius: 1, 
                              bgcolor: `${config.color}20`,
                              border: `1px solid ${config.color}`
                            }} 
                          />
                          <Typography variant="caption">
                            {config.name}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Paper>
                )}
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
                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
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
                
                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  <TextField
                    fullWidth
                    label="Content ID"
                    value={formData.content_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, content_id: e.target.value }))}
                    helperText="Enter the content ID to schedule"
                  />
                </Grid>
                
                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
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
                
                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
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
                
                <Grid size={12}>
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
                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
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
                
                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  <TextField
                    fullWidth
                    label="Content ID"
                    value={formData.content_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, content_id: e.target.value }))}
                    helperText="Enter the content ID to schedule"
                    required
                  />
                </Grid>
                
                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
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
                
                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
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
                
                <Grid size={12}>
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
                <Grid size={12}>
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

        {/* Template Save Dialog */}
        <Dialog open={showTemplateDialog} onClose={() => setShowTemplateDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Save sx={{ color: THEME_COLORS.tertiary }} />
              <Typography variant="h6">Save Schedule Template</Typography>
            </Stack>
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Template Name"
                value={templateData.name}
                onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
              <TextField
                fullWidth
                label="Description (Optional)"
                value={templateData.description}
                onChange={(e) => setTemplateData(prev => ({ ...prev, description: e.target.value }))}
                multiline
                rows={3}
              />
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Template Configuration
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">Schedule Type: {SCHEDULE_TYPES[formData.schedule_type].name}</Typography>
                  <Typography variant="body2">Timezone: {formData.timezone}</Typography>
                  {formData.recurrence_rule && (
                    <Typography variant="body2">Recurrence: {formData.recurrence_rule}</Typography>
                  )}
                </Stack>
              </Paper>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setShowTemplateDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSaveTemplate}
              disabled={!templateData.name}
              sx={{
                background: `linear-gradient(45deg, ${THEME_COLORS.tertiary} 30%, ${THEME_COLORS.tertiary}BB 90%)`
              }}
            >
              Save Template
            </Button>
          </DialogActions>
        </Dialog>

        {/* Speed Dial for Quick Actions */}
        <SpeedDial
          ariaLabel="Quick Actions"
          sx={{ 
            position: 'fixed', 
            bottom: 16, 
            right: 16,
            '& .MuiFab-primary': {
              background: `linear-gradient(45deg, ${THEME_COLORS.primary} 30%, ${THEME_COLORS.secondary} 90%)`
            }
          }}
          icon={<SpeedDialIcon />}
        >
          <SpeedDialAction
            icon={<Add />}
            tooltipTitle="New Schedule"
            onClick={handleCreateSchedule}
          />
          <SpeedDialAction
            icon={<PlayArrow />}
            tooltipTitle="Run All Pending"
            onClick={() => {
              getPendingSchedules().forEach(schedule => {
                if (!isOverdue(schedule)) {
                  handleExecuteSchedule(schedule.id)
                }
              })
            }}
          />
          <SpeedDialAction
            icon={<History />}
            tooltipTitle="View History"
            onClick={() => router.push('/admin/scheduler/history')}
          />
          <SpeedDialAction
            icon={<Save />}
            tooltipTitle="Save Template"
            onClick={() => setShowTemplateDialog(true)}
          />
        </SpeedDial>

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
  );
}

export default function ContentSchedulerPage() {
  return (
    <AuthGuard requireAuth requireModerator>
      <ContentScheduler />
    </AuthGuard>
  )
}