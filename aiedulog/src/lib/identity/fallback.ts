'use client'

import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

/**
 * 임시 Fallback 시스템
 * Identity 시스템이 작동하지 않는 상황에서 사용
 */

export interface FallbackUserData {
  id: string
  email: string
  displayName: string
}

/**
 * auth.users에서 직접 사용자 정보 가져오기
 */
export async function getFallbackUserData(user: User): Promise<FallbackUserData> {
  return {
    id: user.id,
    email: user.email || 'unknown@example.com',
    displayName: user.email?.split('@')[0] || 'Anonymous'
  }
}

/**
 * 메시지 전송용 - auth.users.id 직접 사용
 */
export function getFallbackSenderId(user: User): string {
  return user.id
}

/**
 * 메시지 소유자 확인 - auth.users.id 직접 비교
 */
export function isFallbackMessageOwner(messageSenderId: string, currentUserId: string): boolean {
  return messageSenderId === currentUserId
}