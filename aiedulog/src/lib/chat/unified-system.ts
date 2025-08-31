'use client'

import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { getOrCreateIdentity } from '@/lib/identity/migration'

/**
 * 통합 채팅 시스템 - Identity 기반 완전 구현
 * 
 * 아키텍처:
 * auth.users.id → auth_methods.provider_user_id → auth_methods.identity_id
 *                                                     ↓
 *                                            identities.id → user_profiles.identity_id
 *                                                     ↓
 *                                            chat_messages.sender_id (identity_id 사용)
 *                                            chat_participants.user_id (identity_id 사용)
 */

export interface ChatUser {
  authUserId: string      // auth.users.id
  identityId: string      // identities.id
  email: string
  nickname?: string
  avatarUrl?: string
  role: string
}

export interface ChatMessage {
  id: string
  roomId: string
  senderId: string        // identity_id
  message: string
  type?: string
  attachments?: any
  createdAt: string
  sender?: {
    identityId: string
    email: string
    nickname?: string
    avatarUrl?: string
  }
}

export interface ChatRoom {
  id: string
  name?: string
  type: 'direct' | 'group' | 'collaboration'
  createdBy: string       // identity_id로 통일
  createdAt: string
  participants?: ChatParticipant[]
}

export interface ChatParticipant {
  userId: string          // identity_id
  profile: {
    email: string
    nickname?: string
    avatarUrl?: string
  }
}

/**
 * 현재 사용자의 완전한 채팅 정보 가져오기
 */
export async function getCurrentChatUser(user: User): Promise<ChatUser | null> {
  const supabase = createClient()

  try {
    // Secure logging: production-safe (no console output in production)
    
    // Step 1: auth.users.id → identity_id 매핑
    const { data: authMethod, error: authError } = await supabase
      .from('auth_methods')
      .select(`
        identity_id,
        identities!inner (
          id,
          user_profiles!inner (
            email,
            nickname,
            avatar_url,
            role
          )
        )
      `)
      .eq('provider', 'supabase')  // 중요: provider 필터 추가
      .eq('provider_user_id', user.id)
      .single()
    
    // Secure logging: production-safe (no console output in production)
    
    if (authError || !authMethod?.identities?.[0]?.user_profiles?.[0]) {
      console.error('Auth method or profile not found:', authError)
      // Identity가 없으면 생성 시도
      const identityId = await getOrCreateIdentity(user)
      if (!identityId) {
        return null
      }
      // 재시도
      return getCurrentChatUser(user)
    }
    
    const profile = authMethod.identities[0].user_profiles[0]
    const identityId = authMethod.identity_id

    // 이미 profile을 가져왔으므로 직접 사용
    const result = {
      authUserId: user.id,
      identityId: identityId,
      email: profile.email || user.email || 'unknown@example.com',
      nickname: profile.nickname || user.email?.split('@')[0] || 'Anonymous',
      avatarUrl: profile.avatar_url || user.user_metadata?.avatar_url,
      role: profile.role || 'user'
    }

    // Secure logging: production-safe (no console output in production)
    return result
  } catch (error) {
    console.error('Failed to get chat user:', error)
    return null
  }
}

/**
 * Identity 기반 메시지 전송
 */
export async function sendChatMessage(
  roomId: string, 
  message: string, 
  chatUser: ChatUser,
  type: string = 'text',
  attachments?: any
): Promise<boolean> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: chatUser.identityId,  // Identity ID 사용
        message,
        type,
        attachments,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to send message:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Message send error:', error)
    return false
  }
}

/**
 * Identity 기반 메시지 로딩
 */
export async function loadChatMessages(roomId: string): Promise<ChatMessage[]> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        identities!chat_messages_sender_id_fkey (
          id,
          user_profiles!user_profiles_identity_id_fkey (
            email,
            nickname,
            avatar_url
          )
        )
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to load messages:', error)
      return []
    }

    return data.map(msg => ({
      id: msg.id,
      roomId: msg.room_id,
      senderId: msg.sender_id,
      message: msg.message,
      type: msg.type,
      attachments: msg.attachments,
      createdAt: msg.created_at,
      sender: msg.identities?.user_profiles ? {
        identityId: msg.identities.id,
        email: msg.identities.user_profiles.email,
        nickname: msg.identities.user_profiles.nickname,
        avatarUrl: msg.identities.user_profiles.avatar_url
      } : undefined
    }))
  } catch (error) {
    console.error('Load messages error:', error)
    return []
  }
}

/**
 * Identity 기반 채팅방 생성
 */
export async function createChatRoom(
  name: string,
  type: 'direct' | 'group' | 'collaboration',
  chatUser: ChatUser
): Promise<string | null> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('chat_rooms')
      .insert({
        name,
        type,
        created_by: chatUser.identityId,  // Identity ID 사용
        created_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to create chat room:', error)
      return null
    }

    // 생성자를 참가자로 추가
    await supabase
      .from('chat_participants')
      .insert({
        room_id: data.id,
        user_id: chatUser.identityId,  // Identity ID 사용
        is_active: true
      })

    return data.id
  } catch (error) {
    console.error('Create room error:', error)
    return null
  }
}

/**
 * 메시지 소유자 확인
 */
export function isMessageOwner(message: ChatMessage, chatUser: ChatUser): boolean {
  return message.senderId === chatUser.identityId
}

/**
 * 사용자 표시명
 */
export function getDisplayName(chatUser: ChatUser): string {
  return chatUser.nickname || chatUser.email.split('@')[0] || 'Anonymous'
}