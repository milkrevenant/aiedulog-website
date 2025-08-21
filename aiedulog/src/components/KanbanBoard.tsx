'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Stack,
  Card,
  CardContent,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  AvatarGroup,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material'
import {
  Add,
  MoreVert,
  Edit,
  Delete,
  DragIndicator,
  Person,
  CalendarToday,
  Flag,
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: 'low' | 'medium' | 'high'
  assignees: string[]
  due_date?: string
  position: number
  created_at: string
  assignee_profiles?: Array<{
    id: string
    nickname?: string
    email: string
    avatar_url?: string
  }>
}

interface Column {
  id: string
  title: string
  color: string
}

const COLUMNS: Column[] = [
  { id: 'todo', title: 'To Do 📝', color: '#9e9e9e' },
  { id: 'in_progress', title: 'In Progress 🚀', color: '#2196f3' },
  { id: 'review', title: 'Review 👀', color: '#ff9800' },
  { id: 'done', title: 'Done ✅', color: '#4caf50' },
]

const PRIORITY_COLORS = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336',
}

export default function KanbanBoard({ boardId }: { boardId: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null)
  const [taskDialog, setTaskDialog] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    due_date: '',
  })
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null)
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchTasks()
    setupRealtimeSubscription()
  }, [boardId])

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('collaboration_tasks')
      .select(`
        *,
        assignee_profiles:profiles!collaboration_tasks_assignees_fkey(
          id,
          nickname,
          email,
          avatar_url
        )
      `)
      .eq('board_id', boardId)
      .order('position')

    if (data) {
      setTasks(data)
    }
    setLoading(false)
  }

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`kanban-${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collaboration_tasks',
          filter: `board_id=eq.${boardId}`,
        },
        () => {
          fetchTasks()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDraggedOverColumn(columnId)
  }

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    setDraggedOverColumn(null)

    if (!draggedTask || draggedTask.status === newStatus) {
      setDraggedTask(null)
      return
    }

    // 낙관적 업데이트
    setTasks((prev) =>
      prev.map((task) =>
        task.id === draggedTask.id ? { ...task, status: newStatus } : task
      )
    )

    // DB 업데이트
    await supabase
      .from('collaboration_tasks')
      .update({ status: newStatus })
      .eq('id', draggedTask.id)

    setDraggedTask(null)
  }

  const handleCreateTask = async () => {
    console.log('Creating task with boardId:', boardId)
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error('No user authenticated')
      alert('로그인이 필요합니다.')
      return
    }

    const { data, error } = await supabase
      .from('collaboration_tasks')
      .insert({
        board_id: boardId,
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
        status: 'todo',
        position: tasks.filter((t) => t.status === 'todo').length,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating task:', error)
      alert(`태스크 생성 실패: ${error.message}`)
      return
    }

    if (data) {
      console.log('Task created successfully:', data)
      await fetchTasks()
      setTaskDialog(false)
      setTaskForm({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
      })
    }
  }

  const handleUpdateTask = async () => {
    if (!editingTask) return

    await supabase
      .from('collaboration_tasks')
      .update({
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
      })
      .eq('id', editingTask.id)

    await fetchTasks()
    setTaskDialog(false)
    setEditingTask(null)
    setTaskForm({
      title: '',
      description: '',
      priority: 'medium',
      due_date: '',
    })
  }

  const handleDeleteTask = async (taskOrId: Task | string) => {
    const taskId = typeof taskOrId === 'string' ? taskOrId : taskOrId.id
    
    const { error } = await supabase
      .from('collaboration_tasks')
      .delete()
      .eq('id', taskId)
    
    if (error) {
      console.error('Error deleting task:', error)
      alert(`태스크 삭제 실패: ${error.message}`)
      return
    }
    
    await fetchTasks()
    setAnchorEl(null)
    setSelectedTask(null)
  }

  const openTaskDialog = (task?: Task) => {
    if (task) {
      setEditingTask(task)
      setTaskForm({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        due_date: task.due_date || '',
      })
    } else {
      setEditingTask(null)
      setTaskForm({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
      })
    }
    setTaskDialog(true)
    setAnchorEl(null)
  }

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status)
  }

  return (
    <Box sx={{ 
      p: 2, 
      height: '100%', 
      width: '100%',
      overflow: 'hidden',
      bgcolor: 'background.default'
    }}>
      <Stack 
        direction="row" 
        spacing={2} 
        sx={{ 
          height: '100%', 
          overflowX: 'auto',
          overflowY: 'hidden',
          pb: 2,
          '&::-webkit-scrollbar': {
            height: '10px',
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'grey.200',
            borderRadius: '5px',
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'grey.400',
            borderRadius: '5px',
            '&:hover': {
              bgcolor: 'grey.500',
            },
          },
        }}>
        {COLUMNS.map((column) => (
          <Paper
            key={column.id}
            sx={{
              minWidth: 300,
              maxWidth: 300,
              bgcolor: 'grey.50',
              display: 'flex',
              flexDirection: 'column',
              borderTop: 3,
              borderColor: column.color,
              ...(draggedOverColumn === column.id && {
                bgcolor: 'action.hover',
              }),
            }}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* 컬럼 헤더 */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {column.title}
                  </Typography>
                  <Chip
                    label={getTasksByStatus(column.id).length}
                    size="small"
                    sx={{ bgcolor: column.color, color: 'white' }}
                  />
                </Stack>
                <Stack direction="row" spacing={0.5}>
                  {column.id === 'todo' && (
                    <IconButton size="small" onClick={() => openTaskDialog()}>
                      <Add />
                    </IconButton>
                  )}
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      setColumnMenuAnchor(e.currentTarget)
                      setSelectedColumn(column.id)
                    }}
                  >
                    <MoreVert fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Box>

            {/* 태스크 목록 */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
              <Stack spacing={1}>
                {getTasksByStatus(column.id).map((task) => (
                  <Card
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    sx={{
                      cursor: 'move',
                      '&:hover': {
                        boxShadow: 2,
                      },
                      opacity: draggedTask?.id === task.id ? 0.5 : 1,
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Stack spacing={1}>
                        {/* 태스크 헤더 */}
                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                          <Typography variant="body2" fontWeight="medium" sx={{ flex: 1 }}>
                            {task.title}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              setAnchorEl(e.currentTarget)
                              setSelectedTask(task)
                            }}
                          >
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </Stack>

                        {/* 설명 */}
                        {task.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {task.description}
                          </Typography>
                        )}

                        {/* 메타 정보 */}
                        <Stack direction="row" spacing={1} alignItems="center">
                          {/* 우선순위 */}
                          <Chip
                            label={task.priority}
                            size="small"
                            sx={{
                              bgcolor: PRIORITY_COLORS[task.priority],
                              color: 'white',
                              fontSize: '0.7rem',
                              height: 20,
                            }}
                          />

                          {/* 마감일 */}
                          {task.due_date && (
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {new Date(task.due_date).toLocaleDateString('ko-KR', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </Typography>
                            </Stack>
                          )}
                        </Stack>

                        {/* 담당자 */}
                        {task.assignee_profiles && task.assignee_profiles.length > 0 && (
                          <AvatarGroup max={3} sx={{ justifyContent: 'flex-start' }}>
                            {task.assignee_profiles.map((assignee) => (
                              <Avatar
                                key={assignee.id}
                                src={assignee.avatar_url || undefined}
                                sx={{ width: 24, height: 24 }}
                              >
                                {assignee.nickname?.[0] || assignee.email[0]}
                              </Avatar>
                            ))}
                          </AvatarGroup>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          </Paper>
        ))}
      </Stack>

      {/* 태스크 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => openTaskDialog(selectedTask!)}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          수정
        </MenuItem>
        <MenuItem onClick={() => selectedTask && handleDeleteTask(selectedTask.id)}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          삭제
        </MenuItem>
      </Menu>

      {/* 태스크 생성/수정 다이얼로그 */}
      <Dialog open={taskDialog} onClose={() => setTaskDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTask ? '태스크 수정' : '새 태스크'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="제목"
              fullWidth
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            />
            <TextField
              label="설명"
              fullWidth
              multiline
              rows={3}
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
            />
            <TextField
              label="우선순위"
              select
              fullWidth
              value={taskForm.priority}
              onChange={(e) =>
                setTaskForm({
                  ...taskForm,
                  priority: e.target.value as 'low' | 'medium' | 'high',
                })
              }
            >
              <MenuItem value="low">낮음</MenuItem>
              <MenuItem value="medium">보통</MenuItem>
              <MenuItem value="high">높음</MenuItem>
            </TextField>
            <TextField
              label="마감일"
              type="date"
              fullWidth
              value={taskForm.due_date}
              onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskDialog(false)}>취소</Button>
          <Button
            variant="contained"
            onClick={editingTask ? handleUpdateTask : handleCreateTask}
            disabled={!taskForm.title}
          >
            {editingTask ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 컬럼 메뉴 */}
      <Menu
        anchorEl={columnMenuAnchor}
        open={Boolean(columnMenuAnchor)}
        onClose={() => setColumnMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          // Clear all tasks in this column
          if (confirm(`정말로 ${selectedColumn} 컬럼의 모든 태스크를 삭제하시겠습니까?`)) {
            tasks
              .filter(task => task.status === selectedColumn)
              .forEach(task => handleDeleteTask(task))
          }
          setColumnMenuAnchor(null)
        }}>
          <Delete sx={{ mr: 1 }} fontSize="small" />
          모든 태스크 삭제
        </MenuItem>
        <MenuItem onClick={() => {
          // Sort tasks by priority
          const columnTasks = tasks.filter(t => t.status === selectedColumn)
          const sortedTasks = [...columnTasks].sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 }
            return priorityOrder[a.priority] - priorityOrder[b.priority]
          })
          // Update positions
          sortedTasks.forEach((task, index) => {
            supabase
              .from('collaboration_tasks')
              .update({ position: index })
              .eq('id', task.id)
              .then(() => fetchTasks())
          })
          setColumnMenuAnchor(null)
        }}>
          <Flag sx={{ mr: 1 }} fontSize="small" />
          우선순위로 정렬
        </MenuItem>
        <MenuItem onClick={() => {
          // Export column tasks
          const columnTasks = tasks.filter(t => t.status === selectedColumn)
          const exportData = columnTasks.map(t => ({
            title: t.title,
            description: t.description,
            priority: t.priority,
            due_date: t.due_date
          }))
          console.log('Export data:', exportData)
          alert('태스크 목록이 콘솔에 출력되었습니다.')
          setColumnMenuAnchor(null)
        }}>
          <Edit sx={{ mr: 1 }} fontSize="small" />
          목록 내보내기
        </MenuItem>
      </Menu>
    </Box>
  )
}