'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
  Chip,
  Stack,
  Alert,
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  ArrowBack,
  DragIndicator,
} from '@mui/icons-material'
import AppHeader from '@/components/AppHeader'
import AuthGuard from '@/components/AuthGuard'

interface ResearchMember {
  id: string
  name: string
  position: string
  role_title: string | null
  organization: string
  specialty: string | null
  photo_url: string | null
  display_order: number
  is_active: boolean
}

const POSITIONS = ['회장', '부회장', '중심연구회원']

export default function AdminResearchMembersPage() {
  const router = useRouter()
  const [members, setMembers] = useState<ResearchMember[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<ResearchMember | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    position: '중심연구회원',
    role_title: '',
    organization: '',
    specialty: '',
    photo_url: '',
    display_order: 0,
  })

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/research-members')
      if (response.ok) {
        const data = await response.json()
        setMembers(data)
      }
    } catch (error) {
      console.error('Failed to fetch members:', error)
      setError('멤버 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (member?: ResearchMember) => {
    if (member) {
      setEditingMember(member)
      setFormData({
        name: member.name,
        position: member.position,
        role_title: member.role_title || '',
        organization: member.organization,
        specialty: member.specialty || '',
        photo_url: member.photo_url || '',
        display_order: member.display_order,
      })
    } else {
      setEditingMember(null)
      setFormData({
        name: '',
        position: '중심연구회원',
        role_title: '',
        organization: '',
        specialty: '',
        photo_url: '',
        display_order: members.length + 1,
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingMember(null)
    setError(null)
  }

  const handleSave = async () => {
    try {
      const method = editingMember ? 'PUT' : 'POST'
      const body = editingMember
        ? { id: editingMember.id, ...formData }
        : formData

      const response = await fetch('/api/research-members', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to save')

      await fetchMembers()
      handleCloseDialog()
    } catch (error) {
      console.error('Save error:', error)
      setError('저장에 실패했습니다.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/research-members?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      await fetchMembers()
    } catch (error) {
      console.error('Delete error:', error)
      setError('삭제에 실패했습니다.')
    }
  }

  const getPositionColor = (position: string) => {
    switch (position) {
      case '회장': return 'warning'
      case '부회장': return 'info'
      default: return 'default'
    }
  }

  return (
    <AuthGuard requireAuth requireModerator>
      <AppHeader />
      <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <IconButton onClick={() => router.push('/admin')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            연구회원 관리
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6">연구회원 목록</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
            >
              새 멤버 추가
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width={60}>순서</TableCell>
                  <TableCell width={80}>사진</TableCell>
                  <TableCell>이름</TableCell>
                  <TableCell>직위</TableCell>
                  <TableCell>직책</TableCell>
                  <TableCell>소속</TableCell>
                  <TableCell>전문 분야</TableCell>
                  <TableCell width={120} align="center">관리</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <DragIndicator sx={{ color: 'text.disabled', cursor: 'grab' }} />
                        <span>{member.display_order}</span>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Avatar src={member.photo_url || undefined} sx={{ width: 40, height: 40 }}>
                        {member.name[0]}
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600}>{member.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={member.position}
                        size="small"
                        color={getPositionColor(member.position) as any}
                      />
                    </TableCell>
                    <TableCell>{member.role_title || '-'}</TableCell>
                    <TableCell>{member.organization}</TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {member.specialty || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => handleOpenDialog(member)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(member.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {members.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">등록된 연구회원이 없습니다.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingMember ? '연구회원 수정' : '새 연구회원 추가'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label="이름"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
              />

              <FormControl fullWidth>
                <InputLabel>직위</InputLabel>
                <Select
                  value={formData.position}
                  label="직위"
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                >
                  {POSITIONS.map((pos) => (
                    <MenuItem key={pos} value={pos}>{pos}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="직책 (예: AI교육연구팀장)"
                value={formData.role_title}
                onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                fullWidth
                helperText="중심연구회원의 경우 담당 팀/역할"
              />

              <TextField
                label="소속 학교/기관"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                fullWidth
                required
              />

              <TextField
                label="전문 분야"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                fullWidth
                helperText="쉼표로 구분 (예: AI 교육, 에듀테크, 코딩)"
              />

              <TextField
                label="프로필 사진 URL"
                value={formData.photo_url}
                onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                fullWidth
                helperText="라운드 처리된 사진이 표시됩니다"
              />

              <TextField
                label="표시 순서"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>취소</Button>
            <Button variant="contained" onClick={handleSave}>
              {editingMember ? '수정' : '추가'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </AuthGuard>
  )
}
