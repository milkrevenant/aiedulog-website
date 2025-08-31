'use client'

import { useState, useRef } from 'react'
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  LinearProgress,
  Stack,
  Chip,
  Tooltip,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import {
  CloudUpload,
  AttachFile,
  InsertDriveFile,
  Image,
  VideoFile,
  AudioFile,
  PictureAsPdf,
  Archive,
  Delete,
  Download,
  Share,
  MoreVert,
  DragIndicator,
  Folder,
  Link,
  Preview
} from '@mui/icons-material'

interface FileItem {
  id: string
  name: string
  type: string
  size: number
  url?: string
  uploadedAt: string
  uploadedBy?: string
  preview?: string
}

interface FileEmbedProps {
  fileId?: string
  roomId?: string
  onChange?: (files: FileItem[]) => void
}

export default function FileEmbed({ fileId, roomId, onChange }: FileEmbedProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [previewDialog, setPreviewDialog] = useState<FileItem | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image color="primary" />
    if (type.startsWith('video/')) return <VideoFile color="error" />
    if (type.startsWith('audio/')) return <AudioFile color="success" />
    if (type.includes('pdf')) return <PictureAsPdf color="error" />
    if (type.includes('zip') || type.includes('rar')) return <Archive color="warning" />
    return <InsertDriveFile />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (selectedFiles) {
      handleFileUpload(Array.from(selectedFiles))
    }
  }

  const handleFileUpload = async (filesToUpload: File[]) => {
    setUploading(true)
    setUploadProgress(0)

    // Simulate file upload with progress
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i]
      
      // Create preview for images
      let preview: string | undefined
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file)
      }

      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        setUploadProgress(progress)
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      const newFile: FileItem = {
        id: Date.now().toString() + i,
        name: file.name,
        type: file.type,
        size: file.size,
        preview,
        uploadedAt: new Date().toISOString(),
        url: URL.createObjectURL(file) // In real app, this would be from server
      }

      setFiles(prev => [...prev, newFile])
    }

    setUploading(false)
    setUploadProgress(0)
    onChange?.(files)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)
    
    const droppedFiles = Array.from(event.dataTransfer.files)
    if (droppedFiles.length > 0) {
      handleFileUpload(droppedFiles)
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDeleteFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
    setAnchorEl(null)
    setSelectedFile(null)
    onChange?.(files.filter(f => f.id !== fileId))
  }

  const handleDownloadFile = (file: FileItem) => {
    if (file.url) {
      const a = document.createElement('a')
      a.href = file.url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    setAnchorEl(null)
  }

  const handlePreviewFile = (file: FileItem) => {
    setPreviewDialog(file)
    setAnchorEl(null)
  }

  return (
    <Box sx={{ width: '100%', height: '400px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={1}>
            <Folder color="primary" />
            <Typography variant="h6">Files</Typography>
            <Chip label={`${files.length} files`} size="small" variant="outlined" />
          </Stack>
          
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<AttachFile />}
              onClick={() => fileInputRef.current?.click()}
              size="small"
            >
              Add Files
            </Button>
            <Button
              variant="contained"
              startIcon={<Link />}
              size="small"
            >
              Add Link
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Drop Zone */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto'
        }}
      >
        {files.length === 0 ? (
          <Box
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: 2,
              borderStyle: 'dashed',
              borderColor: dragOver ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              m: 2,
              p: 4,
              cursor: 'pointer',
              bgcolor: dragOver ? 'primary.50' : 'grey.50',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'primary.50'
              }
            }}
          >
            <CloudUpload sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Drop files here or click to upload
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Support for images, documents, videos, and more
            </Typography>
          </Box>
        ) : (
          <List sx={{ flex: 1, overflow: 'auto' }}>
            {files.map((file) => (
              <ListItem key={file.id} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <ListItemIcon>
                  {file.preview ? (
                    <Avatar
                      src={file.preview}
                      variant="rounded"
                      sx={{ width: 40, height: 40 }}
                    />
                  ) : (
                    <Avatar variant="rounded" sx={{ width: 40, height: 40 }}>
                      {getFileIcon(file.type)}
                    </Avatar>
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" noWrap>
                      {file.name}
                    </Typography>
                  }
                  secondary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(file.size)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        •
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(file.uploadedAt).toLocaleDateString()}
                      </Typography>
                    </Stack>
                  }
                />
                <ListItemSecondaryAction>
                  <Stack direction="row" spacing={0.5}>
                    {file.type.startsWith('image/') && (
                      <Tooltip title="Preview">
                        <IconButton
                          size="small"
                          onClick={() => handlePreviewFile(file)}
                        >
                          <Preview fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Download">
                      <IconButton
                        size="small"
                        onClick={() => handleDownloadFile(file)}
                      >
                        <Download fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setAnchorEl(e.currentTarget)
                        setSelectedFile(file.id)
                      }}
                    >
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </Stack>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}

        {/* Upload Progress */}
        {uploading && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" gutterBottom>
              Uploading files... {uploadProgress}%
            </Typography>
            <LinearProgress variant="determinate" value={uploadProgress} />
          </Box>
        )}
      </Box>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* File Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => {
          setAnchorEl(null)
          setSelectedFile(null)
        }}
      >
        <MenuItem onClick={() => selectedFile && handleDownloadFile(files.find(f => f.id === selectedFile)!)}>
          <Download sx={{ mr: 1 }} />
          Download
        </MenuItem>
        <MenuItem>
          <Share sx={{ mr: 1 }} />
          Share Link
        </MenuItem>
        <MenuItem onClick={() => selectedFile && handleDeleteFile(selectedFile)}>
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Preview Dialog */}
      <Dialog
        open={Boolean(previewDialog)}
        onClose={() => setPreviewDialog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {previewDialog?.name}
        </DialogTitle>
        <DialogContent>
          {previewDialog?.preview && (
            <img
              src={previewDialog.preview}
              alt={previewDialog.name}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '500px',
                objectFit: 'contain'
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(null)}>Close</Button>
          {previewDialog && (
            <Button
              variant="contained"
              onClick={() => handleDownloadFile(previewDialog)}
            >
              Download
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}