import { NextRequest, NextResponse } from 'next/server'
import { withPublicSecurity } from '@/lib/security/api-wrapper'
import { SecurityContext } from '@/lib/security/core-security'
import { getPool } from '@/lib/db/rds-client'

const pool = getPool()

const postHandler = async (
  _request: NextRequest,
  context: SecurityContext,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  const { id } = await params
  
  const client = await pool.connect()
  try {
    await client.query('UPDATE lectures SET view_count = view_count + 1 WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Lectures] Failed to increment view count:', error)
    return NextResponse.json({ error: 'Failed to increment view count' }, { status: 500 })
  } finally {
    client.release()
  }
}

export const POST = withPublicSecurity(postHandler)
