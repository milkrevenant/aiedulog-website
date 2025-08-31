'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  InputLabel,
  Alert,
  Tooltip,
  Autocomplete,
  Avatar,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
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
  FilterList,
  Sort,
} from '@mui/icons-material';
import { createClient } from '@/lib/supabase/client';
import { getUserIdentity } from '@/lib/identity/helpers';

// Import our new types and utilities
import type { TodoData, TodoItem, BaseEmbedProps } from '@/lib/types/embed';
import { 
  deepClone, 
  updateArrayItemById, 
  addToArray, 
  removeFromArrayById 
} from '@/lib/utils/immutable';
import { useDebounce } from '@/lib/utils/ssr-safe';

interface UserProfile {
  id: string
  email: string
  nickname?: string
  avatar_url?: string
  role?: string
}

type TodoFilter = 'all' | 'pending' | 'completed' | 'high-priority' | 'overdue';
type TodoSort = 'created' | 'priority' | 'dueDate' | 'assignee';

interface TodoEmbedV2Props extends BaseEmbedProps<TodoData> {
  // Additional props for V2 functionality
  enableAdvancedFeatures?: boolean
}

const TodoEmbedV2: React.FC<TodoEmbedV2Props> = React.memo(({
  data,
  onChange,
  readOnly = false,
  width = 600,
  height = 400,
  currentUserId = 'user-1',
  currentUserName = 'You'
}) => {
  // Local state with proper immutability
  const [newItemText, setNewItemText] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<TodoItem | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; itemId: string } | null>(null);
  const [filter, setFilter] = useState<TodoFilter>('all');
  const [sortBy, setSortBy] = useState<TodoSort>('created');
  
  // Debounced search for performance
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  // User identity integration
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  
  const supabase = createClient();

  // Utility functions with proper immutability
  const isOverdue = useCallback((item: TodoItem): boolean => {
    if (!item.dueDate || item.completed) return false;
    return new Date(item.dueDate) < new Date();
  }, []);

  const getPriorityIcon = useCallback((priority?: string) => {
    switch (priority) {
      case 'high': return <Flag color="error" />;
      case 'medium': return <Flag color="warning" />;
      case 'low': return <Flag color="info" />;
      default: return null;
    }
  }, []);
  
  // Load users from identity system using helper
  const loadUsers = useCallback(async () => {
    if (readOnly) return;
    
    setLoadingUsers(true);
    try {
      // Use simplified query for active user profiles
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
        .limit(50);

      if (identityError) throw identityError;

      const mappedUsers = identityData?.map(profile => ({
        id: profile.identity_id,
        email: profile.email,
        nickname: profile.nickname,
        avatar_url: profile.avatar_url,
        role: profile.role
      })) || [];

      setUsers(mappedUsers);
      
      // Set current user profile (first user for demo)
      if (mappedUsers.length > 0 && !currentUserProfile) {
        setCurrentUserProfile(mappedUsers[0]);
      }
    } catch (error) {
      console.warn('Failed to load users from identity system:', error);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [readOnly, supabase, currentUserProfile]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Memoized filtered and sorted items for performance
  const filteredItems = useMemo(() => {
    let items = [...data.items];

    // Apply search filter
    if (debouncedSearch) {
      items = items.filter(item => 
        item.text.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        item.description?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        item.assignee?.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }

    // Apply category filter
    items = items.filter(item => {
      switch (filter) {
        case 'pending': return !item.completed;
        case 'completed': return item.completed;
        case 'high-priority': return item.priority === 'high';
        case 'overdue': return isOverdue(item);
        default: return true;
      }
    });

    // Apply sorting
    items.sort((a, b) => {
      // Always put incomplete items first
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      // Then sort by selected criteria
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          if (aPriority !== bPriority) return bPriority - aPriority;
          break;
        case 'dueDate':
          if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          }
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          break;
        case 'assignee':
          if (a.assignee && b.assignee) {
            return a.assignee.localeCompare(b.assignee);
          }
          if (a.assignee) return -1;
          if (b.assignee) return 1;
          break;
      }

      // Default to creation time
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return items;
  }, [data.items, filter, sortBy, debouncedSearch, isOverdue]);

  // Safe state update functions
  const safeOnChange = useCallback((newData: TodoData) => {
    onChange(deepClone(newData));
  }, [onChange]);

  const addItem = useCallback(() => {
    if (!newItemText.trim() || readOnly) return;

    const newItem: TodoItem = {
      id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: newItemText.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    const newData: TodoData = {
      ...data,
      items: addToArray(data.items, newItem),
    };

    safeOnChange(newData);
    setNewItemText('');
    setShowAddItem(false);
  }, [newItemText, readOnly, data, safeOnChange]);

  const toggleItem = useCallback((itemId: string) => {
    if (readOnly) return;

    const newData: TodoData = {
      ...data,
      items: updateArrayItemById(data.items, itemId, (item) => ({
        ...item,
        completed: !item.completed,
        completedAt: !item.completed ? new Date().toISOString() : undefined,
      })),
    };

    safeOnChange(newData);
  }, [readOnly, data, safeOnChange]);

  const deleteItem = useCallback((itemId: string) => {
    if (readOnly) return;

    const newData: TodoData = {
      ...data,
      items: removeFromArrayById(data.items, itemId),
    };

    safeOnChange(newData);
    setMenuAnchor(null);
  }, [readOnly, data, safeOnChange]);

  const updateItem = useCallback((updatedItem: TodoItem) => {
    if (readOnly) return;

    const newData: TodoData = {
      ...data,
      items: updateArrayItemById(data.items, updatedItem.id, () => updatedItem),
    };

    safeOnChange(newData);
    setEditingItem(null);
  }, [readOnly, data, safeOnChange]);

  // Statistics
  const completedCount = data.items.filter(item => item.completed).length;
  const totalCount = data.items.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Box
      sx={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header with stats and controls */}
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
            <Typography variant="h6" component="h2">
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
            <TextField
              size="small"
              placeholder="Search todos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ minWidth: 150 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={filter}
                onChange={(e) => setFilter(e.target.value as TodoFilter)}
                displayEmpty
                startAdornment={<FilterList sx={{ mr: 1, color: 'action.active' }} />}
              >
                <MenuItem value="all">All Items</MenuItem>
                <MenuItem value="pending">📋 Pending</MenuItem>
                <MenuItem value="completed">✅ Completed</MenuItem>
                <MenuItem value="high-priority">🔴 High Priority</MenuItem>
                <MenuItem value="overdue">⚠️ Overdue</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as TodoSort)}
                displayEmpty
                startAdornment={<Sort sx={{ mr: 1, color: 'action.active' }} />}
              >
                <MenuItem value="created">Date</MenuItem>
                <MenuItem value="priority">Priority</MenuItem>
                <MenuItem value="dueDate">Due Date</MenuItem>
                <MenuItem value="assignee">Assignee</MenuItem>
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
                  addItem();
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
                setShowAddItem(false);
                setNewItemText('');
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
              
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      textDecoration: item.completed ? 'line-through' : 'none'
                    }}
                  >
                    {item.text}
                  </Typography>
                
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
                      avatar={
                        users.find(u => u.id === item.assignee)?.avatar_url ? (
                          <Avatar 
                            src={users.find(u => u.id === item.assignee)?.avatar_url} 
                            sx={{ width: 16, height: 16 }}
                          />
                        ) : undefined
                      }
                      label={users.find(u => u.id === item.assignee)?.nickname || 
                             users.find(u => u.id === item.assignee)?.email || 
                             `@${item.assignee}`}
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
                
                {/* Priority flag positioned independently */}
                <Box sx={{ 
                  ml: 1, 
                  display: 'flex', 
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  minHeight: '24px',
                  paddingTop: '2px'
                }}>
                  {getPriorityIcon(item.priority)}
                </Box>
              </Box>
              
              {!readOnly && (
                <IconButton
                  size="small"
                  onClick={(e) => setMenuAnchor({ element: e.currentTarget, itemId: item.id })}
                >
                  <MoreVert />
                </IconButton>
              )}
            </ListItem>
          ))}

          {filteredItems.length === 0 && (
            <ListItem>
              <Alert severity="info" sx={{ width: '100%' }}>
                {filter === 'all' 
                  ? 'No todo items yet. Click "Add Item" to get started!' 
                  : `No ${filter} items found.`}
              </Alert>
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
            const item = data.items.find(item => item.id === menuAnchor?.itemId);
            if (item) {
              setEditingItem(deepClone(item));
            }
            setMenuAnchor(null);
          }}
        >
          <Edit sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuAnchor) {
              deleteItem(menuAnchor.itemId);
            }
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Edit Todo Dialog */}
      <Dialog
        open={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Todo Item</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Title */}
            <TextField
              fullWidth
              label="Title"
              value={editingItem?.text || ''}
              onChange={(e) => setEditingItem(prev => 
                prev ? { ...prev, text: e.target.value } : null
              )}
              required
            />
            
            {/* Description */}
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
            
            <Stack direction="row" spacing={2}>
              {/* Priority */}
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={editingItem?.priority || ''}
                  onChange={(e) => setEditingItem(prev => 
                    prev ? { ...prev, priority: e.target.value as 'low' | 'medium' | 'high' } : null
                  )}
                  label="Priority"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  <MenuItem value="low">🟢 Low</MenuItem>
                  <MenuItem value="medium">🟡 Medium</MenuItem>
                  <MenuItem value="high">🔴 High</MenuItem>
                </Select>
              </FormControl>
              
              {/* Estimated Hours */}
              <TextField
                label="Estimated Hours"
                type="number"
                value={editingItem?.estimatedHours || ''}
                onChange={(e) => setEditingItem(prev => 
                  prev ? { ...prev, estimatedHours: e.target.value ? Number(e.target.value) : undefined } : null
                )}
                sx={{ minWidth: 140 }}
                inputProps={{ min: 0, step: 0.5 }}
              />
            </Stack>
            
            <Stack direction="row" spacing={2}>
              {/* Assignee */}
              <Autocomplete
                sx={{ flex: 1 }}
                options={users}
                getOptionLabel={(option) => option.nickname || option.email}
                value={users.find(u => u.id === editingItem?.assignee) || null}
                onChange={(_, value) => setEditingItem(prev => 
                  prev ? { ...prev, assignee: value?.id || '' } : null
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
              
              {/* Category */}
              <TextField
                label="Category"
                value={editingItem?.category || ''}
                onChange={(e) => setEditingItem(prev => 
                  prev ? { ...prev, category: e.target.value } : null
                )}
                sx={{ flex: 1 }}
              />
            </Stack>
            
            {/* Due Date */}
            <TextField
              fullWidth
              type="date"
              label="Due Date"
              value={editingItem?.dueDate ? editingItem.dueDate.split('T')[0] : ''}
              onChange={(e) => setEditingItem(prev => 
                prev ? { 
                  ...prev, 
                  dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                } : null
              )}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: <Schedule sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
            
            {/* Tags */}
            <TextField
              fullWidth
              label="Tags (comma separated)"
              value={editingItem?.tags?.join(', ') || ''}
              onChange={(e) => setEditingItem(prev => 
                prev ? { 
                  ...prev, 
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) 
                } : null
              )}
              placeholder="e.g., urgent, frontend, bug-fix"
            />
            
            {/* Progress */}
            <Box>
              <Typography variant="body2" gutterBottom>
                Progress: {editingItem?.progress || 0}%
              </Typography>
              <Box sx={{ px: 1 }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editingItem?.progress || 0}
                  onChange={(e) => setEditingItem(prev => 
                    prev ? { ...prev, progress: Number(e.target.value) } : null
                  )}
                  style={{ width: '100%' }}
                />
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingItem(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => editingItem && updateItem(editingItem)}
            disabled={!editingItem?.text?.trim()}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

TodoEmbedV2.displayName = 'TodoEmbedV2';

export default TodoEmbedV2;