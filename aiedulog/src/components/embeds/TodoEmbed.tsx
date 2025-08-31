'use client'

import { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Chip,
  Stack,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Select,
  InputLabel
} from '@mui/material'
import {
  Add,
  Delete,
  Edit,
  MoreVert,
  Flag,
  Schedule,
  CheckCircle,
  RadioButtonUnchecked,
  Person,
  FlashOn
} from '@mui/icons-material'

interface TodoItem {
  id: string
  text: string
  completed: boolean
  createdAt: string
  completedAt?: string
  priority?: 'low' | 'medium' | 'high'
  dueDate?: string
  assignee?: string
  tags?: string[]
  description?: string
  estimatedHours?: number
}

interface TodoData {
  items: TodoItem[]
  categories?: string[]
}

interface TodoEmbedProps {
  data: TodoData
  onChange: (data: TodoData) => void
  readOnly?: boolean
  width?: number
  height?: number
}

export default function TodoEmbed({
  data,
  onChange,
  readOnly = false,
  width = 600,
  height = 400
}: TodoEmbedProps) {
  const [newItemText, setNewItemText] = useState('')
  const [showAddItem, setShowAddItem] = useState(false)
  const [editingItem, setEditingItem] = useState<TodoItem | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement, itemId: string } | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'high-priority' | 'overdue'>('all')

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case 'high': return <Flag color="error" />
      case 'medium': return <Flag color="warning" />
      case 'low': return <Flag color="info" />
      default: return null
    }
  }

  const isOverdue = (item: TodoItem) => {
    if (!item.dueDate || item.completed) return false
    return new Date(item.dueDate) < new Date()
  }

  const filteredItems = data.items.filter(item => {
    switch (filter) {
      case 'pending': return !item.completed
      case 'completed': return item.completed
      case 'high-priority': return item.priority === 'high'
      default: return true
    }
  }).sort((a, b) => {
    // Sort by: incomplete first, then by priority, then by creation date
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1
    }
    
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority
    }
    
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  const addItem = () => {
    if (!newItemText.trim() || readOnly) return

    const newItem: TodoItem = {
      id: `todo-${Date.now()}`,
      text: newItemText.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    }

    const newData = {
      ...data,
      items: [...data.items, newItem]
    }

    onChange(newData)
    setNewItemText('')
    setShowAddItem(false)
  }

  const toggleItem = (itemId: string) => {
    if (readOnly) return

    const newData = {
      ...data,
      items: data.items.map(item => {
        if (item.id === itemId) {
          const completed = !item.completed
          return {
            ...item,
            completed,
            completedAt: completed ? new Date().toISOString() : undefined
          }
        }
        return item
      })
    }

    onChange(newData)
  }

  const deleteItem = (itemId: string) => {
    if (readOnly) return

    const newData = {
      ...data,
      items: data.items.filter(item => item.id !== itemId)
    }

    onChange(newData)
    setMenuAnchor(null)
  }

  const updateItem = (updatedItem: TodoItem) => {
    if (readOnly) return

    const newData = {
      ...data,
      items: data.items.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      )
    }

    onChange(newData)
    setEditingItem(null)
  }

  const completedCount = data.items.filter(item => item.completed).length
  const totalCount = data.items.length
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

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
      {/* Header with stats and filters */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="h6">
              Todo List
            </Typography>
            <Chip
              label={`${completedCount}/${totalCount}`}
              color={completionPercentage === 100 ? 'success' : 'primary'}
              variant="outlined"
            />
            {completionPercentage > 0 && (
              <Typography variant="body2" color="text.secondary">
                {completionPercentage}% complete
              </Typography>
            )}
          </Stack>

          <Stack direction="row" spacing={1}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                displayEmpty
              >
                <MenuItem value="all">All Items</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="high-priority">High Priority</MenuItem>
              </Select>
            </FormControl>
            
            {!readOnly && (
              <Button
                startIcon={<Add />}
                onClick={() => setShowAddItem(true)}
                variant="contained"
                size="small"
              >
                Add Item
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Todo List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {showAddItem && (
          <Paper sx={{ m: 1, p: 2 }}>
            <TextField
              fullWidth
              placeholder="Enter todo item..."
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addItem()
                }
              }}
              autoFocus
              size="small"
            />
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button size="small" variant="contained" onClick={addItem}>
                Add
              </Button>
              <Button size="small" onClick={() => {
                setShowAddItem(false)
                setNewItemText('')
              }}>
                Cancel
              </Button>
            </Stack>
          </Paper>
        )}

        <List>
          {filteredItems.map((item) => (
            <ListItem
              key={item.id}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                opacity: item.completed ? 0.6 : 1,
                '&:hover': !readOnly ? {
                  bgcolor: 'action.hover'
                } : {}
              }}
            >
              <ListItemIcon>
                <Checkbox
                  checked={item.completed}
                  onChange={() => toggleItem(item.id)}
                  disabled={readOnly}
                  icon={<RadioButtonUnchecked />}
                  checkedIcon={<CheckCircle color="success" />}
                />
              </ListItemIcon>
              
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography
                    variant="body1"
                    sx={{
                      textDecoration: item.completed ? 'line-through' : 'none'
                    }}
                  >
                    {item.text}
                  </Typography>
                  {getPriorityIcon(item.priority)}
                </Stack>
                
                <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                  {item.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ width: '100%', mb: 0.5 }}>
                      {item.description.length > 60 ? item.description.substring(0, 60) + '...' : item.description}
                    </Typography>
                  )}
                  
                  {item.tags?.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      size="small"
                      variant="outlined"
                      sx={{ height: 18, fontSize: '0.7rem' }}
                    />
                  ))}
                  
                  {item.assignee && (
                    <Chip
                      label={`@${item.assignee}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ height: 18 }}
                    />
                  )}
                  
                  {item.dueDate && (
                    <Chip
                      icon={<Schedule />}
                      label={new Date(item.dueDate).toLocaleDateString()}
                      size="small"
                      color={isOverdue(item) ? 'error' : 'warning'}
                      variant={isOverdue(item) ? 'filled' : 'outlined'}
                      sx={{ height: 18 }}
                    />
                  )}
                  
                  {item.estimatedHours && (
                    <Chip
                      label={`${item.estimatedHours}h`}
                      size="small"
                      color="info"
                      variant="outlined"
                      sx={{ height: 18 }}
                    />
                  )}
                </Stack>
              </Box>
              
              {!readOnly && (
                <ListItemSecondaryAction>
                  <IconButton
                    size="small"
                    onClick={(e) => setMenuAnchor({ element: e.currentTarget, itemId: item.id })}
                  >
                    <MoreVert />
                  </IconButton>
                </ListItemSecondaryAction>
              )}
            </ListItem>
          ))}

          {filteredItems.length === 0 && (
            <ListItem>
              <ListItemText
                primary={
                  <Typography variant="body2" color="text.secondary" align="center">
                    {filter === 'all' ? 'No todo items yet' : `No ${filter} items`}
                  </Typography>
                }
              />
            </ListItem>
          )}
        </List>
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            const item = data.items.find(item => item.id === menuAnchor?.itemId)
            if (item) {
              setEditingItem(item)
            }
            setMenuAnchor(null)
          }}
        >
          <Edit sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuAnchor) {
              deleteItem(menuAnchor.itemId)
            }
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Edit Dialog */}
      <Dialog
        open={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Todo Item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Title"
              value={editingItem?.text || ''}
              onChange={(e) => setEditingItem(prev => 
                prev ? { ...prev, text: e.target.value } : null
              )}
            />
            
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={editingItem?.description || ''}
              onChange={(e) => setEditingItem(prev => 
                prev ? { ...prev, description: e.target.value } : null
              )}
            />

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={editingItem?.priority || ''}
                label="Priority"
                onChange={(e) => setEditingItem(prev => 
                  prev ? { ...prev, priority: e.target.value as any } : null
                )}
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Assignee"
              value={editingItem?.assignee || ''}
              onChange={(e) => setEditingItem(prev => 
                prev ? { ...prev, assignee: e.target.value } : null
              )}
            />

            <TextField
              fullWidth
              type="date"
              label="Due Date"
              value={editingItem?.dueDate ? editingItem.dueDate.split('T')[0] : ''}
              onChange={(e) => setEditingItem(prev => 
                prev ? { ...prev, dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined } : null
              )}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingItem(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => editingItem && updateItem(editingItem)}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}