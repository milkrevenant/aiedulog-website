'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Card,
  CardContent,
  TextField,
  Button,
  Stack,
  IconButton,
  Box,
  Avatar,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Alert,
  LinearProgress,
  Badge,
  CircularProgress,
  Tooltip,
} from '@mui/material'
import {
  Send,
  PhotoCamera,
  AttachFile,
  LocationOn,
  Close,
  Work,
  School,
  Event,
  Business,
  PersonSearch,
  Map,
  MyLocation,
  CloudUploadOutlined,
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useTheme, alpha } from '@mui/material/styles'
import dynamic from 'next/dynamic'

// 지도 컴포넌트는 클라이언트 사이드에서만 로드
const MapPicker = dynamic(() => import('./MapPicker'), {
  ssr: false,
  loading: () => <CircularProgress />,
})

interface PostEditorProps {
  user: User | null
  profile: any
  category: 'feed' | 'job' | 'lecture' | 'elementary' | 'middle' | 'high'
  subCategory?: string
  onPostCreated: () => void
  placeholder?: string
}

interface JobFields {
  jobType: 'hiring' | 'seeking'
  company?: string
  position?: string
  salary?: string
  location?: string
  experience?: string
  deadline?: Date | null
}

interface LectureFields {
  lectureTitle?: string
  instructor?: string
  startDate?: Date | null
  endDate?: Date | null
  startTime?: string
  endTime?: string
  location?: string
  maxParticipants?: number
  price?: number
  level?: 'beginner' | 'intermediate' | 'advanced'
}

