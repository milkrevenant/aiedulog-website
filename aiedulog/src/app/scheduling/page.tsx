'use client'

import React, { useState, useEffect, Suspense } from 'react'
import {
  Box,
  Container,
  Typography,
  GridLegacy as Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  Stack,
  Chip,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Rating,
  Avatar,
  Skeleton
} from '@mui/material'
import {
  Search,
  CalendarToday,
  AccessTime,
  Star,
  Person,
  Filter,
  LocationOn,
  VideoCall,
  Phone
} from '@mui/icons-material'
import { useRouter, useSearchParams } from 'next/navigation'
import { InstructorProfile, AppointmentType, MeetingType } from '@/types/appointment-system'

interface SchedulingPageProps {
  instructors: InstructorProfile[]
  loading?: boolean
  error?: string
}

const SUBJECTS = [
  '전체',
  '수학',
  '과학',
  '영어',
  '국어',
  '사회',
  '컴퓨터',
  '기타'
]

const MEETING_TYPES = [
  { value: 'all', label: '전체', icon: null },
  { value: MeetingType.ONLINE, label: '온라인', icon: VideoCall },
  { value: MeetingType.OFFLINE, label: '오프라인', icon: LocationOn },
  { value: MeetingType.HYBRID, label: '하이브리드', icon: Phone }
]

function InstructorCard({ instructor }: { instructor: InstructorProfile }) {
  const router = useRouter()
  
  const handleBookAppointment = () => {
    router.push(`/scheduling/instructor/${instructor.id}`)
  }

  const availableTypes = instructor.appointment_types?.filter(type => type.is_active) || []
  const priceRange = availableTypes.length > 0 
    ? {
        min: Math.min(...availableTypes.map(t => t.price)),
        max: Math.max(...availableTypes.map(t => t.price))
      }
    : { min: 0, max: 0 }

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: (theme) => `0 8px 25px ${theme.palette.primary.main}20`,
        }
      }}
    >
      <Box sx={{ p: 3 }}>
        {/* Instructor Header */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Avatar
            src={instructor.profile_image_url}
            sx={{ width: 64, height: 64 }}
          >
            {instructor.full_name.charAt(0)}
          </Avatar>
          <Box flex={1}>
            <Typography variant="h6" fontWeight="bold">
              {instructor.full_name}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Rating 
                value={instructor.rating || 0} 
                readOnly 
                size="small" 
                precision={0.1}
              />
              <Typography variant="body2" color="text.secondary">
                ({instructor.total_appointments || 0}개 리뷰)
              </Typography>
            </Stack>
          </Box>
        </Stack>

        {/* Bio */}
        {instructor.bio && (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {instructor.bio}
          </Typography>
        )}

        {/* Specializations */}
        {instructor.specializations && instructor.specializations.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
            {instructor.specializations.slice(0, 3).map((spec, index) => (
              <Chip 
                key={index}
                label={spec}
                size="small"
                variant="outlined"
                color="primary"
              />
            ))}
            {instructor.specializations.length > 3 && (
              <Chip 
                label={`+${instructor.specializations.length - 3}개`}
                size="small"
                variant="outlined"
              />
            )}
          </Stack>
        )}

        {/* Service Types */}
        <Stack spacing={1} sx={{ mb: 2 }}>
          {availableTypes.slice(0, 2).map((type) => (
            <Stack key={type.id} direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">
                {type.type_name}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Chip 
                  label={`${type.duration_minutes}분`}
                  size="small"
                  color="info"
                />
                <Typography variant="body2" fontWeight="bold">
                  {type.price === 0 ? '무료' : `${type.price.toLocaleString()}원`}
                </Typography>
              </Stack>
            </Stack>
          ))}
          {availableTypes.length > 2 && (
            <Typography variant="body2" color="primary">
              +{availableTypes.length - 2}개 서비스 더보기
            </Typography>
          )}
        </Stack>

        {/* Price Range */}
        {priceRange.min !== priceRange.max && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            가격대: {priceRange.min === 0 ? '무료' : `${priceRange.min.toLocaleString()}원`} ~ {priceRange.max.toLocaleString()}원
          </Typography>
        )}
      </Box>

      {/* Action Button */}
      <Box sx={{ mt: 'auto', p: 2, pt: 0 }}>
        <Button
          variant="contained"
          fullWidth
          onClick={handleBookAppointment}
          startIcon={<CalendarToday />}
          size="large"
        >
          예약하기
        </Button>
      </Box>
    </Card>
  )
}

