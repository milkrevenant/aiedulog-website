import { getServerSession } from 'next-auth'
import type { NextRequest } from 'next/server'

export async function getAuthSession() {
  try {
    // In App Router, getServerSession reads cookies automatically
    const session = await getServerSession()
    return session
  } catch (e) {
    return null
  }
}

export function mapSessionToUser(session: any) {
  if (!session?.user) return null
  return {
    id: session.user.email || session.user.name || 'unknown',
    email: session.user.email,
    name: session.user.name,
    image: (session.user as any).image,
    groups: (session.user as any).groups || [],
  }
}


