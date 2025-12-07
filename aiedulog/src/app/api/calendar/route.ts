import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { queryWithAuth } from '@/lib/db/rds-client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    
    // Basic query
    let sql = `
      SELECT 
        ce.*,
        up.full_name as created_by_name 
      FROM calendar_events ce
      LEFT JOIN user_profiles up ON ce.created_by = up.user_id
      WHERE 1=1
    `
    const params: any[] = []
    
    // Date filtering
    if (start) {
      params.push(start)
      sql += ` AND ce.end_date >= $${params.length}`
    }
    if (end) {
      params.push(end)
      sql += ` AND ce.start_date <= $${params.length}`
    }
    
    // Order by start date
    sql += ` ORDER BY ce.start_date ASC`
    
    // We can also pass jwtClaims if we want RLS to filter private events automatically.
    // However, for public events, RLS might hide them if we don't handle the "anon" case well in Postgres,
    // or if we rely strictly on the queryWithAuth to inject the user ID.
    // Our migration RLS says: 
    // - Public: (is_public = true)
    // - Private: (auth.uid() = created_by) -> which comes from get_current_user_id()
    
    const session = await getServerSession(authOptions)
    const userSub = (session?.user as any)?.sub
    const jwtClaims = userSub ? { sub: userSub } : undefined
    
    const { rows } = await queryWithAuth(sql, params, jwtClaims)
    
    return NextResponse.json(rows)
  } catch (error: any) {
    console.error('Failed to fetch user events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    // Permission check: Must be authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check roles (admin, moderator, verified)
    const roles = (session.user as any).groups || []
    const canCreate = roles.some((r: string) => ['admin', 'moderator', 'verified'].includes(r))
    
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, start_date, end_date, category, is_public } = body
    
    if (!title || !start_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const sql = `
      INSERT INTO calendar_events (
        title, description, start_date, end_date, category, is_public, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 
        (SELECT user_id FROM auth_methods WHERE provider = 'cognito' AND auth_provider_id = $7 LIMIT 1)
      )
      RETURNING *
    `
    // Note: We resolve user_id from auth_methods because session.user.sub is the Cognito Sub check
    
    const jwtClaims = { sub: (session.user as any).sub }
    const params = [
      title, 
      description || '', 
      start_date, 
      end_date || null, 
      category || 'event', 
      is_public !== false, // default true
      (session.user as any).sub
    ]

    const { rows } = await queryWithAuth(sql, params, jwtClaims)
    
    return NextResponse.json(rows[0])
    
  } catch (error: any) {
    console.error('Failed to create event:', error)
    return NextResponse.json(
      { error: 'Failed to create event', details: error.message },
      { status: 500 }
    )
  }
}
