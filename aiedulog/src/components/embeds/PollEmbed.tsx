'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Switch,
  Divider,
  Avatar,
  Tooltip,
  Menu,
  MenuItem,
  Badge,
  Autocomplete,
  ListItemAvatar
} from '@mui/material'
import {
  Add,
  Delete,
  Edit,
  Poll as PollIcon,
  HowToVote,
  BarChart,
  Share,
  GetApp,
  Refresh,
  Timer,
  People,
  Visibility,
  Comment,
  Send,
  PersonAdd,
  Notifications,
  Check,
  MoreVert,
  FormatListBulleted
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

interface PollVote {
  userId: string
  userProfile?: UserProfile
  timestamp: string
}

interface PollComment {
  id: string
  text: string
  authorId: string
  authorProfile?: UserProfile
  createdAt: string
  mentions?: string[]
}

interface PollOption {
  id: string
  text: string
  votes: number
  voteDetails?: PollVote[] // Detailed voting information
  voters?: string[] // Legacy support
}

interface PollData {
  question: string
  options: PollOption[]
  allowMultiple: boolean
  anonymous: boolean
  createdAt: string
  endsAt?: string
  allowAddOptions?: boolean
  currentUserVotes?: string[] // IDs of options the current user voted for
  participants?: UserProfile[] // Invited or mentioned participants
  comments?: PollComment[]
  createdBy?: UserProfile
  tags?: string[]
  isPublic?: boolean
}

interface PollEmbedProps {
  data: PollData
  onChange: (data: PollData) => void
  readOnly?: boolean
  width?: number
  height?: number
  currentUserId?: string
  currentUserName?: string
}

export default function PollEmbed({
  data,
  onChange,
  readOnly = false,
  width = 600,
  height = 400,
  currentUserId = 'user-1', // Mock user ID
  currentUserName = 'You'
}: PollEmbedProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>(
    data.currentUserVotes || []
  )
  const [editMode, setEditMode] = useState(false)
  const [editedQuestion, setEditedQuestion] = useState(data.question)
  const [editedOptions, setEditedOptions] = useState(data.options)
  const [newOptionText, setNewOptionText] = useState('')
  const [showAddOption, setShowAddOption] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [showParticipants, setShowParticipants] = useState(false)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [currentView, setCurrentView] = useState<'poll' | 'list' | 'participants' | 'edit'>('poll')
  
  const supabase = createClient()

  const totalVotes = data.options.reduce((sum, option) => sum + option.votes, 0)
  const hasVoted = (data.currentUserVotes?.length || 0) > 0
  const isPollEnded = data.endsAt ? new Date() > new Date(data.endsAt) : false
  
  // Mock polls data - in real app this would come from props or context
  const [allPolls] = useState([
    {
      id: 'poll-1',
      question: data.question,
      totalVotes: totalVotes,
      totalParticipants: data.participants?.length || 0,
      commentsCount: data.comments?.length || 0,
      status: isPollEnded ? 'ended' as const : 'active' as const,
      createdAt: data.createdAt,
      endsAt: data.endsAt,
      createdBy: data.createdBy?.nickname || data.createdBy?.email
    }
  ])
  
  // Load users from identity system using simplified query
  const loadUsers = async () => {
    if (readOnly) return
    
    setLoadingUsers(true)
    try {
      const { data: identityData, error: identityError } = await supabase
        .from('user_profiles')
        .select(`
          identity_id,
          email,
          nickname,
          avatar_url,
          role
        `)
        .eq('is_active', true)
        .limit(50)

      if (identityError) throw identityError

      const mappedUsers = identityData?.map(profile => ({
        id: profile.identity_id,
        email: profile.email,
        nickname: profile.nickname,
        avatar_url: profile.avatar_url,
        role: profile.role
      })) || []

      setUsers(mappedUsers)
      
      // Set current user profile (first user for demo)
      if (mappedUsers.length > 0 && !currentUserProfile) {
        setCurrentUserProfile(mappedUsers[0])
      }
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

  const handleVote = (optionId: string) => {
    if (readOnly || isPollEnded) return

    // Allow re-voting by clearing previous votes first
    let newSelectedOptions: string[]
    
    if (data.allowMultiple) {
      if (selectedOptions.includes(optionId)) {
        newSelectedOptions = selectedOptions.filter(id => id !== optionId)
      } else {
        newSelectedOptions = [...selectedOptions, optionId]
      }
    } else {
      newSelectedOptions = selectedOptions.includes(optionId) ? [] : [optionId]
    }

    setSelectedOptions(newSelectedOptions)
  }

  const submitVote = () => {
    if (selectedOptions.length === 0) return

    const newData = { ...data }
    
    // Remove previous votes if re-voting
    if (hasVoted && data.currentUserVotes) {
      newData.options = newData.options.map(option => {
        if (data.currentUserVotes!.includes(option.id)) {
          return {
            ...option,
            votes: Math.max(0, option.votes - 1),
            voteDetails: option.voteDetails?.filter(vote => vote.userId !== currentUserId) || [],
            voters: option.voters?.filter(voter => voter !== currentUserName) || []
          }
        }
        return option
      })
    }
    
    // Add new votes
    const voteTimestamp = new Date().toISOString()
    newData.options = newData.options.map(option => {
      if (selectedOptions.includes(option.id)) {
        const newVote: PollVote = {
          userId: currentUserId,
          userProfile: currentUserProfile || undefined,
          timestamp: voteTimestamp
        }
        
        return {
          ...option,
          votes: option.votes + 1,
          voteDetails: [...(option.voteDetails || []), newVote],
          voters: data.anonymous ? option.voters : [...(option.voters || []), currentUserName]
        }
      }
      return option
    })

    // Record user's vote
    newData.currentUserVotes = selectedOptions

    onChange(newData)
    setSelectedOptions([])
  }

  const addOption = () => {
    if (!newOptionText.trim()) return

    const newOption: PollOption = {
      id: `option-${Date.now()}`,
      text: newOptionText.trim(),
      votes: 0,
      voters: []
    }

    const newData = {
      ...data,
      options: [...data.options, newOption]
    }

    onChange(newData)
    setNewOptionText('')
    setShowAddOption(false)
  }

  const saveEdit = () => {
    const newData = {
      ...data,
      question: editedQuestion,
      options: editedOptions
    }

    onChange(newData)
    setEditMode(false)
  }

  const cancelEdit = () => {
    setEditedQuestion(data.question)
    setEditedOptions(data.options)
    setEditMode(false)
  }

  const removeOption = (optionId: string) => {
    setEditedOptions(editedOptions.filter(opt => opt.id !== optionId))
  }

  const updateOption = (optionId: string, newText: string) => {
    setEditedOptions(editedOptions.map(opt => 
      opt.id === optionId ? { ...opt, text: newText } : opt
    ))
  }

  const getOptionPercentage = (votes: number) => {
    return totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
  }
  
  const addComment = () => {
    if (!newComment.trim() || readOnly || !currentUserProfile) return

    const mentions = extractMentions(newComment)
    const comment: PollComment = {
      id: `comment-${Date.now()}`,
      text: newComment,
      authorId: currentUserId,
      authorProfile: currentUserProfile,
      createdAt: new Date().toISOString(),
      mentions
    }

    const newData = {
      ...data,
      comments: [...(data.comments || []), comment]
    }

    onChange(newData)
    setNewComment('')
  }

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@([a-zA-Z0-9._-]+)/g
    const matches = text.match(mentionRegex)
    if (!matches) return []
    
    return matches
      .map(match => match.substring(1))
      .map(mention => {
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
  
  const addParticipant = (user: UserProfile) => {
    if (!data.participants) {
      const newData = {
        ...data,
        participants: [user]
      }
      onChange(newData)
    } else if (!data.participants.find(p => p.id === user.id)) {
      const newData = {
        ...data,
        participants: [...data.participants, user]
      }
      onChange(newData)
    }
  }

  return (
    <Box
      sx={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper'
      }}
    >
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <PollIcon color="primary" />
            <Typography variant="h6">Poll</Typography>
            {isPollEnded && (
              <Chip label="Ended" color="error" variant="outlined" size="small" />
            )}
            {hasVoted && (
              <Chip label="Voted" color="success" variant="outlined" size="small" />
            )}
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <People fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {totalVotes} votes
              </Typography>
            </Stack>
            
            <IconButton size="small" title="Refresh Results">
              <Refresh fontSize="small" />
            </IconButton>
            
            <IconButton size="small" title="Share Poll">
              <Share fontSize="small" />
            </IconButton>
            
            <IconButton size="small" title="Export Results">
              <GetApp fontSize="small" />
            </IconButton>
            
            <IconButton 
              size="small" 
              title="Comments"
              onClick={() => setShowComments(!showComments)}
            >
              <Badge badgeContent={data.comments?.length || 0} color="primary">
                <Comment fontSize="small" />
              </Badge>
            </IconButton>
            
            <IconButton 
              size="small" 
              title="Participants"
              onClick={() => setCurrentView('participants')}
            >
              <Badge badgeContent={data.participants?.length || 0} color="secondary">
                <People fontSize="small" />
              </Badge>
            </IconButton>
            
            <Tooltip title="View all polls">
              <IconButton 
                size="small" 
                onClick={() => setCurrentView('list')}
              >
                <FormatListBulleted fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <IconButton
              size="small"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              title="More options"
            >
              <MoreVert fontSize="small" />
            </IconButton>
            
            {!readOnly && !isPollEnded && (
              <IconButton
                size="small"
                onClick={() => setCurrentView('edit')}
                title="Edit Poll"
              >
                <Edit />
              </IconButton>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Navigation Breadcrumb */}
      {currentView !== 'poll' && (
        <Box sx={{ p: 2, pb: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Button 
              size="small" 
              onClick={() => setCurrentView('poll')}
              sx={{ textTransform: 'none' }}
            >
              ← Back to Poll
            </Button>
            <Typography variant="body2" color="text.secondary">
              {currentView === 'list' ? '/ All Polls' : '/ Participants'}
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Main Content Area */}
      {currentView === 'poll' && (
        <>
          {/* Question */}
          <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {data.question}
        </Typography>
        
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
          {data.allowMultiple && (
            <Chip 
              icon={<BarChart />} 
              label="Multiple choice" 
              size="small" 
              color="info" 
              variant="outlined" 
            />
          )}
          
          {data.anonymous && (
            <Chip 
              icon={<Visibility />} 
              label="Anonymous" 
              size="small" 
              color="secondary" 
              variant="outlined" 
            />
          )}
          
          {data.allowAddOptions && (
            <Chip 
              icon={<Add />} 
              label="Can add options" 
              size="small" 
              color="primary" 
              variant="outlined" 
            />
          )}
          
          {data.endsAt && (
            <Chip 
              icon={<Timer />} 
              label={`Ends ${new Date(data.endsAt).toLocaleDateString()}`} 
              size="small" 
              color={isPollEnded ? "error" : "warning"} 
              variant="outlined" 
            />
          )}
        </Stack>
      </Box>

      {/* Options */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2 }}>
        <List>
          {data.options.map((option) => {
            const percentage = getOptionPercentage(option.votes)
            const isSelected = selectedOptions.includes(option.id)
            const userVoted = data.currentUserVotes?.includes(option.id)
            
            return (
              <ListItem
                key={option.id}
                sx={{
                  border: 1,
                  borderColor: userVoted ? 'success.main' : isSelected ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  mb: 1,
                  cursor: (!readOnly && !isPollEnded) ? 'pointer' : 'default',
                  bgcolor: userVoted ? 'success.50' : isSelected ? 'primary.50' : 'transparent',
                  '&:hover': (!readOnly && !isPollEnded) ? {
                    bgcolor: 'action.hover',
                    borderColor: isSelected ? 'primary.main' : 'primary.light'
                  } : {},
                  transition: 'all 0.2s ease'
                }}
                onClick={() => handleVote(option.id)}
              >
                <Box sx={{ width: '100%' }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="body1">
                      {option.text}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="body2" color="text.secondary">
                        {option.votes} votes ({percentage}%)
                      </Typography>
                      {userVoted && (
                        <Chip label="Your vote" size="small" color="success" variant="outlined" />
                      )}
                    </Stack>
                  </Stack>
                  
                  <LinearProgress
                    variant="determinate"
                    value={percentage}
                    sx={{ 
                      mt: 1, 
                      height: 8, 
                      borderRadius: 4,
                      bgcolor: 'grey.200'
                    }}
                    color={userVoted ? 'success' : 'primary'}
                  />
                  
                  {!data.anonymous && option.voters && option.voters.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      Voted by: {option.voters.slice(0, 3).join(', ')}
                      {option.voters.length > 3 && ` +${option.voters.length - 3} more`}
                    </Typography>
                  )}
                </Box>
              </ListItem>
            )
          })}
        </List>

        {/* Add Option */}
        {data.allowAddOptions && !readOnly && !isPollEnded && (
          <Box sx={{ mt: 2 }}>
            {showAddOption ? (
              <Stack spacing={1}>
                <TextField
                  fullWidth
                  placeholder="Enter new option..."
                  value={newOptionText}
                  onChange={(e) => setNewOptionText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addOption()
                    }
                  }}
                  size="small"
                />
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="contained" onClick={addOption}>
                    Add Option
                  </Button>
                  <Button size="small" onClick={() => {
                    setShowAddOption(false)
                    setNewOptionText('')
                  }}>
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Button
                startIcon={<Add />}
                onClick={() => setShowAddOption(true)}
                variant="outlined"
                size="small"
              >
                Add Option
              </Button>
            )}
          </Box>
        )}
      </Box>

      {/* Vote Action */}
      {!readOnly && !isPollEnded && selectedOptions.length > 0 && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<HowToVote />}
            onClick={submitVote}
            disabled={selectedOptions.length === 0}
          >
            {hasVoted ? 'Change Vote' : 'Submit Vote'}{data.allowMultiple && selectedOptions.length > 1 ? `s (${selectedOptions.length})` : ''}
          </Button>
        </Box>
      )}

      {/* Edit Poll View */}
      {(currentView as string) === 'edit' && (
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <Typography variant="h6" gutterBottom>Edit Poll</Typography>
          
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Question"
              value={editedQuestion}
              onChange={(e) => setEditedQuestion(e.target.value)}
              multiline
              rows={2}
            />

            <Typography variant="subtitle2">Options</Typography>
            {editedOptions.map((option, index) => (
              <Stack key={option.id} direction="row" spacing={1} alignItems="center">
                <TextField
                  fullWidth
                  label={`Option ${index + 1}`}
                  value={option.text}
                  onChange={(e) => updateOption(option.id, e.target.value)}
                />
                <IconButton
                  color="error"
                  onClick={() => removeOption(option.id)}
                  disabled={editedOptions.length <= 2}
                >
                  <Delete />
                </IconButton>
              </Stack>
            ))}

            <Button
              startIcon={<Add />}
              onClick={() => {
                const newOption: PollOption = {
                  id: `option-${Date.now()}`,
                  text: '',
                  votes: 0,
                  voters: []
                }
                setEditedOptions([...editedOptions, newOption])
              }}
              variant="outlined"
            >
              Add Option
            </Button>

            <Divider />

            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={data.allowMultiple}
                    onChange={(e) => onChange({ ...data, allowMultiple: e.target.checked })}
                  />
                }
                label="Allow multiple selections"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={data.anonymous}
                    onChange={(e) => onChange({ ...data, anonymous: e.target.checked })}
                  />
                }
                label="Anonymous voting"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={data.allowAddOptions || false}
                    onChange={(e) => onChange({ ...data, allowAddOptions: e.target.checked })}
                  />
                }
                label="Allow users to add options"
              />
              
              <TextField
                fullWidth
                type="datetime-local"
                label="Poll End Time (optional)"
                value={data.endsAt ? data.endsAt.slice(0, 16) : ''}
                onChange={(e) => onChange({ 
                  ...data, 
                  endsAt: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                })}
                InputLabelProps={{ shrink: true }}
                helperText="Leave empty for no expiration"
              />
            </Stack>
            
            <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
              <Button onClick={() => setCurrentView('poll')}>Cancel</Button>
              <Button
                variant="contained"
                onClick={() => {
                  saveEdit()
                  setCurrentView('poll')
                }}
              >
                Save Changes
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}

      {/* Comments Section - only show in poll view */}
      {currentView === 'poll' && showComments && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', maxHeight: 200, overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>Comments</Typography>
          
          {/* Existing Comments */}
          {data.comments?.map((comment) => (
            <Stack key={comment.id} direction="row" spacing={1} sx={{ mb: 1 }}>
              <Avatar sx={{ width: 24, height: 24 }} src={comment.authorProfile?.avatar_url}>
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
                <Typography variant="body2" sx={{ mt: 0.25 }}>
                  {renderMentions(comment.text)}
                </Typography>
              </Box>
            </Stack>
          ))}
          
          {/* Add Comment */}
          {!readOnly && (
            <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 2 }}>
              <Avatar sx={{ width: 24, height: 24 }} src={currentUserProfile?.avatar_url}>
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
                    addComment()
                  }
                }}
                multiline
                maxRows={3}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      size="small"
                      onClick={addComment}
                      disabled={!newComment.trim()}
                      color="primary"
                    >
                      <Send fontSize="small" />
                    </IconButton>
                  )
                }}
              />
            </Stack>
          )}
          
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
      
        </>
      )}

      {/* Poll List View */}
      {currentView === 'list' && (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>All Polls</Typography>
            
            {/* Poll List */}
            <Stack spacing={2}>
              {allPolls.map((poll) => (
                <Paper 
                  key={poll.id} 
                  sx={{ p: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  onClick={() => setCurrentView('poll')}
                >
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                        {poll.question}
                      </Typography>
                      
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <Chip
                          label={poll.status === 'active' ? 'Active' : 'Ended'}
                          size="small"
                          color={poll.status === 'active' ? 'success' : 'error'}
                          variant="filled"
                        />
                        <Typography variant="caption" color="text.secondary">
                          {poll.totalVotes} votes • {poll.totalParticipants} participants
                        </Typography>
                      </Stack>
                      
                      <LinearProgress
                        variant="determinate"
                        value={poll.totalParticipants > 0 ? (poll.totalVotes / poll.totalParticipants) * 100 : 0}
                        sx={{ height: 4, borderRadius: 2 }}
                      />
                    </Box>
                    
                    <IconButton size="small">
                      <MoreVert />
                    </IconButton>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        </Box>
      )}

      {/* Participants View */}
      {currentView === 'participants' && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6">Participants</Typography>
            {!readOnly && (
              <Autocomplete
                size="small"
                options={users.filter(u => !data.participants?.find(p => p.id === u.id))}
                getOptionLabel={(option) => option.nickname || option.email}
                onChange={(_, value) => value && addParticipant(value)}
                loading={loadingUsers}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Add participant"
                    sx={{ minWidth: 220 }}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: <PersonAdd fontSize="small" sx={{ mr: 0.5 }} />
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <ListItem {...props}>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 24, height: 24 }} src={option.avatar_url}>
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
              />
            )}
          </Stack>
          
          <Stack spacing={1}>
            {data.participants?.map((participant) => (
              <Stack key={participant.id} direction="row" alignItems="center" spacing={1}>
                <Avatar sx={{ width: 32, height: 32 }} src={participant.avatar_url}>
                  {participant.nickname?.[0] || participant.email[0]}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    {participant.nickname || participant.email}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {participant.email}
                  </Typography>
                </Box>
                {data.currentUserVotes?.length ? (
                  <Tooltip title="Has voted">
                    <Check color="success" fontSize="small" />
                  </Tooltip>
                ) : (
                  <Tooltip title="Hasn't voted yet">
                    <Notifications color="action" fontSize="small" />
                  </Tooltip>
                )}
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      
      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          navigator.clipboard.writeText(window.location.href + '#poll-' + data.createdAt)
          setMenuAnchor(null)
        }}>
          <Share sx={{ mr: 1 }} /> Copy Poll Link
        </MenuItem>
        <MenuItem onClick={() => {
          const results = data.options.map(opt => `${opt.text}: ${opt.votes} votes (${getOptionPercentage(opt.votes)}%)`).join('\n')
          navigator.clipboard.writeText(`Poll: ${data.question}\n\n${results}\n\nTotal votes: ${totalVotes}`)
          setMenuAnchor(null)
        }}>
          <GetApp sx={{ mr: 1 }} /> Copy Results
        </MenuItem>
        {!readOnly && (
          <MenuItem onClick={() => {
            setCurrentView('edit')
            setMenuAnchor(null)
          }}>
            <Edit sx={{ mr: 1 }} /> Edit Poll
          </MenuItem>
        )}
      </Menu>
    </Box>
  )
}