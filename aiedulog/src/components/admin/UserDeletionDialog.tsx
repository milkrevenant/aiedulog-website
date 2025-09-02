'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
} from '@mui/material'
import {
  Warning as WarningIcon,
  Delete as DeleteIcon,
  Visibility as SoftDeleteIcon,
  Article as ArticleIcon,
  Comment as CommentIcon,
  Assignment as AssignmentIcon,
  CloudUpload as FileIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'

interface AdminUser {
  id: string
  identity_id: string
  email: string
  username: string
  nickname: string | null
  full_name: string | null
  role: string
  is_active: boolean
  created_at: string
}

interface UserStats {
  posts: number
  comments: number
  lectures_registered: number
  file_uploads: number
}

interface UserDeletionDialogProps {
  open: boolean
  user: AdminUser | null
  onClose: () => void
  onDeleted: () => void
}

export default function UserDeletionDialog({ 
  open, 
  user, 
  onClose, 
  onDeleted 
}: UserDeletionDialogProps) {
  const [deletionType, setDeletionType] = useState<'soft' | 'hard'>('soft')
  const [reason, setReason] = useState('')
  const [contentAction, setContentAction] = useState<'preserve' | 'anonymize' | 'delete'>('preserve')
  const [loading, setLoading] = useState(false)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  const supabase = createClient()

  // Fetch user content statistics when dialog opens
  React.useEffect(() => {
    if (open && user) {
      fetchUserStats()
    }
  }, [open, user])

  const fetchUserStats = async () => {
    if (!user) return
    
    setStatsLoading(true)
    setStatsError(null)
    
    try {
      console.log('Fetching stats for user:', user.identity_id)
      
      // Use Promise.allSettled for better error handling
      const results = await Promise.allSettled([
        supabase.from('posts').select('id', { count: 'exact' }).eq('author_id', user.identity_id),
        supabase.from('comments').select('id', { count: 'exact' }).eq('author_id', user.identity_id),
        // Handle both identity_id and legacy user_id for lecture registrations
        Promise.allSettled([
          supabase.from('lecture_registrations').select('id', { count: 'exact' }).eq('identity_id', user.identity_id),
          supabase.from('lecture_registrations').select('id', { count: 'exact' }).eq('user_id', user.id)
        ]).then(([identityResult, userResult]) => {
          const identityCount = identityResult.status === 'fulfilled' ? identityResult.value.count || 0 : 0
          const userCount = userResult.status === 'fulfilled' ? userResult.value.count || 0 : 0
          return { count: Math.max(identityCount, userCount), error: null }
        }),
        // Handle file_uploads with fallback to resources table
        Promise.allSettled([
          supabase.from('file_uploads').select('id', { count: 'exact' }).eq('uploaded_by', user.identity_id),
          supabase.from('resources').select('id', { count: 'exact' }).eq('uploader_id', user.identity_id),
        ]).then(([uploadsResult, resourcesResult]) => {
          const uploadsCount = uploadsResult.status === 'fulfilled' ? uploadsResult.value.count || 0 : 0
          const resourcesCount = resourcesResult.status === 'fulfilled' ? resourcesResult.value.count || 0 : 0
          return { count: uploadsCount + resourcesCount, error: null }
        }),
      ])

      // Process results with error handling
      const [postsResult, commentsResult, lecturesResult, uploadsResult] = results

      const stats = {
        posts: postsResult.status === 'fulfilled' ? (postsResult.value.count || 0) : 0,
        comments: commentsResult.status === 'fulfilled' ? (commentsResult.value.count || 0) : 0,
        lectures_registered: lecturesResult.status === 'fulfilled' ? lecturesResult.value.count : 0,
        file_uploads: uploadsResult.status === 'fulfilled' ? uploadsResult.value.count : 0,
      }

      console.log('User stats fetched:', stats)
      setUserStats(stats)

      // Log any errors for debugging but don't fail the entire operation
      const errors: string[] = []
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const tables = ['posts', 'comments', 'lecture_registrations', 'file_uploads']
          console.warn(`Failed to fetch ${tables[index]} stats:`, result.reason)
          errors.push(tables[index])
        }
      })

      if (errors.length > 0) {
        setStatsError(`일부 데이터를 불러올 수 없었습니다: ${errors.join(', ')}`)
      }

    } catch (error) {
      console.error('Error fetching user stats:', error)
      setStatsError('사용자 통계를 불러오는데 실패했습니다. 네트워크 연결을 확인해주세요.')
      // Always provide fallback stats
      setUserStats({
        posts: 0,
        comments: 0,
        lectures_registered: 0,
        file_uploads: 0,
      })
    } finally {
      setStatsLoading(false)
    }
  }

  const handleRetryStats = () => {
    fetchUserStats()
  }

  const handleDelete = async () => {
    if (!user || !reason.trim()) return

    setLoading(true)
    setError(null)
    
    try {
      const { data: currentUserData } = await supabase.auth.getUser()
      
      if (deletionType === 'soft') {
        await performSoftDelete()
      } else {
        await performHardDelete()
      }

      // Log deletion audit with error handling
      try {
        const { data: currentUserIdentity } = await supabase
          .from('auth_methods')
          .select('identity_id')
          .eq('provider', 'supabase')
          .eq('provider_user_id', currentUserData.user?.id)
          .single()

        await supabase.from('user_deletion_audit').insert([{
          deleted_user_id: user.identity_id,
          deleted_by: currentUserIdentity?.identity_id || null,
          deletion_type: deletionType,
          reason,
          user_data: {
            email: user.email,
            username: user.username,
            nickname: user.nickname,
            full_name: user.full_name,
            role: user.role,
            created_at: user.created_at,
          },
          related_content_count: userStats ? 
            userStats.posts + userStats.comments + userStats.lectures_registered + userStats.file_uploads : 0
        }])
      } catch (auditError) {
        console.error('Failed to log deletion audit:', auditError)
        // Continue with deletion even if audit logging fails
      }

      onDeleted()
      onClose()
    } catch (error) {
      console.error('Error deleting user:', error)
      setError(`사용자 삭제 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setLoading(false)
    }
  }

  const performSoftDelete = async () => {
    // Mark user as deleted
    await supabase
      .from('user_profiles')
      .update({ 
        is_active: false 
      })
      .eq('identity_id', user!.identity_id)

    await supabase
      .from('identities')
      .update({ 
        status: 'deleted' 
      })
      .eq('id', user!.identity_id)

    // Handle content based on selected action
    if (contentAction === 'anonymize') {
      await anonymizeUserContent()
    }
  }

  const performHardDelete = async () => {
    // Handle content first
    if (contentAction === 'delete') {
      await deleteUserContent()
    } else if (contentAction === 'anonymize') {
      await anonymizeUserContent()
    }

    // Delete user (cascade will handle related records)
    await supabase
      .from('identities')
      .delete()
      .eq('id', user!.identity_id)
  }

  const anonymizeUserContent = async () => {
    const anonymizedData = {
      author_name: 'Deleted User',
      author_email: null,
      author_id: null
    }

    // Anonymize posts
    await supabase
      .from('posts')
      .update(anonymizedData)
      .eq('author_id', user!.identity_id)

    // Anonymize comments
    await supabase
      .from('comments')
      .update(anonymizedData)
      .eq('author_id', user!.identity_id)
  }

  const deleteUserContent = async () => {
    // Delete user's posts (comments will cascade)
    await supabase
      .from('posts')
      .delete()
      .eq('author_id', user!.identity_id)

    // Delete user's standalone comments
    await supabase
      .from('comments')
      .delete()
      .eq('author_id', user!.identity_id)

    // Cancel lecture registrations
    await supabase
      .from('lecture_registrations')
      .update({ status: 'cancelled' })
      .eq('identity_id', user!.identity_id)

    // Handle legacy user_id references
    await supabase
      .from('lecture_registrations')
      .update({ status: 'cancelled' })
      .eq('user_id', user!.id)
  }

  if (!user) return null

  const totalContent = userStats ? 
    userStats.posts + userStats.comments + userStats.lectures_registered + userStats.file_uploads : 0

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="error" />
        사용자 삭제 - {user.nickname || user.username}
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2">
            이 작업은 되돌릴 수 없습니다. 신중하게 진행해주세요.
          </Typography>
        </Alert>

        {/* User Information */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>삭제할 사용자 정보</Typography>
          <Typography variant="body2">이메일: {user.email}</Typography>
          <Typography variant="body2">사용자명: {user.username}</Typography>
          <Typography variant="body2">권한: {user.role}</Typography>
          <Typography variant="body2">
            가입일: {new Date(user.created_at).toLocaleDateString()}
          </Typography>
        </Box>

        {/* User Content Statistics */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            관련 콘텐츠
            {!statsLoading && (
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleRetryStats}
                sx={{ ml: 'auto' }}
              >
                새로고침
              </Button>
            )}
          </Typography>
          
          {statsLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                사용자 콘텐츠 통계를 불러오는 중...
              </Typography>
            </Box>
          ) : userStats ? (
            <>
              <List dense>
                <ListItem>
                  <ListItemIcon><ArticleIcon /></ListItemIcon>
                  <ListItemText primary={`작성한 게시글: ${userStats.posts}개`} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CommentIcon /></ListItemIcon>
                  <ListItemText primary={`작성한 댓글: ${userStats.comments}개`} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><AssignmentIcon /></ListItemIcon>
                  <ListItemText primary={`강의 신청: ${userStats.lectures_registered}개`} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><FileIcon /></ListItemIcon>
                  <ListItemText primary={`업로드한 파일: ${userStats.file_uploads}개`} />
                </ListItem>
              </List>
              
              {totalContent > 0 && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    총 {totalContent}개의 관련 콘텐츠가 있습니다.
                  </Typography>
                </Alert>
              )}
              
              {statsError && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    {statsError}
                  </Typography>
                </Alert>
              )}
            </>
          ) : (
            <Alert severity="error" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2">
                  관련 콘텐츠 정보를 불러올 수 없습니다. 네트워크 연결을 확인하고 다시 시도해주세요.
                </Typography>
              </Box>
              <Button
                size="small"
                onClick={handleRetryStats}
                variant="outlined"
                color="inherit"
              >
                재시도
              </Button>
            </Alert>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Deletion Type Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>삭제 방식</Typography>
          <RadioGroup
            value={deletionType}
            onChange={(e) => setDeletionType(e.target.value as 'soft' | 'hard')}
          >
            <FormControlLabel 
              value="soft" 
              control={<Radio />} 
              label={
                <Box>
                  <Typography variant="body1">소프트 삭제 (권장)</Typography>
                  <Typography variant="caption" color="text.secondary">
                    사용자 계정을 비활성화하고 데이터는 보관합니다. 복구 가능합니다.
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel 
              value="hard" 
              control={<Radio />} 
              label={
                <Box>
                  <Typography variant="body1">하드 삭제</Typography>
                  <Typography variant="caption" color="text.secondary">
                    데이터베이스에서 완전히 삭제합니다. 복구 불가능합니다.
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </Box>

        {/* Content Action Selection */}
        {totalContent > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>작성한 콘텐츠 처리</Typography>
            <RadioGroup
              value={contentAction}
              onChange={(e) => setContentAction(e.target.value as any)}
            >
              <FormControlLabel 
                value="preserve" 
                control={<Radio />} 
                label="보존 (작성자 정보만 삭제)"
              />
              <FormControlLabel 
                value="anonymize" 
                control={<Radio />} 
                label="익명화 ('삭제된 사용자'로 표시)"
              />
              <FormControlLabel 
                value="delete" 
                control={<Radio />} 
                label="전체 삭제 (게시글과 댓글 모두 삭제)"
              />
            </RadioGroup>
          </Box>
        )}

        {/* Deletion Reason */}
        <TextField
          label="삭제 사유"
          multiline
          rows={3}
          fullWidth
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="삭제 사유를 상세히 기록해주세요 (감사로그에 기록됩니다)"
          sx={{ 
            mb: 2,
            '& .MuiInputLabel-root': {
              backgroundColor: 'white',
              padding: '0 4px',
            },
            '& .MuiInputLabel-root.Mui-focused': {
              backgroundColor: 'white',
              padding: '0 4px',
            },
            '& .MuiInputLabel-root.MuiFormLabel-filled': {
              backgroundColor: 'white',
              padding: '0 4px',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              '& legend': {
                maxWidth: '0.01px'
              }
            }
          }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Alert severity="warning">
          <Typography variant="body2">
            이 작업은 관리자 감사로그에 기록되며, 삭제된 사용자 정보는 보안상 일정 기간 보관됩니다.
          </Typography>
        </Alert>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          취소
        </Button>
        <Button 
          onClick={handleDelete}
          variant="contained" 
          color="error"
          disabled={loading || !reason.trim() || statsLoading}
          startIcon={loading ? <CircularProgress size={16} /> : <DeleteIcon />}
        >
          {loading ? '삭제 중...' : '삭제 실행'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}