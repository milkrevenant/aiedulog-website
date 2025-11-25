'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Chip,
  Menu,
  MenuItem,
  Autocomplete,
  Avatar,
  ListItem,
  ListItemAvatar,
  ListItemText,
  useTheme
} from '@mui/material'
import {
  Add,
  MoreVert,
  Edit,
  Delete,
  DragIndicator,
  Flag,
  Person,
  Label,
  Schedule,
  Comment,
  Send,
  Reply
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'
import { getUserIdentity } from '@/lib/identity/helpers'

interface UserProfile {
  id: string
  email: string
  nickname?: string
  avatar_url?: string
  role?: string
}

interface CardComment {
  id: string
  text: string
  authorId: string
  authorProfile?: UserProfile
  createdAt: string
  mentions?: string[] // Array of user IDs mentioned in comment
}

interface KanbanCard {
  id: string
  title: string
  description?: string
  assignee?: string // User ID
  assigneeProfile?: UserProfile // Full user profile data
  priority?: 'low' | 'medium' | 'high'
  tags?: string[]
  createdAt: string
  dueDate?: string
  estimatedHours?: number
  progress?: number
  comments?: CardComment[]
}

interface KanbanColumn {
  id: string
  title: string
  cards: KanbanCard[]
  limit?: number
}

interface KanbanData {
  columns: KanbanColumn[]
}

interface KanbanEmbedProps {
  data: KanbanData
  onChange: (data: KanbanData) => void
  readOnly?: boolean
  width?: number
  height?: number
}

export default function KanbanEmbed({
  data,
  onChange,
  readOnly = false,
  width = 600,
  height = 400
}: KanbanEmbedProps) {
  const [draggedCard, setDraggedCard] = useState<KanbanCard | null>(null)
  const [draggedOver, setDraggedOver] = useState<string | null>(null)
  const [dragPosition, setDragPosition] = useState<{ columnId: string, index: number } | null>(null)
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null)
  const [newCardColumn, setNewCardColumn] = useState<string | null>(null)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement, cardId: string } | null>(null)
  const [inlineEditCard, setInlineEditCard] = useState<string | null>(null)
  const theme = useTheme()
  const [inlineEditValue, setInlineEditValue] = useState('')
  const [addColumnDialog, setAddColumnDialog] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [editingColumn, setEditingColumn] = useState<string | null>(null)
  const [editColumnTitle, setEditColumnTitle] = useState('')
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showComments, setShowComments] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [currentUserId] = useState('user-123') // This would come from auth context
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null)
  
  const supabase = createClient()

  // Load users from identity system using simplified query
  const loadUsers = async () => {
    if (readOnly) return
    
    setLoadingUsers(true)
    try {
      const { data: identityData, error: identityError } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          email,
          nickname,
          avatar_url,
          role
        `)
        .eq('is_active', true)
        .limit(50)

      if (identityError) throw identityError

      const mappedUsers = identityData?.map((profile: any) => ({
        id: profile.user_id,
        email: profile.email,
        nickname: profile.nickname,
        avatar_url: profile.avatar_url,
        role: profile.role
      })) || []

      setUsers(mappedUsers)
    } catch (error) {
      console.warn('Failed to load users from identity system:', error)
      setUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [readOnly])

  // Set current user profile (for demo)
  useEffect(() => {
    if (users.length > 0 && !currentUserProfile) {
      setCurrentUserProfile(users[0]) // Use first user as current user for demo
    }
  }, [users, currentUserProfile])

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'error'
      case 'medium': return 'warning'
      case 'low': return 'info'
      default: return 'default'
    }
  }

  const handleDragStart = (card: KanbanCard) => {
    if (readOnly) return
    setDraggedCard(card)
  }

  const handleDragOver = (e: React.DragEvent, columnId: string, index?: number) => {
    e.preventDefault()
    setDraggedOver(columnId)
    
    // Calculate drop position based on mouse position
    if (index !== undefined) {
      const rect = e.currentTarget.getBoundingClientRect()
      const mouseY = e.clientY - rect.top
      const cardHeight = rect.height
      const insertIndex = mouseY < cardHeight / 2 ? index : index + 1
      setDragPosition({ columnId, index: insertIndex })
    }
  }

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    
    if (!draggedCard || readOnly) {
      setDraggedOver(null)
      setDragPosition(null)
      return
    }

    const newData = { ...data }
    
    // Remove card from source column
    newData.columns = newData.columns.map(col => ({
      ...col,
      cards: col.cards.filter(card => card.id !== draggedCard.id)
    }))
    
    // Add card to target column at specific position
    const targetColumn = newData.columns.find(col => col.id === targetColumnId)
    if (targetColumn && dragPosition) {
      const insertIndex = Math.min(dragPosition.index, targetColumn.cards.length)
      targetColumn.cards.splice(insertIndex, 0, draggedCard)
    } else if (targetColumn) {
      targetColumn.cards.push(draggedCard)
    }

    onChange(newData)
    setDraggedCard(null)
    setDraggedOver(null)
    setDragPosition(null)
  }

  const addCard = (columnId: string) => {
    if (!newCardTitle.trim() || readOnly) return

    const newCard: KanbanCard = {
      id: `card-${Date.now()}`,
      title: newCardTitle,
      createdAt: new Date().toISOString()
    }

    const newData = { ...data }
    const column = newData.columns.find(col => col.id === columnId)
    if (column) {
      column.cards.push(newCard)
    }

    onChange(newData)
    setNewCardTitle('')
    setNewCardColumn(null)
  }

  const addColumn = () => {
    if (!newColumnTitle.trim() || readOnly) return

    const newColumn: KanbanColumn = {
      id: `column-${Date.now()}`,
      title: newColumnTitle,
      cards: []
    }

    const newData = { ...data }
    newData.columns.push(newColumn)

    onChange(newData)
    setNewColumnTitle('')
    setAddColumnDialog(false)
  }

  const updateColumnTitle = (columnId: string, newTitle: string) => {
    if (!newTitle.trim() || readOnly) return

    const newData = { ...data }
    const column = newData.columns.find(col => col.id === columnId)
    if (column) {
      column.title = newTitle
      onChange(newData)
    }
    setEditingColumn(null)
    setEditColumnTitle('')
  }

  const deleteColumn = (columnId: string) => {
    if (readOnly) return

    const newData = { ...data }
    newData.columns = newData.columns.filter(col => col.id !== columnId)
    onChange(newData)
  }

  const startEditColumn = (column: KanbanColumn) => {
    setEditingColumn(column.id)
    setEditColumnTitle(column.title)
  }

  const updateCard = (updatedCard: KanbanCard) => {
    if (readOnly) return

    const newData = { ...data }
    newData.columns = newData.columns.map(col => ({
      ...col,
      cards: col.cards.map(card => 
        card.id === updatedCard.id ? updatedCard : card
      )
    }))

    onChange(newData)
    setEditingCard(null)
  }

  const deleteCard = (cardId: string) => {
    if (readOnly) return

    const newData = { ...data }
    newData.columns = newData.columns.map(col => ({
      ...col,
      cards: col.cards.filter(card => card.id !== cardId)
    }))

    onChange(newData)
    setMenuAnchor(null)
  }

  const addComment = (cardId: string) => {
    if (!newComment.trim() || readOnly || !currentUserProfile) return

    const mentions = extractMentions(newComment)
    const comment: CardComment = {
      id: `comment-${Date.now()}`,
      text: newComment,
      authorId: currentUserId,
      authorProfile: currentUserProfile,
      createdAt: new Date().toISOString(),
      mentions
    }

    const newData = { ...data }
    newData.columns = newData.columns.map(col => ({
      ...col,
      cards: col.cards.map(card => {
        if (card.id === cardId) {
          return {
            ...card,
            comments: [...(card.comments || []), comment]
          }
        }
        return card
      })
    }))

    onChange(newData)
    setNewComment('')
  }

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@([a-zA-Z0-9._-]+)/g
    const matches = text.match(mentionRegex)
    if (!matches) return []
    
    return matches
      .map(match => match.substring(1)) // Remove @ symbol
      .map(mention => {
        // Find user by nickname or email
        const user = users.find(u => 
          u.nickname === mention || 
          u.email.split('@')[0] === mention
        )
        return user?.id
      })
      .filter(Boolean) as string[]
  }

  const renderMentions = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9._-]+)/g)
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const mention = part.substring(1)
        const user = users.find(u => 
          u.nickname === mention || 
          u.email.split('@')[0] === mention
        )
        return (
          <Chip
            key={index}
            size="small"
            label={part}
            color="primary"
            variant="outlined"
            sx={{ 
              height: '1.5em', 
              fontSize: 'inherit',
              mx: 0.25,
              cursor: 'pointer'
            }}
            avatar={user?.avatar_url ? (
              <Avatar sx={{ width: 16, height: 16 }} src={user.avatar_url} />
            ) : undefined}
          />
        )
      }
      return part
    })
  }

  return (
    <Box
      sx={{
        width,
        height,
        display: 'flex',
        gap: 2,
        p: 2,
        overflow: 'auto',
        bgcolor: 'grey.50'
      }}
    >
      {data.columns.map((column) => (
        <Paper
          key={column.id}
          sx={{
            minWidth: 280,
            height: 'fit-content',
            bgcolor: draggedOver === column.id ? 'primary.50' : 'background.paper'
          }}
          onDragOver={(e) => handleDragOver(e, column.id)}
          onDrop={(e) => handleDrop(e, column.id)}
          onDragLeave={() => {
            setDraggedOver(null)
            setDragPosition(null)
          }}
        >
          {/* Column Header */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              {editingColumn === column.id ? (
                <TextField
                  value={editColumnTitle}
                  onChange={(e) => setEditColumnTitle(e.target.value)}
                  onBlur={() => updateColumnTitle(column.id, editColumnTitle)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      updateColumnTitle(column.id, editColumnTitle)
                    }
                    if (e.key === 'Escape') {
                      setEditingColumn(null)
                      setEditColumnTitle('')
                    }
                  }}
                  size="small"
                  variant="outlined"
                  autoFocus
                  sx={{ minWidth: 150 }}
                />
              ) : (
                <Typography 
                  variant="h6" 
                  component="div"
                  sx={{ cursor: readOnly ? 'default' : 'pointer' }}
                  onClick={() => !readOnly && startEditColumn(column)}
                >
                  {column.title}
                </Typography>
              )}
              <Stack direction="row" alignItems="center" spacing={1}>
                <Chip 
                  label={column.cards.length} 
                  size="small" 
                  variant="outlined"
                />
                {!readOnly && (
                  <>
                    <IconButton
                      size="small"
                      onClick={() => setNewCardColumn(column.id)}
                      title="Add card"
                    >
                      <Add />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => deleteColumn(column.id)}
                      title="Delete column"
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </>
                )}
              </Stack>
            </Stack>
          </Box>

          {/* Cards */}
          <Box sx={{ p: 1 }}>
            <Stack spacing={1}>
              {column.cards.map((card, index) => (
                <Box key={card.id}>
                  {/* Drop indicator line */}
                  {dragPosition && 
                   dragPosition.columnId === column.id && 
                   dragPosition.index === index && (
                    <Box
                      sx={{
                        height: 2,
                        bgcolor: 'primary.main',
                        borderRadius: 1,
                        mx: 1,
                        opacity: 0.8,
                        boxShadow: `0 0 8px ${theme.palette.primary.main}40`
                      }}
                    />
                  )}
                <Card
                  draggable={!readOnly}
                  onDragStart={() => handleDragStart(card)}
                  onDragOver={(e) => handleDragOver(e, column.id, index)}
                  sx={{
                    cursor: readOnly ? 'default' : 'grab',
                    opacity: draggedCard?.id === card.id ? 0.5 : 1,
                    '&:hover': !readOnly ? {
                      bgcolor: 'action.hover'
                    } : {},
                    '&:active': {
                      cursor: 'grabbing'
                    }
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                      {inlineEditCard === card.id ? (
                        <TextField
                          fullWidth
                          size="small"
                          value={inlineEditValue}
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onBlur={() => {
                            if (inlineEditValue.trim()) {
                              updateCard({ ...card, title: inlineEditValue.trim() })
                            }
                            setInlineEditCard(null)
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              if (inlineEditValue.trim()) {
                                updateCard({ ...card, title: inlineEditValue.trim() })
                              }
                              setInlineEditCard(null)
                            }
                          }}
                          autoFocus
                          sx={{ mr: 1 }}
                        />
                      ) : (
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            flex: 1,
                            cursor: readOnly ? 'default' : 'pointer',
                            '&:hover': !readOnly ? { bgcolor: 'action.hover', borderRadius: 1, px: 0.5 } : {}
                          }}
                          onClick={() => {
                            if (!readOnly) {
                              setInlineEditCard(card.id)
                              setInlineEditValue(card.title)
                            }
                          }}
                        >
                          {card.title}
                        </Typography>
                      )}
                      {!readOnly && inlineEditCard !== card.id && (
                        <Stack direction="row" spacing={0.5}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setInlineEditCard(card.id)
                              setInlineEditValue(card.title)
                            }}
                            sx={{ opacity: 0.7 }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => setMenuAnchor({ element: e.currentTarget, cardId: card.id })}
                          >
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </Stack>
                      )}
                    </Stack>
                    
                    {card.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {card.description}
                      </Typography>
                    )}
                    
                    {(card.priority || card.tags?.length || card.dueDate || card.estimatedHours || card.progress) && (
                      <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                        {card.priority && (
                          <Chip
                            label={card.priority === 'low' ? '🟢 Low' : card.priority === 'medium' ? '🟡 Med' : '🔴 High'}
                            size="small"
                            color={getPriorityColor(card.priority) as any}
                            variant="filled"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                        {card.dueDate && (
                          <Chip
                            label={new Date(card.dueDate).toLocaleDateString()}
                            size="small"
                            color="warning"
                            icon={<Schedule fontSize="small" />}
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                        {card.estimatedHours && (
                          <Chip
                            label={`${card.estimatedHours}h`}
                            size="small"
                            color="info"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                        {card.progress !== undefined && card.progress > 0 && (
                          <Chip
                            label={`${card.progress}%`}
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                        {card.tags?.map((tag, index) => (
                          <Chip
                            key={index}
                            label={tag}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        ))}
                      </Stack>
                    )}
                    
                    {/* Assignee and Comments */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
                      {card.assigneeProfile ? (
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Avatar 
                            sx={{ width: 20, height: 20 }} 
                            src={card.assigneeProfile.avatar_url}
                          >
                            {card.assigneeProfile.nickname?.[0] || card.assigneeProfile.email[0]}
                          </Avatar>
                          <Typography variant="caption" color="text.secondary">
                            {card.assigneeProfile.nickname || card.assigneeProfile.email}
                          </Typography>
                        </Stack>
                      ) : card.assignee ? (
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Person fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            {card.assignee}
                          </Typography>
                        </Stack>
                      ) : null}
                      
                      {!readOnly && (
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          {card.comments && card.comments.length > 0 && (
                            <Chip
                              size="small"
                              label={card.comments.length}
                              color="info"
                              variant="outlined"
                              icon={<Comment />}
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          )}
                          <IconButton
                            size="small"
                            onClick={() => setShowComments(showComments === card.id ? null : card.id)}
                            sx={{ opacity: 0.7 }}
                          >
                            <Comment fontSize="small" />
                          </IconButton>
                        </Stack>
                      )}
                    </Stack>
                    
                    {/* Comments Section */}
                    {showComments === card.id && (
                      <Box sx={{ mt: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                        {/* Existing Comments */}
                        {card.comments?.map((comment) => (
                          <Stack key={comment.id} direction="row" spacing={1} sx={{ mb: 1 }}>
                            <Avatar sx={{ width: 16, height: 16 }} src={comment.authorProfile?.avatar_url}>
                              {comment.authorProfile?.nickname?.[0] || comment.authorProfile?.email[0]}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Stack direction="row" alignItems="center" spacing={0.5}>
                                <Typography variant="caption" fontWeight="bold">
                                  {comment.authorProfile?.nickname || comment.authorProfile?.email}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(comment.createdAt).toLocaleTimeString()}
                                </Typography>
                              </Stack>
                              <Typography variant="caption" sx={{ display: 'block', mt: 0.25 }}>
                                {renderMentions(comment.text)}
                              </Typography>
                            </Box>
                          </Stack>
                        ))}
                        
                        {/* Add Comment */}
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                          <Avatar sx={{ width: 16, height: 16 }} src={currentUserProfile?.avatar_url}>
                            {currentUserProfile?.nickname?.[0] || currentUserProfile?.email[0]}
                          </Avatar>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="Add a comment... Use @ to mention users"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                addComment(card.id)
                              }
                            }}
                            multiline
                            maxRows={3}
                            sx={{ 
                              '& .MuiInputBase-root': { 
                                fontSize: '0.75rem',
                                padding: '6px 8px'
                              }
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => addComment(card.id)}
                            disabled={!newComment.trim()}
                            color="primary"
                          >
                            <Send fontSize="small" />
                          </IconButton>
                        </Stack>
                        
                        {/* Available users for mention */}
                        {users.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Mention: {users.slice(0, 5).map(user => (
                                <Chip
                                  key={user.id}
                                  size="small"
                                  label={`@${user.nickname || user.email.split('@')[0]}`}
                                  variant="outlined"
                                  sx={{ 
                                    height: 16, 
                                    fontSize: '0.6rem', 
                                    mr: 0.5,
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => {
                                    const mention = `@${user.nickname || user.email.split('@')[0]}`
                                    setNewComment(prev => prev + mention + ' ')
                                  }}
                                />
                              ))}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>
                
                {/* Drop indicator after last card */}
                {dragPosition && 
                 dragPosition.columnId === column.id && 
                 dragPosition.index === column.cards.length && 
                 index === column.cards.length - 1 && (
                  <Box
                    sx={{
                      height: 2,
                      bgcolor: 'primary.main',
                      borderRadius: 1,
                      mx: 1,
                      opacity: 0.8,
                      boxShadow: `0 0 8px ${theme.palette.primary.main}40`
                    }}
                  />
                )}
                </Box>
              ))}

              {/* Add Card Input */}
              {newCardColumn === column.id && (
                <Card>
                  <CardContent>
                    <TextField
                      fullWidth
                      placeholder="Enter card title..."
                      value={newCardTitle}
                      onChange={(e) => setNewCardTitle(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addCard(column.id)
                        }
                      }}
                      autoFocus
                      size="small"
                    />
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => addCard(column.id)}
                      >
                        Add Card
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setNewCardColumn(null)
                          setNewCardTitle('')
                        }}
                      >
                        Cancel
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Stack>
          </Box>
        </Paper>
      ))}

      {/* Add Column Button */}
      {!readOnly && (
        <Paper
          sx={{
            minWidth: 280,
            height: 'fit-content',
            bgcolor: 'grey.100',
            border: 2,
            borderColor: 'grey.300',
            borderStyle: 'dashed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
            cursor: 'pointer',
            '&:hover': {
              bgcolor: 'primary.50',
              borderColor: 'primary.main'
            }
          }}
          onClick={() => setAddColumnDialog(true)}
        >
          <Stack alignItems="center" spacing={1}>
            <Add sx={{ fontSize: 40, color: 'grey.500' }} />
            <Typography variant="h6" color="grey.600">
              Add Column
            </Typography>
          </Stack>
        </Paper>
      )}

      {/* Card Context Menu */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            const card = data.columns
              .flatMap(col => col.cards)
              .find(card => card.id === menuAnchor?.cardId)
            if (card) {
              setEditingCard(card)
            }
            setMenuAnchor(null)
          }}
        >
          <Edit sx={{ mr: 1 }} /> Edit Card
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuAnchor) {
              setShowComments(showComments === menuAnchor.cardId ? null : menuAnchor.cardId)
            }
            setMenuAnchor(null)
          }}
        >
          <Comment sx={{ mr: 1 }} /> Comments
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuAnchor) {
              deleteCard(menuAnchor.cardId)
            }
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} /> Delete Card
        </MenuItem>
      </Menu>

      {/* Edit Card Dialog */}
      <Dialog
        open={Boolean(editingCard)}
        onClose={() => setEditingCard(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Card</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Title"
              value={editingCard?.title || ''}
              onChange={(e) => setEditingCard(prev => 
                prev ? { ...prev, title: e.target.value } : null
              )}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={editingCard?.description || ''}
              onChange={(e) => setEditingCard(prev => 
                prev ? { ...prev, description: e.target.value } : null
              )}
            />
            
            <Stack direction="row" spacing={2}>
              <Autocomplete
                sx={{ flex: 1 }}
                options={users}
                getOptionLabel={(option) => option.nickname || option.email}
                value={users.find(u => u.id === editingCard?.assignee) || null}
                onChange={(_, value) => setEditingCard(prev => 
                  prev ? { 
                    ...prev, 
                    assignee: value?.id || '',
                    assigneeProfile: value || undefined
                  } : null
                )}
                loading={loadingUsers}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Assignee"
                    placeholder="Select assignee"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>{<Person sx={{ mr: 1, color: 'text.secondary' }} />}{params.InputProps.startAdornment}</>
                      )
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <ListItem {...props}>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32 }} src={option.avatar_url}>
                        {option.nickname?.[0] || option.email[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={option.nickname || option.email}
                      secondary={option.email}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                )}
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
              
              <TextField
                select
                label="Priority"
                value={editingCard?.priority || ''}
                onChange={(e) => setEditingCard(prev => 
                  prev ? { ...prev, priority: e.target.value as 'low' | 'medium' | 'high' } : null
                )}
                sx={{ minWidth: 120 }}
                SelectProps={{ native: true }}
                InputProps={{
                  startAdornment: <Flag sx={{ mr: 1, color: 'action.active' }} />
                }}
              >
                <option value="">None</option>
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </TextField>
            </Stack>
            
            <TextField
              fullWidth
              label="Tags (comma separated)"
              value={editingCard?.tags?.join(', ') || ''}
              onChange={(e) => setEditingCard(prev => 
                prev ? { 
                  ...prev, 
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) 
                } : null
              )}
              InputProps={{
                startAdornment: <Label sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
            
            <Stack direction="row" spacing={2}>
              <TextField
                type="date"
                label="Due Date"
                value={editingCard?.dueDate ? editingCard.dueDate.split('T')[0] : ''}
                onChange={(e) => setEditingCard(prev => 
                  prev ? { 
                    ...prev, 
                    dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                  } : null
                )}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: <Schedule sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                sx={{ flex: 1 }}
              />
              
              <TextField
                label="Est. Hours"
                type="number"
                value={editingCard?.estimatedHours || ''}
                onChange={(e) => setEditingCard(prev => 
                  prev ? { ...prev, estimatedHours: e.target.value ? Number(e.target.value) : undefined } : null
                )}
                sx={{ minWidth: 120 }}
                inputProps={{ min: 0, step: 0.5 }}
                placeholder="Hours"
              />
            </Stack>
            
            {/* Progress Slider */}
            <div>
              <Typography variant="body2" gutterBottom>
                Progress: {editingCard?.progress || 0}%
              </Typography>
              <div style={{ padding: '0 8px' }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editingCard?.progress || 0}
                  onChange={(e) => setEditingCard(prev => 
                    prev ? { ...prev, progress: Number(e.target.value) } : null
                  )}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingCard(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => editingCard && updateCard(editingCard)}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Column Dialog */}
      <Dialog open={addColumnDialog} onClose={() => setAddColumnDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Column</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Column Title"
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            fullWidth
            margin="normal"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newColumnTitle.trim()) {
                addColumn()
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddColumnDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={addColumn}
            disabled={!newColumnTitle.trim()}
          >
            Add Column
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