export default function PostEditor({
  user,
  profile,
  category,
  subCategory,
  onPostCreated,
  placeholder = '무엇을 공유하고 싶으신가요?',
}: PostEditorProps) {
  const supabase = createClient()
  const theme = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // 기본 필드
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  // Job 관련 필드
  const [jobFields, setJobFields] = useState<JobFields>({
    jobType: (subCategory as 'hiring' | 'seeking') || 'hiring',
    company: '',
    position: '',
    salary: '',
    location: '',
    experience: '',
    deadline: null,
  })

  // Lecture 관련 필드
  const [lectureFields, setLectureFields] = useState<LectureFields>({
    lectureTitle: '',
    instructor: profile?.nickname || profile?.email?.split('@')[0] || '',
    startDate: null,
    endDate: null,
    startTime: '',
    endTime: '',
    location: '',
    maxParticipants: 30,
    price: 0,
    level: 'beginner',
  })

  // 추가 기능 다이얼로그
  const [showJobDialog, setShowJobDialog] = useState(false)
  const [showLectureDialog, setShowLectureDialog] = useState(false)
  const [showLocationDialog, setShowLocationDialog] = useState(false)
  const [locationText, setLocationText] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + selectedImages.length > 5) {
      alert('이미지는 최대 5개까지 업로드 가능합니다.')
      return
    }

    setSelectedImages((prev) => [...prev, ...files])

    // 미리보기 생성
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter((file) => {
      if (file.size > 50 * 1024 * 1024) {
        alert(`${file.name}은 50MB를 초과합니다.`)
        return false
      }
      return true
    })
    setSelectedFiles((prev) => [...prev, ...validFiles])
  }

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // 드래그앤드랍 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const target = e.target as HTMLElement
    if (target.closest('.drag-zone') && !e.relatedTarget) {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      const imageFiles: File[] = []
      const docFiles: File[] = []

      files.forEach((file) => {
        if (file.type.startsWith('image/')) {
          imageFiles.push(file)
        } else {
          if (file.size > 50 * 1024 * 1024) {
            alert(`${file.name}은 50MB를 초과합니다.`)
          } else {
            docFiles.push(file)
          }
        }
      })

      if (imageFiles.length > 0) {
        const remainingSlots = 5 - selectedImages.length
        const filesToAdd = imageFiles.slice(0, remainingSlots)

        if (imageFiles.length > remainingSlots) {
          alert(`이미지는 최대 5개까지 업로드 가능합니다. ${filesToAdd.length}개만 추가됩니다.`)
        }

        setSelectedImages((prev) => [...prev, ...filesToAdd])

        // 미리보기 생성
        filesToAdd.forEach((file) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            setImagePreviews((prev) => [...prev, reader.result as string])
          }
          reader.readAsDataURL(file)
        })
      }

      if (docFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...docFiles])
      }
    },
    [selectedImages.length]
  )

  const handleLocationInsert = () => {
    if (locationText.trim()) {
      setContent(
        (prev) => prev + (prev ? '\n\n📍 위치: ' + locationText : '📍 위치: ' + locationText)
      )
      setLocationText('')
      setShowLocationDialog(false)
    }
  }

  const uploadImages = async () => {
    const uploadedUrls: string[] = []

    for (const image of selectedImages) {
      const fileExt = image.name.split('.').pop()
      const fileName = `${user?.id}/${Date.now()}-${Math.random()}.${fileExt}`

      const { data, error } = await supabase.storage.from('post-images').upload(fileName, image)

      if (error) throw error

      const {
        data: { publicUrl },
      } = supabase.storage.from('post-images').getPublicUrl(fileName)

      uploadedUrls.push(publicUrl)
    }

    return uploadedUrls
  }

  const uploadFiles = async () => {
    const uploadedFiles: any[] = []

    for (const file of selectedFiles) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user?.id}/${Date.now()}-${Math.random()}.${fileExt}`

      const { data, error } = await supabase.storage.from('post-files').upload(fileName, file)

      if (error) throw error

      const {
        data: { publicUrl },
      } = supabase.storage.from('post-files').getPublicUrl(fileName)

      uploadedFiles.push({
        name: file.name,
        url: publicUrl,
        size: file.size,
        type: file.type,
      })
    }

    return uploadedFiles
  }

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || !user) return

    setLoading(true)

    try {
      // 이미지 업로드
      const imageUrls = selectedImages.length > 0 ? await uploadImages() : []

      // 파일 업로드
      const fileData = selectedFiles.length > 0 ? await uploadFiles() : []

      // 메타데이터 구성
      let metadata: any = {}

      if (category === 'job') {
        metadata = {
          ...jobFields,
          deadline: jobFields.deadline?.toISOString(),
        }
      } else if (category === 'lecture') {
        metadata = {
          ...lectureFields,
          startDate: lectureFields.startDate?.toISOString(),
          endDate: lectureFields.endDate?.toISOString(),
        }
      }

      // 게시글 작성
      const { data, error } = await supabase.from('posts').insert({
        title,
        content,
        author_id: user.id,
        category,
        sub_category: subCategory || (category === 'job' ? jobFields.jobType : null),
        is_published: true,
        images: imageUrls,
        files: fileData,
        metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      // 초기화
      setTitle('')
      setContent('')
      setSelectedImages([])
      setSelectedFiles([])
      setImagePreviews([])
      setJobFields({
        jobType: 'hiring',
        company: '',
        position: '',
        salary: '',
        location: '',
        experience: '',
        deadline: null,
      })
      setLectureFields({
        lectureTitle: '',
        instructor: profile?.nickname || '',
        startDate: null,
        endDate: null,
        startTime: '',
        endTime: '',
        location: '',
        maxParticipants: 30,
        price: 0,
        level: 'beginner',
      })

      // 부모 컴포넌트에 알림
      onPostCreated()
    } catch (error) {
      console.error('Error creating post:', error)
      alert('게시글 작성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <Card
        elevation={1}
        sx={{
          boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
        }}
      >
        <CardContent>
          <Alert severity="info">로그인 후 게시글을 작성할 수 있습니다.</Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card
        elevation={1}
        sx={{
          boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.12)',
          },
        }}
      >
        <CardContent>
          <Stack spacing={2}>
            {/* 프로필 및 카테고리 정보 */}
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar>{profile?.nickname?.[0] || user.email?.[0]}</Avatar>
              <Box flex={1}>
                <Typography variant="subtitle2">
                  {profile?.nickname || user.email?.split('@')[0]}
                </Typography>
                <Stack direction="row" spacing={1}>
                  {category === 'job' && (
                    <Chip
                      icon={jobFields.jobType === 'hiring' ? <Business /> : <PersonSearch />}
                      label={jobFields.jobType === 'hiring' ? '구인' : '구직'}
                      size="small"
                      color={jobFields.jobType === 'hiring' ? 'success' : 'warning'}
                    />
                  )}
                  {category === 'lecture' && (
                    <Chip icon={<School />} label="강의" size="small" color="primary" />
                  )}
                  <Chip
                    label={category === 'feed' ? '피드' : category}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              </Box>
            </Stack>

            {/* 제목 입력 */}
            <TextField
              fullWidth
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              variant="outlined"
            />

            {/* 본문 입력 - 드래그앤드랍 영역 포함 */}
            <Box
              className="drag-zone"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              sx={{
                position: 'relative',
                border: isDragging ? '2px dashed' : '1px solid',
                borderColor: isDragging ? 'primary.main' : 'divider',
                borderRadius: 1,
                bgcolor: isDragging ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                transition: 'all 0.2s ease',
              }}
            >
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder={placeholder}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: 'none',
                  },
                }}
              />

              {/* 드래그앤드랍 오버레이 */}
              {isDragging && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.background.paper, 0.9),
                    borderRadius: 1,
                    pointerEvents: 'none',
                    zIndex: 10,
                  }}
                >
                  <CloudUploadOutlined sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" color="primary">
                    파일을 여기에 놓으세요
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    이미지는 최대 5개, 파일은 최대 50MB
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Job 카테고리 추가 필드 */}
            {category === 'job' && (
              <Stack direction="row" spacing={1}>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <Select
                    value={jobFields.jobType}
                    onChange={(e) =>
                      setJobFields({
                        ...jobFields,
                        jobType: e.target.value as 'hiring' | 'seeking',
                      })
                    }
                  >
                    <MenuItem value="hiring">구인</MenuItem>
                    <MenuItem value="seeking">구직</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  size="small"
                  startIcon={<Work />}
                  onClick={() => setShowJobDialog(true)}
                  variant="outlined"
                >
                  상세 정보 추가
                </Button>
              </Stack>
            )}

            {/* Lecture 카테고리 추가 필드 */}
            {category === 'lecture' && (
              <Button
                size="small"
                startIcon={<Event />}
                onClick={() => setShowLectureDialog(true)}
                variant="outlined"
              >
                강의 정보 추가
              </Button>
            )}

            {/* 이미지 미리보기 */}
            {imagePreviews.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ overflowX: 'auto' }}>
                {imagePreviews.map((preview, index) => (
                  <Box key={index} position="relative">
                    <img
                      src={preview}
                      alt={`Preview ${index}`}
                      style={{ height: 100, borderRadius: 8 }}
                    />
                    <IconButton
                      size="small"
                      sx={{ position: 'absolute', top: -8, right: -8 }}
                      onClick={() => handleRemoveImage(index)}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}

            {/* 파일 목록 */}
            {selectedFiles.length > 0 && (
              <Stack spacing={1}>
                {selectedFiles.map((file, index) => (
                  <Stack key={index} direction="row" alignItems="center" spacing={1}>
                    <AttachFile fontSize="small" />
                    <Typography variant="body2" flex={1}>
                      {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
                    </Typography>
                    <IconButton size="small" onClick={() => handleRemoveFile(index)}>
                      <Close fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            )}

            {/* 드래그앤드랍 안내 */}
            <Box
              sx={{
                p: 1.5,
                bgcolor: alpha(theme.palette.info.main, 0.05),
                borderRadius: 1,
                border: 1,
                borderColor: alpha(theme.palette.info.main, 0.2),
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <CloudUploadOutlined fontSize="small" color="info" />
                <Typography variant="caption" color="text.secondary">
                  이미지나 파일을 드래그앤드롭하거나 아래 버튼을 사용하세요
                </Typography>
              </Stack>
            </Box>

            {/* 하단 액션 버튼 */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1}>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={handleImageSelect}
                />
                <IconButton
                  onClick={() => imageInputRef.current?.click()}
                  sx={{
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                >
                  <Badge badgeContent={selectedImages.length} color="primary">
                    <PhotoCamera />
                  </Badge>
                </IconButton>

                <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileSelect} />
                <IconButton
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                >
                  <Badge badgeContent={selectedFiles.length} color="primary">
                    <AttachFile />
                  </Badge>
                </IconButton>

                <IconButton
                  onClick={() => setShowLocationDialog(true)}
                  sx={{
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                >
                  <LocationOn />
                </IconButton>
              </Stack>

              <Button
                variant="contained"
                endIcon={<Send />}
                onClick={handleSubmit}
                disabled={!title.trim() || !content.trim() || loading}
              >
                {loading ? '게시중...' : '게시'}
              </Button>
            </Stack>

            {loading && <LinearProgress />}
          </Stack>
        </CardContent>
      </Card>

      {/* Job 상세 정보 다이얼로그 */}
      <Dialog open={showJobDialog} onClose={() => setShowJobDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>구인/구직 상세 정보</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                label={jobFields.jobType === 'hiring' ? '회사명' : '희망 회사'}
                fullWidth
                value={jobFields.company}
                onChange={(e) => setJobFields({ ...jobFields, company: e.target.value })}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label={jobFields.jobType === 'hiring' ? '채용 포지션' : '희망 포지션'}
                fullWidth
                value={jobFields.position}
                onChange={(e) => setJobFields({ ...jobFields, position: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="급여"
                fullWidth
                value={jobFields.salary}
                onChange={(e) => setJobFields({ ...jobFields, salary: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₩</InputAdornment>,
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="경력"
                fullWidth
                value={jobFields.experience}
                onChange={(e) => setJobFields({ ...jobFields, experience: e.target.value })}
                placeholder="예: 3년 이상"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="근무지"
                fullWidth
                value={jobFields.location}
                onChange={(e) => setJobFields({ ...jobFields, location: e.target.value })}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small">
                        <Map />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setShowJobDialog(false)}>확인</Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* 위치 삽입 다이얼로그 */}
      <Dialog
        open={showLocationDialog}
        onClose={() => setShowLocationDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <MyLocation color="primary" />
            <Typography>위치 정보 추가</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info" icon={<LocationOn />}>
              위치 정보를 입력하면 본문에 자동으로 추가됩니다.
            </Alert>
            <TextField
              fullWidth
              label="위치"
              placeholder="예: 서울특별시 강남구 테헤란로 123"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              multiline
              rows={2}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="지도에서 선택">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setShowMapPicker(true)
                        }}
                      >
                        <Map />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
            <Typography variant="caption" color="text.secondary">
              * 정확한 주소나 장소명을 입력해주세요.
            </Typography>
          </Stack>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button
              onClick={() => {
                setShowLocationDialog(false)
                setLocationText('')
              }}
            >
              취소
            </Button>
            <Button
              variant="contained"
              onClick={handleLocationInsert}
              disabled={!locationText.trim()}
            >
              위치 추가
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Lecture 상세 정보 다이얼로그 */}
      <Dialog
        open={showLectureDialog}
        onClose={() => setShowLectureDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>강의 정보</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                label="강의명"
                fullWidth
                value={lectureFields.lectureTitle}
                onChange={(e) =>
                  setLectureFields({ ...lectureFields, lectureTitle: e.target.value })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="강사명"
                fullWidth
                value={lectureFields.instructor}
                onChange={(e) => setLectureFields({ ...lectureFields, instructor: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>난이도</InputLabel>
                <Select
                  value={lectureFields.level}
                  onChange={(e) =>
                    setLectureFields({
                      ...lectureFields,
                      level: e.target.value as 'beginner' | 'intermediate' | 'advanced',
                    })
                  }
                  label="난이도"
                >
                  <MenuItem value="beginner">초급</MenuItem>
                  <MenuItem value="intermediate">중급</MenuItem>
                  <MenuItem value="advanced">고급</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="수강료"
                fullWidth
                type="number"
                value={lectureFields.price}
                onChange={(e) =>
                  setLectureFields({ ...lectureFields, price: Number(e.target.value) })
                }
                InputProps={{
                  startAdornment: <InputAdornment position="start">₩</InputAdornment>,
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="최대 인원"
                fullWidth
                type="number"
                value={lectureFields.maxParticipants}
                onChange={(e) =>
                  setLectureFields({ ...lectureFields, maxParticipants: Number(e.target.value) })
                }
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="장소"
                fullWidth
                value={lectureFields.location}
                onChange={(e) => setLectureFields({ ...lectureFields, location: e.target.value })}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small">
                        <Map />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setShowLectureDialog(false)}>확인</Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* 지도 선택 다이얼로그 */}
      <MapPicker
        open={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        initialAddress={locationText}
        onSelectLocation={(address, lat, lng) => {
          setLocationText(address)
          setShowMapPicker(false)
        }}
      />
    </>
  )
}
