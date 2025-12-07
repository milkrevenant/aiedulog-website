'use client'

import { createClient } from '@/lib/supabase/server'
import type { AppUser } from '@/lib/auth/types'

/**
 * Unified Chat System
 *
 * UPDATED: 2025-12-07 - Simplified for Cognito + user_profiles architecture
 *
 * Architecture:
 * Cognito user.id → user_profiles (by email) → chat_messages/chat_participants
 *
 * All chat operations use user_profiles.user_id directly.
 */

export interface ChatUser {
  authUserId: string      // Cognito user.id
  identityId: string      // user_profiles.user_id (same as authUserId in most cases)
  email: string
  nickname?: string
  avatarUrl?: string
  role: string
}

export interface ChatMessage {
  id: string
  roomId: string
  senderId: string        // user_profiles.user_id
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
  createdBy: string       // user_profiles.user_id
  createdAt: string
  participants?: ChatParticipant[]
}

export interface ChatParticipant {
  userId: string          // user_profiles.user_id
  profile: {
    email: string
    nickname?: string
    avatarUrl?: string
  }
}

/**
 * Get current user's chat info from user_profiles
 */
export async function getCurrentChatUser(user: AppUser): Promise<ChatUser | null> {
  const supabase = createClient()

  try {
    // Direct lookup by email in user_profiles
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('user_id, email, nickname, avatar_url, role')
      .eq('email', user.email)
      .single()

    if (error || !profile) {
      console.error('Profile not found:', error)
      return null
    }

    return {
      authUserId: user.id,
      identityId: profile.user_id,
      email: profile.email || user.email || 'unknown@example.com',
      nickname: profile.nickname || user.email?.split('@')[0] || 'Anonymous',
      avatarUrl: profile.avatar_url,
      role: profile.role || 'member'
    }
  } catch (error) {
    console.error('Failed to get chat user:', error)
    return null
  }
}

/**
 * Send chat message
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
        sender_id: chatUser.identityId,
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
 * Load chat messages with sender info
 */
export async function loadChatMessages(roomId: string): Promise<ChatMessage[]> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        user_profiles!chat_messages_sender_id_fkey (
          user_id,
          email,
          nickname,
          avatar_url
        )
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to load messages:', error)
      return []
    }

    return (data || []).map((msg: any) => ({
      id: msg.id,
      roomId: msg.room_id,
      senderId: msg.sender_id,
      message: msg.message,
      type: msg.type,
      attachments: msg.attachments,
      createdAt: msg.created_at,
      sender: msg.user_profiles ? {
        identityId: msg.user_profiles.user_id,
        email: msg.user_profiles.email,
        nickname: msg.user_profiles.nickname,
        avatarUrl: msg.user_profiles.avatar_url
      } : undefined
    }))
  } catch (error) {
    console.error('Load messages error:', error)
    return []
  }
}

/**
 * Create chat room
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
        created_by: chatUser.identityId,
        created_at: new Date().toISOString()
      }, { select: 'id' })

    const insertedRoom = Array.isArray(data) ? data?.[0] : data
    const roomId = (insertedRoom as { id?: string | null } | null | undefined)?.id || null

    if (error || !roomId) {
      console.error('Failed to create chat room:', error)
      return null
    }

    // Add creator as participant
    await supabase
      .from('chat_participants')
      .insert({
        room_id: roomId,
        user_id: chatUser.identityId,
        is_active: true
      })

    return roomId
  } catch (error) {
    console.error('Create room error:', error)
    return null
  }
}

/**
 * Check if message belongs to current user
 */
export function isMessageOwner(message: ChatMessage, chatUser: ChatUser): boolean {
  return message.senderId === chatUser.identityId
}

/**
 * Get display name for chat user
 */
export function getDisplayName(chatUser: ChatUser): string {
  return chatUser.nickname || chatUser.email.split('@')[0] || 'Anonymous'
}
