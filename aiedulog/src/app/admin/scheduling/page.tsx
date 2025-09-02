'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  Avatar,
  Tab,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Alert,
  CircularProgress,
  GridLegacy as Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Badge,
  Switch,
  FormControlLabel,
  Divider,
  Menu,
  ListItemIcon,
  ListItemText,
  Breadcrumbs,
  Link
} from '@mui/material'
import {
  Dashboard,
  People,
  CalendarToday,
  Settings,
  Analytics,
  TrendingUp,
  Event,
  Schedule,
  Cancel,
  CheckCircle,
  MoreVert,
  Edit,
  Delete,
  Add,
  Visibility,
  GetApp,
  FilterList,
  Refresh,
  Search,
  PersonAdd,
  EventAvailable,
  AccessTime,
  AttachMoney,
  Group,
  Star,
  Warning,
  Info,
  PersonOff,
  VideoCall,
  LocationOn,
  Phone,
  Email,
  Notifications,
  Business,
  DateRange
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index} style={{ width: '100%' }}>
      {value === index && <Box>{children}</Box>}
    </div>
  )
}

// Mock data - replace with real API calls
const mockStats = {
  totalAppointments: 156,
  pendingAppointments: 12,
  confirmedAppointments: 89,
  completedAppointments: 45,
  cancelledAppointments: 10,
  totalRevenue: 2850000,
  monthlyRevenue: 850000,
  activeInstructors: 8,
  averageRating: 4.7,
  completionRate: 92.5
}

const mockAppointments = [
  {
    id: '1',
    title: 'AI 교육 상담',
    user: { id: '1', name: '김민수', email: 'kim@example.com' },
    instructor: { id: '1', name: '박준형', email: 'park@example.com' },
    date: '2025-09-05',
    time: '14:00',
    duration: 60,
    status: 'confirmed',
    meetingType: 'online',
    price: 50000
  },
  {
    id: '2',
    title: '프로그래밍 멘토링',
    user: { id: '2', name: '이영희', email: 'lee@example.com' },
    instructor: { id: '2', name: '최민경', email: 'choi@example.com' },
    date: '2025-09-05',
    time: '16:00',
    duration: 90,
    status: 'pending',
    meetingType: 'offline',
    price: 75000
  }
]

const mockInstructors = [
  {
    id: '1',
    name: '박준형',
    email: 'park@example.com',
    avatar: '',
    specializations: ['AI', '머신러닝'],
    rating: 4.8,
    totalAppointments: 45,
    completionRate: 95.5,
    revenue: 1200000,
    status: 'active'
  },
  {
    id: '2',
    name: '최민경',
    email: 'choi@example.com',
    avatar: '',
    specializations: ['웹개발', 'React'],
    rating: 4.6,
    totalAppointments: 38,
    completionRate: 89.5,
    revenue: 980000,
    status: 'active'
  }
]

