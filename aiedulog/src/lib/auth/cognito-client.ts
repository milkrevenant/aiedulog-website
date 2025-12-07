'use client'

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
  IAuthenticationCallback,
} from 'amazon-cognito-identity-js'

const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || ''
const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || ''

const poolData = {
  UserPoolId: userPoolId,
  ClientId: clientId,
}

let userPool: CognitoUserPool | null = null

function getUserPool(): CognitoUserPool {
  if (!userPool) {
    if (!userPoolId || !clientId) {
      throw new Error('Cognito configuration missing. Set NEXT_PUBLIC_COGNITO_USER_POOL_ID and NEXT_PUBLIC_COGNITO_CLIENT_ID.')
    }
    userPool = new CognitoUserPool(poolData)
  }
  return userPool
}

export interface CognitoAuthResult {
  accessToken: string
  idToken: string
  refreshToken: string
  expiresIn: number
  sub: string
  email?: string
  groups?: string[]
}

export interface CognitoError {
  code: string
  message: string
  name: string
}

/**
 * Authenticate user with email and password
 */
export function authenticateUser(
  email: string,
  password: string
): Promise<CognitoAuthResult> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool()

    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    })

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: pool,
    })

    const callbacks: IAuthenticationCallback = {
      onSuccess: (session: CognitoUserSession) => {
        const idToken = session.getIdToken()
        const accessToken = session.getAccessToken()
        const refreshToken = session.getRefreshToken()

        // Extract groups from ID token payload
        const payload = idToken.decodePayload()
        const groups = payload['cognito:groups'] || []

        resolve({
          accessToken: accessToken.getJwtToken(),
          idToken: idToken.getJwtToken(),
          refreshToken: refreshToken.getToken(),
          expiresIn: accessToken.getExpiration(),
          sub: payload.sub,
          email: payload.email,
          groups,
        })
      },
      onFailure: (err: Error) => {
        reject(err)
      },
      newPasswordRequired: (_userAttributes, _requiredAttributes) => {
        // User needs to set a new password (first login with temp password)
        reject({
          code: 'NewPasswordRequired',
          message: '임시 비밀번호로 로그인했습니다. 새 비밀번호를 설정해주세요.',
          name: 'NewPasswordRequired',
          cognitoUser, // Pass the user object for completing the challenge
        })
      },
    }

    cognitoUser.authenticateUser(authDetails, callbacks)
  })
}

/**
 * Complete new password challenge (for first login with temp password)
 */
export function completeNewPasswordChallenge(
  cognitoUser: CognitoUser,
  newPassword: string
): Promise<CognitoAuthResult> {
  return new Promise((resolve, reject) => {
    cognitoUser.completeNewPasswordChallenge(newPassword, {}, {
      onSuccess: (session: CognitoUserSession) => {
        const idToken = session.getIdToken()
        const accessToken = session.getAccessToken()
        const refreshToken = session.getRefreshToken()
        const payload = idToken.decodePayload()

        resolve({
          accessToken: accessToken.getJwtToken(),
          idToken: idToken.getJwtToken(),
          refreshToken: refreshToken.getToken(),
          expiresIn: accessToken.getExpiration(),
          sub: payload.sub,
          email: payload.email,
          groups: payload['cognito:groups'] || [],
        })
      },
      onFailure: (err: Error) => {
        reject(err)
      },
    })
  })
}

/**
 * Sign out current user
 */
export function signOutUser(): void {
  const pool = getUserPool()
  const currentUser = pool.getCurrentUser()
  if (currentUser) {
    currentUser.signOut()
  }
}

/**
 * Get current authenticated user session
 */
export function getCurrentSession(): Promise<CognitoUserSession | null> {
  return new Promise((resolve) => {
    const pool = getUserPool()
    const currentUser = pool.getCurrentUser()

    if (!currentUser) {
      resolve(null)
      return
    }

    currentUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session) {
        resolve(null)
        return
      }
      resolve(session)
    })
  })
}

/**
 * Translate Cognito error codes to Korean messages
 */
export function translateCognitoError(error: any): string {
  const code = error?.code || error?.name || ''

  switch (code) {
    case 'UserNotFoundException':
      return '등록되지 않은 이메일입니다.'
    case 'NotAuthorizedException':
      return '이메일 또는 비밀번호가 올바르지 않습니다.'
    case 'UserNotConfirmedException':
      return '이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.'
    case 'PasswordResetRequiredException':
      return '비밀번호 재설정이 필요합니다.'
    case 'InvalidPasswordException':
      return '비밀번호가 요구사항을 충족하지 않습니다. (8자 이상, 대/소문자, 숫자, 특수문자 포함)'
    case 'InvalidParameterException':
      return '입력값이 올바르지 않습니다.'
    case 'TooManyRequestsException':
      return '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
    case 'LimitExceededException':
      return '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'
    case 'NewPasswordRequired':
      return '새 비밀번호 설정이 필요합니다.'
    case 'NetworkError':
      return '네트워크 연결을 확인해주세요.'
    default:
      return error?.message || '로그인 중 오류가 발생했습니다.'
  }
}