function InstructorCardSkeleton() {
  return (
    <Card sx={{ height: '100%' }}>
      <Box sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Skeleton variant="circular" width={64} height={64} />
          <Box flex={1}>
            <Skeleton variant="text" width="70%" height={32} />
            <Skeleton variant="text" width="50%" height={24} />
          </Box>
        </Stack>
        <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="80%" height={20} sx={{ mb: 2 }} />
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Skeleton variant="rounded" width={60} height={24} />
          <Skeleton variant="rounded" width={50} height={24} />
          <Skeleton variant="rounded" width={45} height={24} />
        </Stack>
        <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="70%" height={20} sx={{ mb: 2 }} />
      </Box>
      <Box sx={{ p: 2, pt: 0 }}>
        <Skeleton variant="rounded" width="100%" height={48} />
      </Box>
    </Card>
  )
}

function SchedulingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State
  const [instructors, setInstructors] = useState<InstructorProfile[]>([])
  const [filteredInstructors, setFilteredInstructors] = useState<InstructorProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('전체')
  const [meetingTypeFilter, setMeetingTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('rating')

  // Load instructors on mount
  useEffect(() => {
    loadInstructors()
  }, [])

  // Apply filters when data or filters change
  useEffect(() => {
    applyFilters()
  }, [instructors, searchTerm, subjectFilter, meetingTypeFilter, sortBy])

  const loadInstructors = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load instructor profiles with appointment types
      const response = await fetch('/api/appointment-types')
      const { data: appointmentTypes, error: apiError } = await response.json()
      
      if (apiError) {
        throw new Error(apiError)
      }

      // Group appointment types by instructor
      const instructorMap = new Map<string, InstructorProfile>()
      
      appointmentTypes?.forEach((type: AppointmentType & { instructor: any }) => {
        if (!type.instructor || !type.is_active) return
        
        const instructorId = type.instructor.id
        
        if (!instructorMap.has(instructorId)) {
          instructorMap.set(instructorId, {
            id: instructorId,
            full_name: type.instructor.full_name,
            email: type.instructor.email,
            profile_image_url: type.instructor.profile_image_url,
            bio: type.instructor.bio,
            specializations: [], // Will be derived from appointment types
            rating: Math.random() * 2 + 3, // Mock rating 3-5
            total_appointments: Math.floor(Math.random() * 100) + 10, // Mock total appointments
            appointment_types: []
          })
        }
        
        const instructor = instructorMap.get(instructorId)!
        instructor.appointment_types!.push(type)
      })

      // Convert map to array and add mock specializations
      const instructorList = Array.from(instructorMap.values()).map(instructor => ({
        ...instructor,
        specializations: instructor.appointment_types
          ?.map(type => type.type_name)
          .filter((value, index, self) => self.indexOf(value) === index)
          .slice(0, 4) || []
      }))

      setInstructors(instructorList)
      
    } catch (err) {
      console.error('Error loading instructors:', err)
      setError('강사 정보를 불러오는 데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...instructors]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(instructor =>
        instructor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instructor.bio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instructor.specializations?.some(spec => 
          spec.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    // Subject filter
    if (subjectFilter !== '전체') {
      filtered = filtered.filter(instructor =>
        instructor.specializations?.some(spec => 
          spec.includes(subjectFilter)
        )
      )
    }

    // Meeting type filter
    if (meetingTypeFilter !== 'all') {
      filtered = filtered.filter(instructor =>
        instructor.appointment_types?.some(type =>
          // For now, assume all instructors support all meeting types
          // In a real implementation, this would be based on instructor preferences
          true
        )
      )
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0)
        case 'appointments':
          return (b.total_appointments || 0) - (a.total_appointments || 0)
        case 'name':
          return a.full_name.localeCompare(b.full_name)
        default:
          return 0
      }
    })

    setFilteredInstructors(filtered)
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Hero Section */}
      <Box 
        sx={{ 
          bgcolor: 'primary.main',
          color: 'white',
          py: 8
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={3} alignItems="center" textAlign="center">
            <Typography variant="h2" fontWeight="bold">
              전문가와 함께하는 1:1 학습
            </Typography>
            <Typography variant="h6" sx={{ maxWidth: 600, opacity: 0.9 }}>
              경험 많은 강사진과 함께 개인 맞춤형 학습을 시작하세요.
              실시간 예약으로 원하는 시간에 바로 상담받을 수 있습니다.
            </Typography>
            <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Star sx={{ color: 'warning.main' }} />
                <Typography>평균 4.8점 만족도</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Person />
                <Typography>전문 강사진</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <AccessTime />
                <Typography>실시간 예약</Typography>
              </Stack>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Filters */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              {/* Search */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="강사명 또는 전문분야 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Subject Filter */}
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>과목</InputLabel>
                  <Select
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    label="과목"
                  >
                    {SUBJECTS.map((subject) => (
                      <MenuItem key={subject} value={subject}>
                        {subject}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Meeting Type Filter */}
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>수업 방식</InputLabel>
                  <Select
                    value={meetingTypeFilter}
                    onChange={(e) => setMeetingTypeFilter(e.target.value)}
                    label="수업 방식"
                  >
                    {MEETING_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Sort */}
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>정렬</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    label="정렬"
                  >
                    <MenuItem value="rating">평점순</MenuItem>
                    <MenuItem value="appointments">인기순</MenuItem>
                    <MenuItem value="name">이름순</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Results Count */}
              <Grid item xs={12} sm={6} md={2}>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  {loading ? '로딩 중...' : `${filteredInstructors.length}명의 강사`}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
            <Button 
              variant="text" 
              onClick={loadInstructors}
              sx={{ ml: 2 }}
            >
              다시 시도
            </Button>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Grid container spacing={3}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Grid item xs={12} sm={6} lg={4} key={index}>
                <InstructorCardSkeleton />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Instructors Grid */}
        {!loading && !error && (
          <>
            <Grid container spacing={3}>
              {filteredInstructors.map((instructor) => (
                <Grid item xs={12} sm={6} lg={4} key={instructor.id}>
                  <InstructorCard instructor={instructor} />
                </Grid>
              ))}
            </Grid>

            {/* Empty State */}
            {filteredInstructors.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  검색 조건에 맞는 강사를 찾을 수 없습니다
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  다른 검색어나 필터를 시도해보세요
                </Typography>
                <Button 
                  variant="outlined"
                  onClick={() => {
                    setSearchTerm('')
                    setSubjectFilter('전체')
                    setMeetingTypeFilter('all')
                  }}
                >
                  필터 초기화
                </Button>
              </Box>
            )}
          </>
        )}

        {/* CTA Section */}
        {!loading && !error && filteredInstructors.length > 0 && (
          <Box sx={{ textAlign: 'center', py: 6, mt: 4 }}>
            <Typography variant="h5" gutterBottom>
              아직 원하는 강사를 찾지 못하셨나요?
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              더 많은 강사와 서비스가 준비되어 있습니다
            </Typography>
            <Button 
              variant="outlined"
              size="large"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              다른 조건으로 검색하기
            </Button>
          </Box>
        )}
      </Container>
    </Box>
  )
}

export default function SchedulingPage() {
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    }>
      <SchedulingPageContent />
    </Suspense>
  )
}