function DashboardTab() {
  return (
    <Box>
      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'primary.light' }}>
                  <EventAvailable sx={{ color: 'white', fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {mockStats.totalAppointments}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    총 예약
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'success.light' }}>
                  <AttachMoney sx={{ color: 'white', fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {(mockStats.totalRevenue / 1000000).toFixed(1)}M
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    총 수익 (원)
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'info.light' }}>
                  <People sx={{ color: 'white', fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {mockStats.activeInstructors}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    활동 강사
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'warning.light' }}>
                  <Star sx={{ color: 'white', fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {mockStats.averageRating}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    평균 평점
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Status Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                예약 현황
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant="h5" fontWeight="bold">
                      {mockStats.confirmedAppointments}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      확정
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Schedule sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h5" fontWeight="bold">
                      {mockStats.pendingAppointments}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      대기
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Event sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                    <Typography variant="h5" fontWeight="bold">
                      {mockStats.completedAppointments}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      완료
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Cancel sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                    <Typography variant="h5" fontWeight="bold">
                      {mockStats.cancelledAppointments}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      취소
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                이번 달 성과
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">월 수익</Typography>
                    <Typography variant="h6" fontWeight="bold" color="success.main">
                      {(mockStats.monthlyRevenue / 1000000).toFixed(1)}M원
                    </Typography>
                  </Stack>
                </Box>
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">완료율</Typography>
                    <Typography variant="h6" fontWeight="bold" color="info.main">
                      {mockStats.completionRate}%
                    </Typography>
                  </Stack>
                </Box>
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">평균 평점</Typography>
                    <Typography variant="h6" fontWeight="bold" color="warning.main">
                      {mockStats.averageRating}★
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Appointments */}
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              최근 예약
            </Typography>
            <Button variant="outlined" size="small">
              전체 보기
            </Button>
          </Stack>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>예약 정보</TableCell>
                  <TableCell>학생</TableCell>
                  <TableCell>강사</TableCell>
                  <TableCell>일시</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>수익</TableCell>
                  <TableCell>작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockAppointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {appointment.title}
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {appointment.meetingType === 'online' && <VideoCall fontSize="small" />}
                          {appointment.meetingType === 'offline' && <LocationOn fontSize="small" />}
                          {appointment.meetingType === 'hybrid' && <Phone fontSize="small" />}
                          <Typography variant="caption" color="text.secondary">
                            {appointment.duration}분
                          </Typography>
                        </Stack>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {appointment.user.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="500">
                            {appointment.user.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {appointment.user.email}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {appointment.instructor.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="500">
                            {appointment.instructor.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {appointment.instructor.email}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="500">
                          {format(new Date(appointment.date), 'M월 d일 (E)', { locale: ko })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {appointment.time}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          appointment.status === 'confirmed' ? '확정' :
                          appointment.status === 'pending' ? '대기' :
                          appointment.status === 'cancelled' ? '취소' : '완료'
                        }
                        color={
                          appointment.status === 'confirmed' ? 'success' :
                          appointment.status === 'pending' ? 'warning' :
                          appointment.status === 'cancelled' ? 'error' : 'info'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {appointment.price.toLocaleString()}원
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small">
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  )
}

function InstructorsTab() {
  const [instructors, setInstructors] = useState(mockInstructors)

  return (
    <Box>
      <Stack direction="row" justifyContent="between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight="bold">
          강사 관리
        </Typography>
        <Button variant="contained" startIcon={<PersonAdd />}>
          강사 추가
        </Button>
      </Stack>

      <Grid container spacing={3}>
        {instructors.map((instructor) => (
          <Grid item xs={12} md={6} lg={4} key={instructor.id}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ width: 56, height: 56 }}>
                      {instructor.name.charAt(0)}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="h6" fontWeight="bold">
                        {instructor.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {instructor.email}
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                        <Star sx={{ fontSize: 16, color: 'warning.main' }} />
                        <Typography variant="body2">
                          {instructor.rating}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ({instructor.totalAppointments}개 리뷰)
                        </Typography>
                      </Stack>
                    </Box>
                    <Chip
                      label={instructor.status === 'active' ? '활동중' : '비활성'}
                      color={instructor.status === 'active' ? 'success' : 'error'}
                      size="small"
                    />
                  </Stack>

                  <Stack direction="row" spacing={1}>
                    {instructor.specializations.map((spec, index) => (
                      <Chip key={index} label={spec} size="small" variant="outlined" />
                    ))}
                  </Stack>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" fontWeight="bold" color="info.main">
                          {instructor.completionRate}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          완료율
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" fontWeight="bold" color="success.main">
                          {(instructor.revenue / 1000000).toFixed(1)}M
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          수익 (원)
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button size="small" startIcon={<DateRange />}>
                      일정 관리
                    </Button>
                    <Button size="small" startIcon={<Edit />}>
                      편집
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

function CalendarTab() {
  const [selectedDate, setSelectedDate] = useState(new Date())

  return (
    <Box>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        전체 캘린더
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                날짜 선택
              </Typography>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
                <DatePicker
                  value={selectedDate}
                  onChange={(newValue) => setSelectedDate(newValue || new Date())}
                  slotProps={{
                    textField: {
                      fullWidth: true
                    }
                  }}
                />
              </LocalizationProvider>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                선택된 날짜 요약
              </Typography>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="between">
                  <Typography variant="body2">총 예약</Typography>
                  <Typography variant="body2" fontWeight="bold">8개</Typography>
                </Stack>
                <Stack direction="row" justifyContent="between">
                  <Typography variant="body2">확정</Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">6개</Typography>
                </Stack>
                <Stack direction="row" justifyContent="between">
                  <Typography variant="body2">대기</Typography>
                  <Typography variant="body2" fontWeight="bold" color="warning.main">2개</Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                {format(selectedDate, 'yyyy년 M월 d일 (E)', { locale: ko })} 일정
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                캘린더 뷰 기능은 현재 개발 중입니다. 곧 출시될 예정입니다.
              </Alert>
              
              {/* TODO: Implement calendar component */}
              <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
                <Stack alignItems="center" spacing={2}>
                  <CalendarToday sx={{ fontSize: 64, color: 'text.secondary' }} />
                  <Typography variant="body1" color="text.secondary">
                    캘린더 뷰 준비 중
                  </Typography>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

function SettingsTab() {
  const [settings, setSettings] = useState({
    autoConfirm: false,
    allowCancellation: true,
    reminderEmail: true,
    maxAdvanceDays: 30,
    minCancellationHours: 24
  })

  return (
    <Box>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        시스템 설정
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                예약 설정
              </Typography>
              
              <Stack spacing={3}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.autoConfirm}
                      onChange={(e) => setSettings({...settings, autoConfirm: e.target.checked})}
                    />
                  }
                  label="자동 승인"
                />
                
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.allowCancellation}
                      onChange={(e) => setSettings({...settings, allowCancellation: e.target.checked})}
                    />
                  }
                  label="사용자 취소 허용"
                />
                
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.reminderEmail}
                      onChange={(e) => setSettings({...settings, reminderEmail: e.target.checked})}
                    />
                  }
                  label="리마인더 이메일"
                />
                
                <TextField
                  label="최대 예약 가능 일수"
                  type="number"
                  value={settings.maxAdvanceDays}
                  onChange={(e) => setSettings({...settings, maxAdvanceDays: parseInt(e.target.value)})}
                  InputProps={{ endAdornment: '일' }}
                />
                
                <TextField
                  label="최소 취소 시간"
                  type="number"
                  value={settings.minCancellationHours}
                  onChange={(e) => setSettings({...settings, minCancellationHours: parseInt(e.target.value)})}
                  InputProps={{ endAdornment: '시간' }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                알림 설정
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                알림 설정 기능은 현재 개발 중입니다.
              </Alert>
              
              <Stack spacing={2}>
                <Button variant="outlined" startIcon={<Email />} disabled>
                  이메일 템플릿 관리
                </Button>
                <Button variant="outlined" startIcon={<Notifications />} disabled>
                  푸시 알림 설정
                </Button>
                <Button variant="outlined" startIcon={<Settings />} disabled>
                  시스템 알림 설정
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

function AdminSchedulingContent() {
  const [currentTab, setCurrentTab] = useState(0)
  const router = useRouter()

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue)
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link color="inherit" href="/admin" sx={{ textDecoration: 'none' }}>
          관리자
        </Link>
        <Typography color="text.primary">일정 관리</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Stack direction="row" justifyContent="between" alignItems="center" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            일정 관리 시스템
          </Typography>
          <Typography variant="body1" color="text.secondary">
            예약, 강사, 일정을 종합적으로 관리하세요
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<GetApp />}>
            데이터 내보내기
          </Button>
          <Button variant="contained" startIcon={<Add />}>
            수동 예약
          </Button>
        </Stack>
      </Stack>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2 }}
        >
          <Tab icon={<Dashboard />} label="대시보드" iconPosition="start" />
          <Tab icon={<People />} label="강사 관리" iconPosition="start" />
          <Tab icon={<CalendarToday />} label="전체 캘린더" iconPosition="start" />
          <Tab icon={<Settings />} label="시스템 설정" iconPosition="start" />
        </Tabs>
      </Card>

      {/* Tab Content */}
      <TabPanel value={currentTab} index={0}>
        <DashboardTab />
      </TabPanel>
      
      <TabPanel value={currentTab} index={1}>
        <InstructorsTab />
      </TabPanel>
      
      <TabPanel value={currentTab} index={2}>
        <CalendarTab />
      </TabPanel>
      
      <TabPanel value={currentTab} index={3}>
        <SettingsTab />
      </TabPanel>
    </Container>
  )
}

export default function AdminSchedulingPage() {
  return (
    <AuthGuard requireAdmin={true}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
        <AdminSchedulingContent />
      </LocalizationProvider>
    </AuthGuard>
  )
}