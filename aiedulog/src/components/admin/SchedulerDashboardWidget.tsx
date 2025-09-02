'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  IconButton,
  Stack,
  Alert,
  CircularProgress,
  Box,
  Button,
  Tooltip
} from '@mui/material'
import {
  Schedule,
  PlayArrow,
  Edit,
  Error,
  CheckCircle,
  Pending,
  AccessTime,
  TrendingUp,
  CalendarMonth,
  Autorenew
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import type { ContentSchedule, ScheduleType, ScheduleStatus } from '@/types/content-management'

interface ScheduleWithDetails extends ContentSchedule {
  content_title?: string
  next_run_time?: string
  is_recurring?: boolean
  execution_attempts?: number
}

const THEME_COLORS = {
  primary: '#2E86AB',
  secondary: '#A23B72',
  tertiary: '#E6800F',
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  grey: '#9e9e9e'
}

const SCHEDULE_TYPES = {
  publish: {
    name: 'Publish',
    icon: <CheckCircle />,
    color: THEME_COLORS.success
  },
  unpublish: {
    name: 'Unpublish',
    icon: <Pending />,
    color: THEME_COLORS.warning
  },
  archive: {
    name: 'Archive',
    icon: <Autorenew />,
    color: THEME_COLORS.grey
  },
  update: {
    name: 'Update',
    icon: <TrendingUp />,
    color: THEME_COLORS.primary
  }
}

const SCHEDULE_STATUS = {
  pending: {
    name: 'Pending',
    icon: <Pending />,
    color: THEME_COLORS.warning
  },
  executed: {
    name: 'Executed',
    icon: <CheckCircle />,
    color: THEME_COLORS.success
  },
  failed: {
    name: 'Failed',
    icon: <Error />,
    color: THEME_COLORS.error
  },
  cancelled: {
    name: 'Cancelled',
    icon: <Error />,
    color: THEME_COLORS.grey
  }
}

interface SchedulerDashboardWidgetProps {
  maxItems?: number
  showActions?: boolean
}

export default function SchedulerDashboardWidget({ 
  maxItems = 5, 
  showActions = true 
}: SchedulerDashboardWidgetProps) {
  const [schedules, setSchedules] = useState<ScheduleWithDetails[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const fetchSchedules = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/scheduler?status=pending&limit=10')
      const data = await response.json()

      if (data.success) {
        const schedulesWithDetails = data.schedules.map((schedule: any) => ({
          ...schedule,
          content_title: schedule.sections?.title?.en || schedule.blocks?.content?.title?.en || schedule.content_id,
          is_recurring: Boolean(schedule.recurrence_rule),
          execution_attempts: schedule.execution_attempts || 0
        }))
        
        // Get upcoming schedules
        const upcoming = schedulesWithDetails
          .filter((s: any) => s.status === 'pending' && new Date(s.scheduled_time) > new Date())
          .sort((a: any, b: any) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime())
          .slice(0, maxItems)
        
        setSchedules(upcoming)
        setStats(data.stats || {})
        setError(null)
      } else {
        setError('Failed to fetch schedules')
      }
    } catch (error) {
      console.error('Error fetching schedules:', error)
      setError('Error loading scheduler data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSchedules()
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchSchedules, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const handleExecuteSchedule = async (scheduleId: string) => {
    try {
      const response = await fetch('/api/admin/scheduler', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: scheduleId, action: 'execute' })
      })
      
      if (response.ok) {
        fetchSchedules() // Refresh the list
      }
    } catch (error) {
      console.error('Error executing schedule:', error)
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`
    } else if (diffHours > 0) {
      return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`
    } else if (diffMs > 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return `in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`
    } else {
      return 'overdue'
    }
  }

  const getOverdueCount = () => {
    return schedules.filter(s => new Date(s.scheduled_time) < new Date()).length
  }

  if (loading) {
    return (
      <Card>
        <CardHeader 
          title="Content Scheduler"
          avatar={<Schedule />}
        />
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader 
          title="Content Scheduler"
          avatar={<Schedule />}
        />
        <CardContent>
          <Alert severity="error">
            {error}
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader 
        title="Upcoming Schedules"
        avatar={<Schedule />}
        action={
          <Stack direction="row" spacing={1}>
            {getOverdueCount() > 0 && (
              <Chip
                label={`${getOverdueCount()} overdue`}
                color="error"
                size="small"
              />
            )}
            <Button
              size="small"
              onClick={() => router.push('/admin/scheduler')}
              startIcon={<CalendarMonth />}
            >
              View All
            </Button>
          </Stack>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        {schedules.length === 0 ? (
          <Alert severity="info">
            No upcoming schedules found.
          </Alert>
        ) : (
          <List dense>
            {schedules.map((schedule, index) => {
              const typeConfig = SCHEDULE_TYPES[schedule.schedule_type]
              const isOverdue = new Date(schedule.scheduled_time) < new Date()

              return (
                <ListItem
                  key={schedule.id}
                  divider={index < schedules.length - 1}
                  sx={{
                    bgcolor: isOverdue ? 'error.50' : 'transparent',
                    borderRadius: 1,
                    mb: index < schedules.length - 1 ? 1 : 0
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        backgroundColor: `${typeConfig.color}20`,
                        color: typeConfig.color,
                        width: 32,
                        height: 32
                      }}
                    >
                      {typeConfig.icon}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body2" noWrap>
                          {schedule.content_title || schedule.content_id}
                        </Typography>
                        {schedule.is_recurring && (
                          <Autorenew fontSize="small" color="action" />
                        )}
                      </Stack>
                    }
                    secondary={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <AccessTime fontSize="small" />
                        <Typography variant="caption" color={isOverdue ? 'error' : 'text.secondary'}>
                          {formatDateTime(schedule.scheduled_time)}
                        </Typography>
                        <Chip
                          label={typeConfig.name}
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: '0.6rem',
                            bgcolor: `${typeConfig.color}20`,
                            color: typeConfig.color
                          }}
                        />
                      </Stack>
                    }
                  />
                  
                  {showActions && (
                    <ListItemSecondaryAction>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Execute Now">
                          <IconButton
                            size="small"
                            onClick={() => handleExecuteSchedule(schedule.id)}
                            disabled={isOverdue}
                          >
                            <PlayArrow fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => router.push(`/admin/scheduler?schedule=${schedule.id}`)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              )
            })}
          </List>
        )}
      </CardContent>
    </Card>
  )
}