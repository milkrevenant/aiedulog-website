'use client'

import { useState, useCallback } from 'react'
import {
  M3Box,
  M3Button,
  M3IconButton,
  M3CircularProgress,
  M3Alert,
  M3Typography,
  M3Card,
  M3Icon,
} from '@/components/material3'
import { uploadFile, validateImageFile, deleteFile } from '@/lib/storage/upload'

interface ImageUploadProps {
  onImagesChange: (urls: string[]) => void
  maxImages?: number
  existingImages?: string[]
  bucket?: string
  folder?: string
}

export default function ImageUpload({
  onImagesChange,
  maxImages = 5,
  existingImages = [],
  bucket = 'post-images',
  folder,
}: ImageUploadProps) {
  const [images, setImages] = useState<string[]>(existingImages)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      setError(null)

      // 최대 이미지 개수 체크
      if (images.length + files.length > maxImages) {
        setError(`최대 ${maxImages}개의 이미지만 업로드할 수 있습니다.`)
        return
      }

      const validFiles: File[] = []

      // 파일 검증
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const validation = validateImageFile(file)

        if (!validation.valid) {
          setError(validation.error || '파일 검증 실패')
          return
        }

        validFiles.push(file)
      }

      // 업로드 시작
      setUploading(true)

      try {
        const uploadPromises = validFiles.map((file) => uploadFile(file, bucket, folder))
        const results = await Promise.all(uploadPromises)

        const successfulUploads = results
          .filter((result) => result.success && result.url)
          .map((result) => result.url!)

        if (successfulUploads.length > 0) {
          const newImages = [...images, ...successfulUploads]
          setImages(newImages)
          onImagesChange(newImages)
        }

        // 실패한 업로드 확인
        const failedUploads = results.filter((result) => !result.success)
        if (failedUploads.length > 0) {
          setError(`${failedUploads.length}개 파일 업로드 실패`)
        }
      } catch (err) {
        console.error('Upload error:', err)
        setError('이미지 업로드 중 오류가 발생했습니다.')
      } finally {
        setUploading(false)
      }
    },
    [images, maxImages, bucket, folder, onImagesChange]
  )

  const handleRemoveImage = useCallback(
    async (index: number) => {
      const imageUrl = images[index]

      // URL에서 파일 경로 추출 (Supabase URL 구조 기준)
      const urlParts = imageUrl.split(`/storage/v1/object/public/${bucket}/`)
      if (urlParts.length === 2) {
        const filePath = urlParts[1]
        await deleteFile(bucket, filePath)
      }

      const newImages = images.filter((_, i) => i !== index)
      setImages(newImages)
      onImagesChange(newImages)
    },
    [images, bucket, onImagesChange]
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files)
      }
    },
    [handleFileSelect]
  )

  return (
    <M3Box>
      {error && (
        <M3Box sx={{ marginBottom: '16px' }}>
          <M3Alert severity="error">{error}</M3Alert>
        </M3Box>
      )}

      {images.length < maxImages && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          style={{ marginBottom: '16px' }}
        >
          <M3Box
            sx={{
              padding: '24px',
              textAlign: 'center',
              backgroundColor: dragActive
                ? 'var(--md-sys-color-surface-container-high)'
                : 'var(--md-sys-color-surface)',
              border: '2px dashed',
              borderColor: dragActive
                ? 'var(--md-sys-color-primary)'
                : 'var(--md-sys-color-outline)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              borderRadius: '12px',
            }}
          >
            <input
              type="file"
              id="image-upload"
              multiple
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e.target.files)}
              disabled={uploading}
            />

            <label htmlFor="image-upload">
              <M3Box sx={{ cursor: 'pointer' }}>
                {uploading ? (
                  <M3CircularProgress />
                ) : (
                  <>
                    <M3Box
                      sx={{
                        fontSize: '48px',
                        color: 'var(--md-sys-color-primary)',
                        marginBottom: '8px',
                      }}
                    >
                      <M3Icon>cloud_upload</M3Icon>
                    </M3Box>
                    <M3Typography variant="title-large" sx={{ marginBottom: '8px' }}>
                      이미지 업로드
                    </M3Typography>
                    <M3Typography
                      variant="body-medium"
                      sx={{ color: 'var(--md-sys-color-on-surface-variant)' }}
                    >
                      클릭하거나 파일을 드래그하세요
                    </M3Typography>
                    <M3Typography
                      variant="label-small"
                      sx={{
                        color: 'var(--md-sys-color-on-surface-variant)',
                        display: 'block',
                        marginTop: '8px',
                      }}
                    >
                      JPG, PNG, GIF, WebP (최대 5MB)
                    </M3Typography>
                    <M3Typography
                      variant="label-small"
                      sx={{ color: 'var(--md-sys-color-on-surface-variant)' }}
                    >
                      {images.length} / {maxImages} 이미지
                    </M3Typography>
                  </>
                )}
              </M3Box>
            </label>
          </M3Box>
        </div>
      )}

      {images.length > 0 && (
        <M3Box>
          <M3Typography variant="body-medium" sx={{ marginBottom: '8px' }}>
            업로드된 이미지 ({images.length}/{maxImages})
          </M3Typography>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '8px',
              width: '100%',
            }}
          >
            {images.map((image, index) => (
              <div
                key={index}
                style={{
                  position: 'relative',
                  paddingBottom: '100%',
                  backgroundColor: 'var(--md-sys-color-surface-container)',
                  borderRadius: 'var(--md-sys-shape-corner-medium)',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={image}
                  alt={`업로드 이미지 ${index + 1}`}
                  loading="lazy"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    padding: '4px',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
                  }}
                >
                  <M3IconButton
                    icon="delete"
                    variant="standard"
                    onClick={() => handleRemoveImage(index)}
                  />
                </div>
              </div>
            ))}
          </div>
        </M3Box>
      )}
    </M3Box>
  )
}
