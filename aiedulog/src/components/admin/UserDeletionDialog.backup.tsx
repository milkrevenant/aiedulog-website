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
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/server'

interface AdminUser {
  id: string
  user_id: string
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
    try {
      const [postsResult, commentsResult, lecturesResult, uploadsResult] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact' }).eq('author_id', user.user_id),
        supabase.from('comments').select('id', { count: 'exact' }).eq('author_id', user.user_id),
        supabase.from('lecture_registrations').select('id', { count: 'exact' }).eq('user_id', user.user_id),
        supabase.from('file_uploads').select('id', { count: 'exact' }).eq('uploaded_by', user.user_id),
      ])

      setUserStats({
        posts: postsResult.count || 0,
        comments: commentsResult.count || 0,
        lectures_registered: lecturesResult.count || 0,
        file_uploads: uploadsResult.count || 0,
      })
    } catch (error) {
      console.error('Error fetching user stats:', error)
      // 오류 발생시에도 0으로 초기화된 stats 설정
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

  const handleDelete = async () => {
    if (!user || !reason.trim()) return

    setLoading(true)
    try {
      const { data: currentUserData } = await supabase.auth.getUser()
      
      if (deletionType === 'soft') {
        await performSoftDelete()
      } else {
        await performHardDelete()
      }

      // Log deletion audit
      await supabase.from('user_deletion_audit').insert([{
        deleted_user_id: user.user_id,
        deleted_by: currentUserData.user?.id,
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
          userStats.posts + userStats.comments + userStats.lectures_registered : 0
      }])

      onDeleted()
      onClose()
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('사용자 삭제 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const performSoftDelete = async () => {
    // Mark user as deleted
    await supabase
      .from('user_profiles')
      .eq('identity_id', user!.user_id)
      .update({ 
        deleted_at: new Date().toISOString(),
        is_active: false 
      })

    await supabase
      .from('identities')
      .eq('id', user!.user_id)
      .update({ 
        deleted_at: new Date().toISOString(),
        status: 'deleted' 
      })

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
      .eq('id', user!.user_id)
      .delete()
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
      .eq('author_id', user!.user_id)
      .update(anonymizedData)

    // Anonymize comments
    await supabase
      .from('comments')
      .eq('author_id', user!.user_id)
      .update(anonymizedData)
  }

  const deleteUserContent = async () => {
    // Delete user's posts (comments will cascade)
    await supabase
      .from('posts')
      .eq('author_id', user!.user_id)
      .delete()

    // Delete user's standalone comments
    await supabase
      .from('comments')
      .eq('author_id', user!.user_id)
      .delete()

    // Cancel lecture registrations
    await supabase
      .from('lecture_registrations')
      .eq('user_id', user!.user_id)
      .update({ status: 'cancelled' })
  }

  if (!user) return null

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
          <Typography variant="h6" gutterBottom>관련 콘텐츠</Typography>
          {statsLoading ? (
            <CircularProgress size={20} />
          ) : userStats ? (
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
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              관련 콘텐츠 정보를 불러올 수 없습니다.
            </Typography>
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
        {(userStats?.posts || 0) > 0 || (userStats?.comments || 0) > 0 ? (
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
        ) : null}

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
          disabled={loading || !reason.trim()}
          startIcon={loading ? <CircularProgress size={16} /> : <DeleteIcon />}
        >
          {loading ? '삭제 중...' : '삭제 실행'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
