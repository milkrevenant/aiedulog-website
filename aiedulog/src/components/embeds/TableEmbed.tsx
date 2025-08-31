'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Chip,
  Tooltip,
  Select,
  FormControl,
  InputLabel
} from '@mui/material'
import {
  Add,
  Delete,
  Edit,
  MoreVert,
  Save,
  Cancel,
  ViewColumn,
  TableChart,
  FilterList,
  Sort,
  Download,
  Upload
} from '@mui/icons-material'

interface TableColumn {
  id: string
  name: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'select'
  width?: number
  options?: string[] // For select type
}

interface TableRow {
  id: string
  data: Record<string, any>
  createdAt: string
  updatedAt?: string
}

interface TableEmbedProps {
  tableId?: string
  roomId?: string
  onChange?: (data: { columns: TableColumn[], rows: TableRow[] }) => void
}

export default function TableEmbed({ tableId, roomId, onChange }: TableEmbedProps) {
  const [columns, setColumns] = useState<TableColumn[]>([
    { id: '1', name: 'Column 1', type: 'text' },
    { id: '2', name: 'Column 2', type: 'text' }
  ])
  
  const [rows, setRows] = useState<TableRow[]>([
    { id: '1', data: { '1': 'Sample data 1', '2': 'Sample data 2' }, createdAt: new Date().toISOString() }
  ])

  const [editingCell, setEditingCell] = useState<{ rowId: string, columnId: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showColumnDialog, setShowColumnDialog] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [newColumnType, setNewColumnType] = useState<TableColumn['type']>('text')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null)

  useEffect(() => {
    onChange?.({ columns, rows })
  }, [columns, rows, onChange])

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      const newColumn: TableColumn = {
        id: Date.now().toString(),
        name: newColumnName.trim(),
        type: newColumnType
      }
      setColumns(prev => [...prev, newColumn])
      setNewColumnName('')
      setNewColumnType('text')
      setShowColumnDialog(false)
    }
  }

  const handleAddRow = () => {
    const newRow: TableRow = {
      id: Date.now().toString(),
      data: columns.reduce((acc, col) => ({ ...acc, [col.id]: '' }), {}),
      createdAt: new Date().toISOString()
    }
    setRows(prev => [...prev, newRow])
  }

  const handleDeleteRow = (rowId: string) => {
    setRows(prev => prev.filter(row => row.id !== rowId))
  }

  const handleDeleteColumn = (columnId: string) => {
    setColumns(prev => prev.filter(col => col.id !== columnId))
    setRows(prev => prev.map(row => ({
      ...row,
      data: Object.fromEntries(Object.entries(row.data).filter(([key]) => key !== columnId))
    })))
    setAnchorEl(null)
    setSelectedColumn(null)
  }

  const handleCellEdit = (rowId: string, columnId: string, currentValue: any) => {
    setEditingCell({ rowId, columnId })
    setEditValue(currentValue || '')
  }

  const handleCellSave = () => {
    if (editingCell) {
      setRows(prev => prev.map(row => 
        row.id === editingCell.rowId
          ? {
              ...row,
              data: { ...row.data, [editingCell.columnId]: editValue },
              updatedAt: new Date().toISOString()
            }
          : row
      ))
      setEditingCell(null)
      setEditValue('')
    }
  }

  const handleCellCancel = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const renderCellContent = (row: TableRow, column: TableColumn) => {
    const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id
    const value = row.data[column.id]

    if (isEditing) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 120 }}>
          <TextField
            size="small"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCellSave()
              if (e.key === 'Escape') handleCellCancel()
            }}
            autoFocus
            sx={{ flex: 1 }}
          />
          <IconButton size="small" onClick={handleCellSave} color="primary">
            <Save fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={handleCellCancel}>
            <Cancel fontSize="small" />
          </IconButton>
        </Box>
      )
    }

    return (
      <Box 
        sx={{ 
          cursor: 'pointer', 
          minHeight: 32, 
          display: 'flex', 
          alignItems: 'center',
          '&:hover': { bgcolor: 'action.hover' }
        }}
        onClick={() => handleCellEdit(row.id, column.id, value)}
      >
        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
          {value || <span style={{ opacity: 0.5 }}>Click to edit</span>}
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', height: '500px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={1}>
            <TableChart color="primary" />
            <Typography variant="h6">Data Table</Typography>
            <Chip label={`${rows.length} rows`} size="small" variant="outlined" />
          </Stack>
          
          <Stack direction="row" spacing={1}>
            <Tooltip title="Add Column">
              <IconButton onClick={() => setShowColumnDialog(true)} size="small">
                <ViewColumn />
              </IconButton>
            </Tooltip>
            <Tooltip title="Add Row">
              <IconButton onClick={handleAddRow} size="small">
                <Add />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export">
              <IconButton size="small">
                <Download />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.id} sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2">{column.name}</Typography>
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        setAnchorEl(e.currentTarget)
                        setSelectedColumn(column.id)
                      }}
                    >
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
              ))}
              <TableCell width={50}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                {columns.map((column) => (
                  <TableCell key={column.id}>
                    {renderCellContent(row, column)}
                  </TableCell>
                ))}
                <TableCell>
                  <IconButton 
                    size="small" 
                    onClick={() => handleDeleteRow(row.id)}
                    color="error"
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Column Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => {
          setAnchorEl(null)
          setSelectedColumn(null)
        }}
      >
        <MenuItem onClick={() => selectedColumn && handleDeleteColumn(selectedColumn)}>
          <Delete sx={{ mr: 1 }} />
          Delete Column
        </MenuItem>
      </Menu>

      {/* Add Column Dialog */}
      <Dialog open={showColumnDialog} onClose={() => setShowColumnDialog(false)}>
        <DialogTitle>Add New Column</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ minWidth: 300, pt: 1 }}>
            <TextField
              label="Column Name"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              fullWidth
              autoFocus
            />
            <FormControl fullWidth>
              <InputLabel>Column Type</InputLabel>
              <Select
                value={newColumnType}
                label="Column Type"
                onChange={(e) => setNewColumnType(e.target.value as TableColumn['type'])}
              >
                <MenuItem value="text">Text</MenuItem>
                <MenuItem value="number">Number</MenuItem>
                <MenuItem value="date">Date</MenuItem>
                <MenuItem value="boolean">Boolean</MenuItem>
                <MenuItem value="select">Select</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowColumnDialog(false)}>Cancel</Button>
          <Button onClick={handleAddColumn} variant="contained">Add Column</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}