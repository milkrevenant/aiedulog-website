'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Stack,
  Avatar,
  IconButton,
  Tooltip,
  Chip,
  Fade,
  Collapse,
  Button,
  Divider,
  Badge,
  CircularProgress
} from '@mui/material'
import {
  ExpandMore,
  ExpandLess,
  Edit,
  Reply,
  MoreVert,
  EmojiEmotions,
  Add,
  Check,
  Schedule,
  Group,
  Lock,
  Public,
  Sync,
  Warning
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'
import { ChatMessage, ChatUser } from '@/lib/chat/unified-system'

interface MessageReaction {
  emoji: string
  users: string[]
  count: number
}

interface MessageThread {
  id: string
  replies: ChatMessage[]
  hasMore: boolean
}

interface InlineExpandableMessageProps {
  message: ChatMessage
  currentUser: ChatUser
  isOwn: boolean
  maxWidth: number
  minHeight: number
  onReply?: (parentId: string) => void
  onEdit?: (messageId: string) => void
  onReact?: (messageId: string, emoji: string) => void
}

export default function InlineExpandableMessage({
  message,
  currentUser,
  isOwn,
  maxWidth,
  minHeight,
  onReply,
  onEdit,
  onReact
}: InlineExpandableMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [reactions, setReactions] = useState<MessageReaction[]>([])
  const [thread, setThread] = useState<MessageThread | null>(null)
  const [collaborationUsers, setCollaborationUsers] = useState<Array<{id: string, name: string, status: string}>>([])
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced')
  const [isHovered, setIsHovered] = useState(false)
  const messageRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Load message reactions and thread
  useEffect(() => {
    if (message.type && ['excalidraw', 'kanban', 'todo', 'poll'].includes(message.type)) {
      loadMessageMetadata()
      setupCollaborationTracking()
    }
  }, [message.id])

  const loadMessageMetadata = async () => {
    try {
      // Load reactions (mock for now - implement with actual DB)
      setReactions([
        { emoji: '👍', users: ['user1', 'user2'], count: 2 },
        { emoji: '❤️', users: ['user3'], count: 1 }
      ])

      // Load thread replies (mock for now)
      setThread({
        id: message.id,
        replies: [],
        hasMore: false
      })
    } catch (error) {
      console.error('Failed to load message metadata:', error)
    }
  }

  const setupCollaborationTracking = () => {
    if (!message.type || !['excalidraw', 'kanban', 'todo', 'poll'].includes(message.type)) {
      return
    }

    const channel = supabase
      .channel(`message-${message.id}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users = Object.values(state).flat().map((user: any) => ({
          id: user.user_id,
          name: user.name,
          status: user.status || 'viewing'
        }))
        setCollaborationUsers(users)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded)
    
    // Track expansion in collaboration
    const channel = supabase.channel(`message-${message.id}`)
    channel.track({
      user_id: currentUser.identityId,
      name: currentUser.nickname || currentUser.email.split('@')[0],
      status: !isExpanded ? 'expanding' : 'viewing',
      timestamp: new Date().toISOString()
    })
  }

  const handleReaction = (emoji: string) => {
    onReact?.(message.id, emoji)
    
    // Update local reactions optimistically
    setReactions(prev => {
      const existing = prev.find(r => r.emoji === emoji)
      if (existing) {
        if (existing.users.includes(currentUser.identityId)) {
          // Remove reaction
          return prev.map(r => 
            r.emoji === emoji 
              ? { ...r, users: r.users.filter(u => u !== currentUser.identityId), count: r.count - 1 }
              : r
          ).filter(r => r.count > 0)
        } else {
          // Add reaction
          return prev.map(r => 
            r.emoji === emoji 
              ? { ...r, users: [...r.users, currentUser.identityId], count: r.count + 1 }
              : r
          )
        }
      } else {
        // New reaction
        return [...prev, { emoji, users: [currentUser.identityId], count: 1 }]
      }
    })
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getCollaborationStatus = () => {
    if (collaborationUsers.length === 0) return null
    
    const editing = collaborationUsers.filter(u => u.status === 'editing').length
    const viewing = collaborationUsers.filter(u => u.status === 'viewing').length
    
    return { editing, viewing, total: collaborationUsers.length }
  }

  const renderMessageContent = () => {
    const hasEmbedType = message.type && ['excalidraw', 'kanban', 'todo', 'poll'].includes(message.type)
    
    if (hasEmbedType) {
      return (
        <Box sx={{ mt: 1 }}>
          {/* Embed preview when collapsed */}
          {!isExpanded && (
            <Paper
              sx={{
                p: 2,
                bgcolor: 'grey.50',
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: 1,
                  borderColor: 'primary.main'
                },
                transition: 'all 0.2s ease'
              }}
              onClick={handleToggleExpand}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2" fontWeight="medium">
                    {message.type === 'excalidraw' && '🎨 Whiteboard'}
                    {message.type === 'kanban' && '📋 Kanban Board'}
                    {message.type === 'todo' && '✅ Todo List'}
                    {message.type === 'poll' && '📊 Poll'}
                  </Typography>
                  
                  {/* Collaboration status */}
                  {(() => {
                    const status = getCollaborationStatus()
                    if (status && status.total > 0) {
                      return (
                        <Chip
                          label={`${status.total} active`}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )
                    }
                    return null
                  })()}
                </Stack>
                
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="caption" color="text.secondary">
                    Click to expand
                  </Typography>
                  <ExpandMore />
                </Stack>
              </Stack>
            </Paper>
          )}
          
          {/* Full embed when expanded - placeholder for future implementation */}
          <Collapse in={isExpanded}>
            <Box sx={{ mt: 1, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Embed preview not available
              </Typography>
            </Box>
          </Collapse>
        </Box>
      )
    }

    // Regular text message
    return (
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
        {message.message}
      </Typography>
    )
  }

  const renderReactions = () => {
    if (reactions.length === 0) return null

    return (
      <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
        {reactions.map((reaction) => (
          <Chip
            key={reaction.emoji}
            label={`${reaction.emoji} ${reaction.count}`}
            size="small"
            variant={reaction.users.includes(currentUser.identityId) ? 'filled' : 'outlined'}
            onClick={() => handleReaction(reaction.emoji)}
            sx={{ 
              height: 24, 
              fontSize: '0.7rem',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'primary.light' }
            }}
          />
        ))}
        
        {/* Quick reaction buttons */}
        {isHovered && (
          <Stack direction="row" spacing={0.5}>
            {['👍', '❤️', '😊', '🎉'].map((emoji) => (
              <IconButton
                key={emoji}
                size="small"
                onClick={() => handleReaction(emoji)}
                sx={{ width: 24, height: 24, fontSize: '0.8rem' }}
              >
                {emoji}
              </IconButton>
            ))}
          </Stack>
        )}
      </Stack>
    )
  }

  const renderMessageActions = () => {
    if (!isHovered) return null

    return (
      <Fade in={isHovered}>
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            position: 'absolute',
            top: -8,
            right: isOwn ? 'auto' : -8,
            left: isOwn ? -8 : 'auto',
            bgcolor: 'background.paper',
            borderRadius: 1,
            boxShadow: 1,
            p: 0.5
          }}
        >
          <Tooltip title="React">
            <IconButton size="small" sx={{ width: 28, height: 28 }}>
              <EmojiEmotions fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Reply">
            <IconButton size="small" onClick={() => onReply?.(message.id)} sx={{ width: 28, height: 28 }}>
              <Reply fontSize="small" />
            </IconButton>
          </Tooltip>
          
          {isOwn && (
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => onEdit?.(message.id)} sx={{ width: 28, height: 28 }}>
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          <Tooltip title="More">
            <IconButton size="small" sx={{ width: 28, height: 28 }}>
              <MoreVert fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Fade>
    )
  }

  return (
    <Box
      ref={messageRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        display: 'flex',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        position: 'relative'
      }}
    >
      <Stack
        direction={isOwn ? 'row-reverse' : 'row'}
        spacing={1}
        alignItems="flex-start"
        sx={{ maxWidth: '85%' }}
      >
        {!isOwn && (
          <Badge
            badgeContent={collaborationUsers.filter(u => u.id === message.senderId).length > 0 ? <Sync sx={{ fontSize: 12 }} /> : null}
            color="primary"
          >
            <Avatar
              src={message.sender?.avatarUrl || undefined}
              sx={{ width: 32, height: 32 }}
            >
              {message.sender?.email?.[0]?.toUpperCase()}
            </Avatar>
          </Badge>
        )}
        
        <Box sx={{ position: 'relative', maxWidth: '100%' }}>
          {!isOwn && (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {message.sender?.nickname || message.sender?.email?.split('@')[0]}
              </Typography>
              
              {/* Real-time collaboration indicators */}
              {collaborationUsers.length > 0 && (
                <Stack direction="row" spacing={0.5}>
                  {collaborationUsers.slice(0, 3).map((user) => (
                    <Tooltip key={user.id} title={`${user.name} (${user.status})`}>
                      <Avatar
                        sx={{
                          width: 12,
                          height: 12,
                          fontSize: '0.6rem',
                          bgcolor: user.status === 'editing' ? 'success.main' : 'primary.main'
                        }}
                      >
                        {user.name[0]}
                      </Avatar>
                    </Tooltip>
                  ))}
                  {collaborationUsers.length > 3 && (
                    <Typography variant="caption" color="text.secondary">
                      +{collaborationUsers.length - 3}
                    </Typography>
                  )}
                </Stack>
              )}
            </Stack>
          )}
          
          <Paper
            elevation={isHovered ? 2 : 1}
            sx={{
              p: 1.5,
              bgcolor: isOwn ? 'primary.main' : 'background.paper',
              color: isOwn ? 'primary.contrastText' : 'text.primary',
              maxWidth: maxWidth,
              minHeight: minHeight > 0 ? minHeight : 'auto',
              position: 'relative',
              borderRadius: 2,
              '&:hover': {
                boxShadow: 3
              },
              transition: 'all 0.2s ease'
            }}
          >
            {renderMessageContent()}
            
            {/* Message timestamp and sync status */}
            <Stack 
              direction="row" 
              justifyContent="space-between" 
              alignItems="center" 
              sx={{ mt: 1 }}
            >
              <Typography
                variant="caption"
                sx={{
                  opacity: 0.7,
                  fontSize: '0.7rem'
                }}
              >
                {formatTime(message.createdAt)}
              </Typography>
              
              {/* Sync status for collaborative content */}
              {message.type && ['excalidraw', 'kanban', 'todo', 'poll'].includes(message.type) && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {syncStatus === 'syncing' && <CircularProgress size={12} />}
                  {syncStatus === 'synced' && <Check sx={{ fontSize: 12, color: 'success.main' }} />}
                  {syncStatus === 'error' && <Warning sx={{ fontSize: 12, color: 'error.main' }} />}
                </Box>
              )}
              
              {/* Expand/Collapse button for embeds */}
              {message.type && ['excalidraw', 'kanban', 'todo', 'poll'].includes(message.type) && (
                <IconButton 
                  size="small" 
                  onClick={handleToggleExpand}
                  sx={{ width: 20, height: 20 }}
                >
                  {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </IconButton>
              )}
            </Stack>
          </Paper>
          
          {/* Message reactions */}
          {renderReactions()}
          
          {/* Thread indicator */}
          {thread && thread.replies.length > 0 && (
            <Button
              size="small"
              startIcon={<Reply />}
              onClick={() => onReply?.(message.id)}
              sx={{
                mt: 0.5,
                textTransform: 'none',
                fontSize: '0.7rem'
              }}
            >
              {thread.replies.length} {thread.replies.length === 1 ? 'reply' : 'replies'}
            </Button>
          )}
          
          {/* Message actions overlay */}
          {renderMessageActions()}
        </Box>
      </Stack>
    </Box>
  )
}