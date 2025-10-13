import { NextRequest, NextResponse } from 'next/server';
import { queryWithAuth } from '@/lib/db/rds-client';
import { requireAuth } from '@/lib/auth/jwt-middleware';

export const GET = async (req: NextRequest) => {
  try {
    const jwtClaimsHeader = req.headers.get('x-jwt-claims');
    const jwtClaims = jwtClaimsHeader ? JSON.parse(jwtClaimsHeader) : null;
    const { rows: posts } = await queryWithAuth(
      `SELECT p.id, p.title, p.content, p.category, p.is_published, p.created_at, p.view_count,
              u.username as author_username, u.avatar_url as author_avatar
       FROM posts p LEFT JOIN user_profiles u ON p.author_id = u.user_id
       ORDER BY p.created_at DESC LIMIT 20`,
      [],
      jwtClaims || undefined
    );
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
};

export const POST = requireAuth(
  async (req: NextRequest, authContext) => {
    try {
      const body = await req.json();
      const { title, content, category, is_published } = body;
      if (!title || !content) {
        return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
      }

      const jwtClaimsHeader = req.headers.get('x-jwt-claims');
      const jwtClaims = jwtClaimsHeader ? JSON.parse(jwtClaimsHeader) : null;

      const {
        rows: [newPost],
      } = await queryWithAuth(
        `INSERT INTO posts (author_id, title, content, category, is_published)
         VALUES ((SELECT user_id FROM auth_methods WHERE provider = 'cognito' AND auth_provider_id = $1), $2, $3, $4, $5)
         RETURNING *`,
        [authContext.user!.cognitoSub, title, content, category, is_published || false],
        jwtClaims || undefined
      );
      return NextResponse.json({ post: newPost }, { status: 201 });
    } catch (error) {
      console.error('Error creating post:', error);
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }
  },
  { requireActive: true }
);
