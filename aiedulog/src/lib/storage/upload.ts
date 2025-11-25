import { createClient } from '@/lib/supabase/server'

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
  path?: string
}

/**
 * 파일을 Supabase Storage에 업로드
 *
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 * @param file - 업로드할 파일
 * @param bucket - 저장할 버킷 이름 (post-images, avatars, resources)
 * @param folder - 버킷 내 폴더 경로 (optional)
 * @returns 업로드 결과
 */
export async function uploadFile(
  file: File,
  bucket: string,
  folder?: string
): Promise<UploadResult> {
  try {
    const supabase = createClient()

    // 파일명 생성 (timestamp + random + original name)
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const fileExt = file.name.split('.').pop()
    const fileName = `${timestamp}_${random}.${fileExt}`

    // 전체 경로 생성
    const filePath = folder ? `${folder}/${fileName}` : fileName

    // 파일 업로드
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

    if (error) {
      console.error('Upload error:', error)
      return { success: false, error: (error as any)?.message || 'Upload failed' }
    }

    // Public URL 가져오기
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath)

    return {
      success: true,
      url: publicUrl,
      path: filePath,
    }
  } catch (error) {
    console.error('Upload exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다',
    }
  }
}

/**
 * 여러 파일을 동시에 업로드
 * @param files - 업로드할 파일 배열
 * @param bucket - 저장할 버킷 이름
 * @param folder - 버킷 내 폴더 경로 (optional)
 * @returns 업로드 결과 배열
 */
export async function uploadMultipleFiles(
  files: File[],
  bucket: string,
  folder?: string
): Promise<UploadResult[]> {
  const uploadPromises = files.map((file) => uploadFile(file, bucket, folder))
  return Promise.all(uploadPromises)
}

/**
 * Supabase Storage에서 파일 삭제
 * @param bucket - 버킷 이름
 * @param path - 파일 경로
 * @returns 삭제 성공 여부
 */
export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  try {
    const supabase = createClient()

    const { error } = await supabase.storage.from(bucket).remove([path])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete exception:', error)
    return false
  }
}

/**
 * 이미지 파일 검증
 * @param file - 검증할 파일
 * @param maxSize - 최대 크기 (bytes, 기본값: 5MB)
 * @returns 검증 결과
 */
export function validateImageFile(
  file: File,
  maxSize: number = 5 * 1024 * 1024
): { valid: boolean; error?: string } {
  // 파일 타입 검증
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: '지원되지 않는 파일 형식입니다. (JPG, PNG, GIF, WebP만 가능)',
    }
  }

  // 파일 크기 검증
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024)
    return {
      valid: false,
      error: `파일 크기는 ${maxSizeMB}MB를 초과할 수 없습니다.`,
    }
  }

  return { valid: true }
}

/**
 * Base64 이미지를 File 객체로 변환
 * @param base64 - Base64 문자열
 * @param fileName - 파일명
 * @returns File 객체
 */
export function base64ToFile(base64: string, fileName: string): File {
  const arr = base64.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }

  return new File([u8arr], fileName, { type: mime })
}
