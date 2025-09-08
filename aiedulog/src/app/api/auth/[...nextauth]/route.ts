'use server'

import NextAuth from 'next-auth'
import Cognito from 'next-auth/providers/cognito'

const region = process.env.COGNITO_REGION
const userPoolId = process.env.COGNITO_USER_POOL_ID
const clientId = process.env.COGNITO_CLIENT_ID
const clientSecret = process.env.COGNITO_CLIENT_SECRET || ''

if (!region || !userPoolId || !clientId) {
  console.warn('[NextAuth] Missing Cognito env. Set COGNITO_REGION, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID.')
}

const issuer = region && userPoolId
  ? `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`
  : undefined

const authOptions = {
  providers: [
    Cognito({
      clientId: clientId || '',
      clientSecret,
      issuer,
      checks: ['pkce', 'state'],
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name || profile.nickname || profile.email?.split('@')[0] || 'User',
          email: profile.email,
          image: (profile as any).picture || null,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt' as const,
  },
  callbacks: {
    async jwt({ token, account }: { token: any; account?: any }) {
      try {
        // On initial sign-in, extract Cognito groups from id_token if present
        if (account && (account as any).id_token) {
          const idToken: string = (account as any).id_token
          const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString('utf8'))
          if (payload && payload['cognito:groups']) {
            ;(token as any).groups = payload['cognito:groups']
          }
        }
      } catch {}
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session && token) {
        ;(session.user as any).groups = (token as any).groups || []
      }
      return session
    },
  },
  cookies: {
    // Rely on defaults; production will use __Secure- cookies under HTTPS
  },
  // Optionally customize pages in future
  // pages: { signIn: '/auth/login' },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }


