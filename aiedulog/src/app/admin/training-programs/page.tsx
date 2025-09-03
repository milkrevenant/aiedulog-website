'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  
  Card,
  CardContent,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  Stack,
  Alert,
  Fab,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Divider,
  CardMedia,
  CardActions,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarMonth as CalendarIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  AttachMoney as MoneyIcon,
  Link as LinkIcon,
  Description as DescriptionIcon,
  School as SchoolIcon,
} from '@mui/icons-material'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import { ko } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { usePermission } from '@/hooks/usePermission'
import AuthGuard from '@/components/AuthGuard'

interface TrainingProgram {
  id: string
  title: string
  subtitle?: string
  description?: string
  training_date: string
  start_time?: string
  end_time?: string
  duration_hours?: number
  location?: string
  online_link?: string
  instructor_name: string
  instructor_title?: string
  instructor_bio?: string
  instructor_image?: string
  program_content?: any
  materials_link?: string
  max_participants?: number
  current_participants: number
  registration_deadline?: string
  fee: number
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

export default function TrainingProgramsPage() {
  const router = useRouter()
  const { can } = usePermission()
  const supabase = createClient()
  const [programs, setPrograms] = useState<TrainingProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null)
  const [editingProgram, setEditingProgram] = useState<Partial<TrainingProgram>>({
    title: '',
    subtitle: '',
    description: '',
    training_date: new Date().toISOString(),
    location: '',
    online_link: '',
    instructor_name: '',
    instructor_title: '',
    instructor_bio: '',
    instructor_image: '',
    materials_link: '',
    max_participants: 30,
    fee: 0,
    status: 'scheduled',
    duration_hours: 2,
  })

  useEffect(() => {
    fetchPrograms()
  }, [])

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('training_programs')
        .select('*')
        .order('training_date', { ascending: true })

      if (error) throw error
      setPrograms(data || [])
    } catch (error) {
      console.error('연수 프로그램 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingProgram({
      title: '',
      subtitle: '',
      description: '',
      training_date: new Date().toISOString(),
      location: '',
      online_link: '',
      instructor_name: '',
      instructor_title: '',
      instructor_bio: '',
      instructor_image: '',
      materials_link: '',
      max_participants: 30,
      fee: 0,
      status: 'scheduled',
      duration_hours: 2,
    })
    setSelectedProgram(null)
    setDialogOpen(true)
  }

  const handleEdit = (program: TrainingProgram) => {
    setEditingProgram(program)
    setSelectedProgram(program)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedProgram) return

    try {
      const { error } = await supabase
        .from('training_programs')
        .delete()
        .eq('id', selectedProgram.id)

      if (error) throw error
      await fetchPrograms()
      setDeleteDialogOpen(false)
      setSelectedProgram(null)
    } catch (error) {
      console.error('프로그램 삭제 실패:', error)
    }
  }

  const handleSave = async () => {
    try {
      if (selectedProgram) {
        // 수정
        const { error } = await supabase
          .from('training_programs')
          .update(editingProgram)
          .eq('id', selectedProgram.id)

        if (error) throw error
      } else {
        // 추가
        const { error } = await supabase.from('training_programs').insert([editingProgram])

        if (error) throw error
      }

      await fetchPrograms()
      setDialogOpen(false)
      setEditingProgram({})
      setSelectedProgram(null)
    } catch (error) {
      console.error('프로그램 저장 실패:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'primary'
      case 'ongoing':
        return 'success'
      case 'completed':
        return 'default'
      case 'cancelled':
        return 'error'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '예정'
      case 'ongoing':
        return '진행중'
      case 'completed':
        return '완료'
      case 'cancelled':
        return '취소'
      default:
        return status
    }
  }

  return (
    <AuthGuard requireAdmin>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* 헤더 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            연수 프로그램 관리
          </Typography>
          <Typography variant="body2" color="text.secondary">
            전남에듀테크교육연구회 연수 프로그램을 관리합니다
          </Typography>
        </Box>

        {/* 프로그램 그리드 */}
        <Grid container spacing={3}>
          <Grid
            size={{
              xs: 12,
              lg: 8
            }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">프로그램 목록</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
                프로그램 추가
              </Button>
            </Box>

            <Grid container spacing={2}>
              {programs.map((program) => (
                <Grid
                  key={program.id}
                  size={{
                    xs: 12,
                    md: 6
                  }}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" gutterBottom>
                          {program.title}
                        </Typography>
                        <Chip
                          label={getStatusLabel(program.status)}
                          color={getStatusColor(program.status)}
                          size="small"
                        />
                      </Box>

                      {program.subtitle && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {program.subtitle}
                        </Typography>
                      )}

                      <Stack spacing={1} sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {new Date(program.training_date).toLocaleDateString('ko-KR')}
                          </Typography>
                        </Box>

                        {program.start_time && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TimeIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              {program.start_time}
                              {program.end_time && ` - ${program.end_time}`}
                              {program.duration_hours && ` (${program.duration_hours}시간)`}
                            </Typography>
                          </Box>
                        )}

                        {program.location && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocationIcon fontSize="small" color="action" />
                            <Typography variant="body2">{program.location}</Typography>
                          </Box>
                        )}

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonIcon fontSize="small" color="action" />
                          <Typography variant="body2">강사: {program.instructor_name}</Typography>
                        </Box>

                        {program.max_participants && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <GroupIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              참가자: {program.current_participants}/{program.max_participants}명
                            </Typography>
                          </Box>
                        )}

                        {program.fee > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MoneyIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              참가비: {program.fee.toLocaleString()}원
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>

                    <CardActions>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleEdit(program)}
                      >
                        수정
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => {
                          setSelectedProgram(program)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        삭제
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}

              {programs.length === 0 && !loading && (
                <Grid size={12}>
                  <Alert severity="info">등록된 연수 프로그램이 없습니다</Alert>
                </Grid>
              )}
            </Grid>
          </Grid>

          {/* 강사 프로필 섹션 */}
          <Grid
            size={{
              xs: 12,
              lg: 4
            }}>
            <Typography variant="h6" gutterBottom>
              강사 프로필
            </Typography>

            {programs
              .filter((p) => p.instructor_image || p.instructor_bio)
              .slice(0, 3)
              .map((program) => (
                <Card key={program.id} sx={{ mb: 2 }}>
                  {program.instructor_image && (
                    <CardMedia
                      component="img"
                      height="200"
                      image={program.instructor_image}
                      alt={program.instructor_name}
                    />
                  )}
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ width: 56, height: 56 }}>
                        <SchoolIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6">{program.instructor_name}</Typography>
                        {program.instructor_title && (
                          <Typography variant="body2" color="text.secondary">
                            {program.instructor_title}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {program.instructor_bio && (
                      <Typography variant="body2" color="text.secondary">
                        {program.instructor_bio}
                      </Typography>
                    )}

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle2" gutterBottom>
                      담당 프로그램
                    </Typography>
                    <Typography variant="body2" color="primary">
                      {program.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(program.training_date).toLocaleDateString('ko-KR')}
                    </Typography>
                  </CardContent>
                </Card>
              ))}

            {programs.filter((p) => p.instructor_image || p.instructor_bio).length === 0 && (
              <Alert severity="info">강사 프로필이 등록된 프로그램이 없습니다</Alert>
            )}
          </Grid>
        </Grid>

        {/* 프로그램 추가/수정 다이얼로그 */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>{selectedProgram ? '연수 프로그램 수정' : '연수 프로그램 추가'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="프로그램 제목"
                fullWidth
                value={editingProgram.title || ''}
                onChange={(e) => setEditingProgram({ ...editingProgram, title: e.target.value })}
                required
              />

              <TextField
                label="부제목"
                fullWidth
                value={editingProgram.subtitle || ''}
                onChange={(e) => setEditingProgram({ ...editingProgram, subtitle: e.target.value })}
              />

              <TextField
                label="설명"
                fullWidth
                multiline
                rows={3}
                value={editingProgram.description || ''}
                onChange={(e) =>
                  setEditingProgram({ ...editingProgram, description: e.target.value })
                }
              />

              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
                <DatePicker
                  label="연수 날짜"
                  value={
                    editingProgram.training_date ? new Date(editingProgram.training_date) : null
                  }
                  onChange={(date) => {
                    if (date) {
                      setEditingProgram({ ...editingProgram, training_date: date.toISOString() })
                    }
                  }}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>

              <Grid container spacing={2}>
                <Grid size={4}>
                  <TextField
                    label="시작 시간"
                    fullWidth
                    value={editingProgram.start_time || ''}
                    onChange={(e) =>
                      setEditingProgram({ ...editingProgram, start_time: e.target.value })
                    }
                    placeholder="14:00"
                  />
                </Grid>
                <Grid size={4}>
                  <TextField
                    label="종료 시간"
                    fullWidth
                    value={editingProgram.end_time || ''}
                    onChange={(e) =>
                      setEditingProgram({ ...editingProgram, end_time: e.target.value })
                    }
                    placeholder="16:00"
                  />
                </Grid>
                <Grid size={4}>
                  <TextField
                    label="연수 시간"
                    type="number"
                    fullWidth
                    value={editingProgram.duration_hours || ''}
                    onChange={(e) =>
                      setEditingProgram({
                        ...editingProgram,
                        duration_hours: parseInt(e.target.value),
                      })
                    }
                  />
                </Grid>
              </Grid>

              <TextField
                label="장소"
                fullWidth
                value={editingProgram.location || ''}
                onChange={(e) => setEditingProgram({ ...editingProgram, location: e.target.value })}
              />

              <TextField
                label="온라인 링크"
                fullWidth
                value={editingProgram.online_link || ''}
                onChange={(e) =>
                  setEditingProgram({ ...editingProgram, online_link: e.target.value })
                }
              />

              <Divider />

              <Typography variant="subtitle1">강사 정보</Typography>

              <TextField
                label="강사 이름"
                fullWidth
                value={editingProgram.instructor_name || ''}
                onChange={(e) =>
                  setEditingProgram({ ...editingProgram, instructor_name: e.target.value })
                }
                required
              />

              <TextField
                label="강사 직함"
                fullWidth
                value={editingProgram.instructor_title || ''}
                onChange={(e) =>
                  setEditingProgram({ ...editingProgram, instructor_title: e.target.value })
                }
              />

              <TextField
                label="강사 소개"
                fullWidth
                multiline
                rows={3}
                value={editingProgram.instructor_bio || ''}
                onChange={(e) =>
                  setEditingProgram({ ...editingProgram, instructor_bio: e.target.value })
                }
              />

              <TextField
                label="강사 사진 URL"
                fullWidth
                value={editingProgram.instructor_image || ''}
                onChange={(e) =>
                  setEditingProgram({ ...editingProgram, instructor_image: e.target.value })
                }
              />

              <Divider />

              <TextField
                label="자료 링크"
                fullWidth
                value={editingProgram.materials_link || ''}
                onChange={(e) =>
                  setEditingProgram({ ...editingProgram, materials_link: e.target.value })
                }
              />

              <Grid container spacing={2}>
                <Grid size={6}>
                  <TextField
                    label="최대 참가자"
                    type="number"
                    fullWidth
                    value={editingProgram.max_participants || ''}
                    onChange={(e) =>
                      setEditingProgram({
                        ...editingProgram,
                        max_participants: parseInt(e.target.value),
                      })
                    }
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    label="참가비 (원)"
                    type="number"
                    fullWidth
                    value={editingProgram.fee || 0}
                    onChange={(e) =>
                      setEditingProgram({ ...editingProgram, fee: parseInt(e.target.value) })
                    }
                  />
                </Grid>
              </Grid>

              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  value={editingProgram.status || 'scheduled'}
                  onChange={(e) =>
                    setEditingProgram({ ...editingProgram, status: e.target.value as any })
                  }
                  label="상태"
                >
                  <MenuItem value="scheduled">예정</MenuItem>
                  <MenuItem value="ongoing">진행중</MenuItem>
                  <MenuItem value="completed">완료</MenuItem>
                  <MenuItem value="cancelled">취소</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave} variant="contained">
              {selectedProgram ? '수정' : '추가'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 삭제 확인 다이얼로그 */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>프로그램 삭제</DialogTitle>
          <DialogContent>
            <Typography>"{selectedProgram?.title}" 프로그램을 삭제하시겠습니까?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
            <Button onClick={handleDelete} color="error">
              삭제
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </AuthGuard>
  );
}
