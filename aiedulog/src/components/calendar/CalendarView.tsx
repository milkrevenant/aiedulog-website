'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Badge,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Divider,
  Button,
} from '@mui/material'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay'
import { DayCalendarSkeleton } from '@mui/x-date-pickers/DayCalendarSkeleton'
import { Add, Edit, Delete } from '@mui/icons-material'
import { useSession } from 'next-auth/react'
import { format, isSameDay, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import EventDialog from './EventDialog'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  start_date: string // ISO string from API
  end_date?: string
  category: string
  is_public: boolean
  created_by_name?: string
}

function ServerDay(props: PickersDayProps & { highlightedDays?: number[] }) {
  const { highlightedDays = [], day, outsideCurrentMonth, ...other } = props
  const isSelected = !outsideCurrentMonth && highlightedDays.indexOf(props.day.getDate()) >= 0

  return (
    <Badge
      key={props.day.toString()}
      overlap="circular"
      badgeContent={isSelected ? '•' : undefined}
      color="primary"
      sx={{
        '& .MuiBadge-badge': {
          fontSize: '1.2rem',
          height: 'auto',
          minWidth: 'auto',
          padding: 0,
          right: '50%',
          top: '20%',
          transform: 'translateX(50%)',
        },
      }}
    >
      <PickersDay {...other} outsideCurrentMonth={outsideCurrentMonth} day={day} />
    </Badge>
  )
}

export default function CalendarView() {
  const { data: session } = useSession()
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<any | null>(null)

  // Permissions
  const userRoles = (session?.user as any)?.groups || []
  const canManage = userRoles.some((r: string) => ['admin', 'moderator', 'verified'].includes(r))

  const fetchEvents = async (monthDate: Date) => {
    setLoading(true)
    try {
      const start = startOfMonth(monthDate).toISOString()
      const end = endOfMonth(monthDate).toISOString()
      const res = await fetch(`/api/calendar?start=${start}&end=${end}`)
      if (res.ok) {
        const data = await res.json()
        setEvents(data)
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents(currentMonth)
  }, [currentMonth])

  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date)
    setLoading(true)
  }

  const handleSave = async (eventData: any) => {
    const method = eventData.id ? 'PUT' : 'POST'
    const url = eventData.id ? `/api/calendar/${eventData.id}` : '/api/calendar'

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      })

      if (res.ok) {
        // Refresh events
        fetchEvents(currentMonth)
      } else {
        alert('저장에 실패했습니다.')
      }
    } catch (e) {
      console.error(e)
      alert('오류가 발생했습니다.')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/calendar/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchEvents(currentMonth)
      } else {
        alert('삭제에 실패했습니다.')
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Get days with events for the badge
  const daysWithEvents = events.map((e) => parseISO(e.start_date).getDate())

  // Filter events for the selected date list view
  const selectedEvents = events.filter((e) => 
    selectedDate && isSameDay(parseISO(e.start_date), selectedDate)
  )

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'event': return '행사'
      case 'training': return '연수'
      case 'meeting': return '회의'
      case 'academic': return '학사'
      default: return '기타'
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, alignItems: 'stretch' }}>
      {/* Calendar Section */}
      <Paper sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom sx={{ px: 2, pt: 1 }}>
          월별 일정
        </Typography>
        <Box sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          '& .MuiDateCalendar-root': {
            width: '100%',
            maxWidth: 400,
            height: 'auto',
          },
          '& .MuiPickersCalendarHeader-root': {
            paddingLeft: 2,
            paddingRight: 2,
          },
          '& .MuiDayCalendar-weekContainer': {
            justifyContent: 'space-around',
          },
          '& .MuiPickersDay-root': {
            width: 40,
            height: 40,
            fontSize: '0.95rem',
          },
        }}>
          <DateCalendar
            value={selectedDate}
            onChange={(newValue) => setSelectedDate(newValue)}
            onMonthChange={handleMonthChange}
            loading={loading}
            renderLoading={() => <DayCalendarSkeleton />}
            slots={{
              day: ServerDay,
            }}
            slotProps={{
              day: {
                highlightedDays: daysWithEvents,
              } as any,
            }}
          />
        </Box>
        {canManage && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Button 
              variant="contained" 
              startIcon={<Add />}
              onClick={() => {
                setEditingEvent(null)
                setDialogOpen(true)
              }}
              fullWidth
            >
              새 일정 추가
            </Button>
          </Box>
        )}
      </Paper>

      {/* Event List Section */}
      <Paper sx={{ p: 3, flex: 1, minHeight: 400, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          {selectedDate ? format(selectedDate, 'yyyy년 MM월 dd일') : '날짜를 선택하세요'}
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {selectedEvents.length === 0 ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <Typography color="text.secondary">등록된 일정이 없습니다.</Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {selectedEvents.map((event) => {
               // Determine color based on category
               let categoryColor = 'grey'
               switch(event.category) {
                 case 'event': categoryColor = 'primary.main'; break;
                 case 'training': categoryColor = 'success.main'; break;
                 case 'meeting': categoryColor = 'info.main'; break;
                 case 'academic': categoryColor = 'warning.main'; break;
               }

               return (
              <Paper
                key={event.id}
                elevation={0}
                sx={{ 
                  mb: 2, 
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 2,
                    borderColor: categoryColor
                  }
                }}
              >
                <Box sx={{ display: 'flex' }}>
                   {/* Color Strip */}
                   <Box sx={{ width: 6, bgcolor: categoryColor }} />
                   
                   <Box sx={{ p: 2, flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Chip 
                              label={getCategoryLabel(event.category)} 
                              size="small" 
                              sx={{ 
                                bgcolor: `${categoryColor}20`, // low opacity
                                color: categoryColor,
                                fontWeight: 'bold',
                                height: 24
                              }}
                            />
                            {!event.is_public && <Chip label="비공개" size="small" variant="outlined" color="default" sx={{ height: 24 }} />}
                            <Typography variant="subtitle1" fontWeight="bold">
                              {event.title}
                            </Typography>
                         </Box>
                         {canManage && (
                           <IconButton 
                             size="small" 
                             onClick={(e) => {
                               e.stopPropagation();
                               setEditingEvent(event);
                               setDialogOpen(true);
                             }}
                             sx={{ mt: -0.5, mr: -0.5 }}
                           >
                             <Edit fontSize="small" />
                           </IconButton>
                         )}
                      </Box>
                      
                      {event.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                          {event.description}
                        </Typography>
                      )}

                      {event.created_by_name && (
                         <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                           작성자: {event.created_by_name}
                         </Typography>
                      )}
                   </Box>
                </Box>
              </Paper>
            )})}
          </List>
        )}
      </Paper>

      <EventDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
        initialEvent={editingEvent}
        selectedDate={selectedDate}
      />
    </Box>
  )
}
