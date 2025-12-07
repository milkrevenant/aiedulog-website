import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider'
import * as crypto from 'crypto'

const region = process.env.COGNITO_REGION
const userPoolId = process.env.COGNITO_USER_POOL_ID
const clientId = process.env.COGNITO_CLIENT_ID
const clientSecret = process.env.COGNITO_CLIENT_SECRET

if (!region || !userPoolId || !clientId) {
  throw new Error('[NextAuth] Missing Cognito env. Set COGNITO_REGION, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID.')
}

const cognitoClient = new CognitoIdentityProviderClient({ region })

/**
 * Calculate SECRET_HASH for Cognito authentication
 */
function calculateSecretHash(username: string): string {
  if (!clientSecret) {
    throw new Error('COGNITO_CLIENT_SECRET is required')
  }
  const message = username + clientId
  const hmac = crypto.createHmac('sha256', clientSecret)
  hmac.update(message)
  return hmac.digest('base64')
}

/**
 * Decode JWT token payload
 */
function decodeJwtPayload(token: string): any {
  const base64Payload = token.split('.')[1]
  const payload = Buffer.from(base64Payload, 'base64').toString('utf-8')
  return JSON.parse(payload)
}

/**
 * Authenticate with Cognito directly using AWS SDK (supports client secret)
 */
async function authenticateCognito(
  email: string,
  password: string
): Promise<{
  sub: string
  email: string
  groups: string[]
  idToken: string
  accessToken: string
} | null> {
  try {
    const secretHash = calculateSecretHash(email)

    const command = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      ClientId: clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: secretHash,
      },
    })

    const response = await cognitoClient.send(command)

    if (!response.AuthenticationResult) {
      // Check for challenges like NEW_PASSWORD_REQUIRED
      if (response.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
        throw {
          code: 'NewPasswordRequired',
          message: 'New password required',
          session: response.Session,
        }
      }
      throw new Error('Authentication failed')
    }

    const { IdToken, AccessToken } = response.AuthenticationResult

    if (!IdToken || !AccessToken) {
      throw new Error('Missing tokens in response')
    }

    const payload = decodeJwtPayload(IdToken)

    return {
      sub: payload.sub,
      email: payload.email || email,
      groups: payload['cognito:groups'] || [],
      idToken: IdToken,
      accessToken: AccessToken,
    }
  } catch (error: any) {
    console.error('[Cognito Auth] Failed:', error.name || error.code, error.message)
    throw error
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'cognito-credentials',
      name: 'Cognito',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('이메일과 비밀번호를 입력해주세요.')
        }

        try {
          const result = await authenticateCognito(credentials.email, credentials.password)

          if (!result) {
            throw new Error('인증에 실패했습니다.')
          }

          // Return user object for NextAuth
          return {
            id: result.sub,
            email: result.email,
            name: result.email.split('@')[0],
            groups: result.groups,
            idToken: result.idToken,
            accessToken: result.accessToken,
          }
        } catch (error: any) {
          // Translate Cognito errors to user-friendly messages
          const code = error?.code || error?.name || error?.__type || ''

          switch (code) {
            case 'UserNotFoundException':
              throw new Error('등록되지 않은 이메일입니다.')
            case 'NotAuthorizedException':
              throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
            case 'UserNotConfirmedException':
              throw new Error('이메일 인증이 완료되지 않았습니다.')
            case 'PasswordResetRequiredException':
              throw new Error('비밀번호 재설정이 필요합니다.')
            case 'NewPasswordRequired':
              throw new Error('NEW_PASSWORD_REQUIRED') // Special marker
            default:
              throw new Error(error?.message || '로그인 중 오류가 발생했습니다.')
          }
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user?: any }) {
      // On initial sign-in, copy user data to token
      if (user) {
        token.sub = user.id
        token.email = user.email
        token.groups = user.groups || []
        token.idToken = user.idToken
        token.accessToken = user.accessToken
      }
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session && token) {
        session.user.id = token.sub
        session.user.sub = token.sub
        session.user.email = token.email
        session.user.groups = token.groups || []
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
