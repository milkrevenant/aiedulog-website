'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  Tabs,
  Tab,
  Badge
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  Visibility,
  School,
  Event,
  People,
  LocationOn,
  AttachMoney,
  Upload,
  Close,
  Search,
  CheckCircle,
  Cancel,
  Schedule
} from '@mui/icons-material'
import { DatePicker, TimePicker } from '@mui/x-date-pickers'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import AuthGuard from '@/components/AuthGuard'

interface Lecture {
  id: string
  title: string
  subtitle: string
  description: string
  instructor_name: string
  instructor_bio: string
  instructor_image: string
  category: string
  level: string
  duration: string
  price: number
  max_participants: number
  current_participants: number
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  schedule_details: string
  location_type: string
  location_address: string
  location_url: string
  thumbnail_image: string
  banner_image: string
  status: string
  registration_open: boolean
  featured: boolean
  created_at: string
  view_count: number
  tags: string[]
}

interface LectureRegistration {
  id: string
  lecture_id: string
  user_id: string
  status: string
  registration_date: string
  payment_status: string
  notes: string
  profiles?: {
    name: string
    email: string
  }
}

export default function LecturesAdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [registrations, setRegistrations] = useState<LectureRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [openRegistrationsDialog, setOpenRegistrationsDialog] = useState(false)
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null)
  const [selectedLectureRegistrations, setSelectedLectureRegistrations] = useState<LectureRegistration[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [tabValue, setTabValue] = useState(0)
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    instructor_name: '',
    instructor_bio: '',
    instructor_image: '',
    category: 'workshop',
    level: 'beginner',
    duration: '',
    price: 0,
    max_participants: 30,
    start_date: null as Date | null,
    end_date: null as Date | null,
    start_time: null as Date | null,
    end_time: null as Date | null,
    schedule_details: '',
    location_type: 'offline',
    location_address: '',
    location_url: '',
    thumbnail_image: '',
    banner_image: '',
    status: 'draft',
    registration_open: true,
    featured: false,
    tags: [] as string[]
  })

  useEffect(() => {
    fetchLectures()
  }, [])

  const fetchLectures = async () => {
    try {
      const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setLectures(data || [])
    } catch (error) {
      console.error('Error fetching lectures:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRegistrations = async (lectureId: string) => {
    try {
      const { data, error } = await supabase
        .from('lecture_registrations')
        .select(`
          *,
          profiles:user_id (
            name,
            email
          )
        `)
        .eq('lecture_id', lectureId)
        .order('registration_date', { ascending: false })

      if (error) throw error
      setSelectedLectureRegistrations(data || [])
    } catch (error) {
      console.error('Error fetching registrations:', error)
    }
  }

  const handleSubmit = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      const lectureData = {
        ...formData,
        created_by: userData.user?.id,
        start_date: formData.start_date?.toISOString().split('T')[0],
        end_date: formData.end_date?.toISOString().split('T')[0],
        start_time: formData.start_time?.toTimeString().split(' ')[0],
        end_time: formData.end_time?.toTimeString().split(' ')[0]
      }

      if (selectedLecture) {
        const { error } = await supabase
          .from('lectures')
          .update(lectureData)
          .eq('id', selectedLecture.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('lectures')
          .insert([lectureData])

        if (error) throw error
      }

      setOpenDialog(false)
      fetchLectures()
      resetForm()
    } catch (error) {
      console.error('Error saving lecture:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 강의를 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('lectures')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchLectures()
    } catch (error) {
      console.error('Error deleting lecture:', error)
    }
  }

  const handleEdit = (lecture: Lecture) => {
    setSelectedLecture(lecture)
    setFormData({
      ...lecture,
      start_date: lecture.start_date ? new Date(lecture.start_date) : null,
      end_date: lecture.end_date ? new Date(lecture.end_date) : null,
      start_time: lecture.start_time ? new Date(`2000-01-01T${lecture.start_time}`) : null,
      end_time: lecture.end_time ? new Date(`2000-01-01T${lecture.end_time}`) : null
    })
    setOpenDialog(true)
  }

  const handleViewRegistrations = async (lecture: Lecture) => {
    setSelectedLecture(lecture)
    await fetchRegistrations(lecture.id)
    setOpenRegistrationsDialog(true)
  }

  const updateRegistrationStatus = async (registrationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('lecture_registrations')
        .update({ status: newStatus })
        .eq('id', registrationId)

      if (error) throw error
      if (selectedLecture) {
        fetchRegistrations(selectedLecture.id)
      }
    } catch (error) {
      console.error('Error updating registration:', error)
    }
  }

  const resetForm = () => {
    setSelectedLecture(null)
    setFormData({
      title: '',
      subtitle: '',
      description: '',
      instructor_name: '',
      instructor_bio: '',
      instructor_image: '',
      category: 'workshop',
      level: 'beginner',
      duration: '',
      price: 0,
      max_participants: 30,
      start_date: null,
      end_date: null,
      start_time: null,
      end_time: null,
      schedule_details: '',
      location_type: 'offline',
      location_address: '',
      location_url: '',
      thumbnail_image: '',
      banner_image: '',
      status: 'draft',
      registration_open: true,
      featured: false,
      tags: []
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'success'
      case 'draft': return 'default'
      case 'ongoing': return 'primary'
      case 'completed': return 'info'
      case 'cancelled': return 'error'
      default: return 'default'
    }
  }

  const getRegistrationStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success'
      case 'pending': return 'warning'
      case 'cancelled': return 'error'
      case 'attended': return 'info'
      default: return 'default'
    }
  }

  const filteredLectures = lectures.filter(lecture => {
    const matchesSearch = lecture.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lecture.instructor_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (tabValue === 0) return matchesSearch // 전체
    if (tabValue === 1) return matchesSearch && lecture.status === 'published'
    if (tabValue === 2) return matchesSearch && lecture.status === 'draft'
    if (tabValue === 3) return matchesSearch && lecture.status === 'ongoing'
    return matchesSearch
  })

  return (
    <AuthGuard requireAdmin>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Box sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4">
              <School sx={{ mr: 1, verticalAlign: 'middle' }} />
              강의 관리
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                resetForm()
                setOpenDialog(true)
              }}
            >
              새 강의 등록
            </Button>
          </Stack>

          <Paper sx={{ mb: 3, p: 2 }}>
            <Stack spacing={2}>
              <TextField
                placeholder="강의명 또는 강사명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
                fullWidth
              />

              <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                <Tab label={`전체 (${lectures.length})`} />
                <Tab 
                  label={
                    <Badge badgeContent={lectures.filter(l => l.status === 'published').length} color="success">
                      <span>게시됨</span>
                    </Badge>
                  } 
                />
                <Tab 
                  label={
                    <Badge badgeContent={lectures.filter(l => l.status === 'draft').length} color="default">
                      <span>초안</span>
                    </Badge>
                  } 
                />
                <Tab 
                  label={
                    <Badge badgeContent={lectures.filter(l => l.status === 'ongoing').length} color="primary">
                      <span>진행중</span>
                    </Badge>
                  } 
                />
              </Tabs>
            </Stack>
          </Paper>

          <Grid container spacing={3}>
            {filteredLectures.map((lecture) => (
              <Grid item xs={12} md={6} lg={4} key={lecture.id}>
                <Card>
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="h6" gutterBottom>
                            {lecture.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {lecture.subtitle}
                          </Typography>
                        </Box>
                        <Chip 
                          label={lecture.status} 
                          size="small" 
                          color={getStatusColor(lecture.status)}
                        />
                      </Stack>

                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip 
                          icon={<People />} 
                          label={`${lecture.current_participants}/${lecture.max_participants}명`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip 
                          icon={<Event />} 
                          label={new Date(lecture.start_date).toLocaleDateString()}
                          size="small"
                          variant="outlined"
                        />
                        {lecture.price > 0 && (
                          <Chip 
                            icon={<AttachMoney />} 
                            label={`${lecture.price.toLocaleString()}원`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Stack>

                      <Typography variant="body2">
                        강사: {lecture.instructor_name}
                      </Typography>

                      {lecture.featured && (
                        <Chip label="추천 강의" color="primary" size="small" />
                      )}
                    </Stack>
                  </CardContent>
                  <CardActions>
                    <IconButton onClick={() => handleEdit(lecture)} size="small">
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleViewRegistrations(lecture)} size="small">
                      <People />
                    </IconButton>
                    <IconButton 
                      onClick={() => router.push(`/board/lectures/${lecture.id}`)}
                      size="small"
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(lecture.id)} size="small" color="error">
                      <Delete />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* 강의 등록/수정 다이얼로그 */}
          <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
            <DialogTitle>
              {selectedLecture ? '강의 수정' : '새 강의 등록'}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <TextField
                    label="강의명"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="부제목"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="설명"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    fullWidth
                    multiline
                    rows={4}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="강사명"
                    value={formData.instructor_name}
                    onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="강사 소개"
                    value={formData.instructor_bio}
                    onChange={(e) => setFormData({ ...formData, instructor_bio: e.target.value })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>카테고리</InputLabel>
                    <Select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      label="카테고리"
                    >
                      <MenuItem value="ai">AI</MenuItem>
                      <MenuItem value="education">교육</MenuItem>
                      <MenuItem value="workshop">워크샵</MenuItem>
                      <MenuItem value="seminar">세미나</MenuItem>
                      <MenuItem value="certification">자격증</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>난이도</InputLabel>
                    <Select
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                      label="난이도"
                    >
                      <MenuItem value="beginner">초급</MenuItem>
                      <MenuItem value="intermediate">중급</MenuItem>
                      <MenuItem value="advanced">고급</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="기간"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    fullWidth
                    placeholder="예: 8주, 2개월"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="시작일"
                    value={formData.start_date}
                    onChange={(date) => setFormData({ ...formData, start_date: date })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="종료일"
                    value={formData.end_date}
                    onChange={(date) => setFormData({ ...formData, end_date: date })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TimePicker
                    label="시작 시간"
                    value={formData.start_time}
                    onChange={(time) => setFormData({ ...formData, start_time: time })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TimePicker
                    label="종료 시간"
                    value={formData.end_time}
                    onChange={(time) => setFormData({ ...formData, end_time: time })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="일정 상세"
                    value={formData.schedule_details}
                    onChange={(e) => setFormData({ ...formData, schedule_details: e.target.value })}
                    fullWidth
                    placeholder="예: 매주 화요일, 목요일"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>강의 형태</InputLabel>
                    <Select
                      value={formData.location_type}
                      onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
                      label="강의 형태"
                    >
                      <MenuItem value="offline">오프라인</MenuItem>
                      <MenuItem value="online">온라인</MenuItem>
                      <MenuItem value="hybrid">하이브리드</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="수강료"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="최대 인원"
                    type="number"
                    value={formData.max_participants}
                    onChange={(e) => setFormData({ ...formData, max_participants: Number(e.target.value) })}
                    fullWidth
                  />
                </Grid>
                {formData.location_type !== 'online' && (
                  <Grid item xs={12}>
                    <TextField
                      label="장소 주소"
                      value={formData.location_address}
                      onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                      fullWidth
                    />
                  </Grid>
                )}
                {formData.location_type !== 'offline' && (
                  <Grid item xs={12}>
                    <TextField
                      label="온라인 링크"
                      value={formData.location_url}
                      onChange={(e) => setFormData({ ...formData, location_url: e.target.value })}
                      fullWidth
                      placeholder="Zoom, Google Meet 등"
                    />
                  </Grid>
                )}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>상태</InputLabel>
                    <Select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      label="상태"
                    >
                      <MenuItem value="draft">초안</MenuItem>
                      <MenuItem value="published">게시됨</MenuItem>
                      <MenuItem value="ongoing">진행중</MenuItem>
                      <MenuItem value="completed">완료</MenuItem>
                      <MenuItem value="cancelled">취소됨</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.registration_open}
                        onChange={(e) => setFormData({ ...formData, registration_open: e.target.checked })}
                      />
                    }
                    label="등록 가능"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.featured}
                        onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                      />
                    }
                    label="추천 강의"
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDialog(false)}>취소</Button>
              <Button onClick={handleSubmit} variant="contained">
                {selectedLecture ? '수정' : '등록'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* 수강 신청자 목록 다이얼로그 */}
          <Dialog 
            open={openRegistrationsDialog} 
            onClose={() => setOpenRegistrationsDialog(false)} 
            maxWidth="lg" 
            fullWidth
          >
            <DialogTitle>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">
                  {selectedLecture?.title} - 수강 신청자 목록
                </Typography>
                <IconButton onClick={() => setOpenRegistrationsDialog(false)}>
                  <Close />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>이름</TableCell>
                      <TableCell>이메일</TableCell>
                      <TableCell>신청일</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell>결제</TableCell>
                      <TableCell>메모</TableCell>
                      <TableCell>관리</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedLectureRegistrations.map((reg) => (
                      <TableRow key={reg.id}>
                        <TableCell>{reg.profiles?.name}</TableCell>
                        <TableCell>{reg.profiles?.email}</TableCell>
                        <TableCell>
                          {new Date(reg.registration_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={reg.status} 
                            size="small"
                            color={getRegistrationStatusColor(reg.status)}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={reg.payment_status} 
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{reg.notes}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            {reg.status === 'pending' && (
                              <IconButton 
                                size="small" 
                                color="success"
                                onClick={() => updateRegistrationStatus(reg.id, 'confirmed')}
                              >
                                <CheckCircle />
                              </IconButton>
                            )}
                            {reg.status !== 'cancelled' && (
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => updateRegistrationStatus(reg.id, 'cancelled')}
                              >
                                <Cancel />
                              </IconButton>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
          </Dialog>
        </Box>
      </LocalizationProvider>
    </AuthGuard>
  )
}