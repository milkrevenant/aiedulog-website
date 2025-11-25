/**
 * Database Client (Browser)
 *
 * IMPORTANT: Client-side code should NOT directly connect to database
 * Use API routes instead. This file now returns a no-op client that warns developers.
 * Migration completed: 2025-10-13
 */

export function createClient() {
  // Client-side code should use API routes, not direct database access
  // Return a warning proxy that helps developers migrate properly
  return {
    from: (table: string) => {
      console.warn(
        `[RDS Migration] Client-side code should not directly access database table "${table}". ` +
        `Please use API routes instead (e.g., /api/${table}).`
      )

      // Return chainable stub methods that accept but ignore parameters
      const stubResponse = { data: null, error: { message: 'Use API routes from client-side code' } }
      const chainStub: any = {
        select: (..._args: any[]) => chainStub,
        insert: (..._args: any[]) => chainStub,
        update: (..._args: any[]) => chainStub,
        delete: (..._args: any[]) => chainStub,
        upsert: (..._args: any[]) => chainStub,
        eq: (..._args: any[]) => chainStub,
        neq: (..._args: any[]) => chainStub,
        gt: (..._args: any[]) => chainStub,
        gte: (..._args: any[]) => chainStub,
        lt: (..._args: any[]) => chainStub,
        lte: (..._args: any[]) => chainStub,
        like: (..._args: any[]) => chainStub,
        ilike: (..._args: any[]) => chainStub,
        is: (..._args: any[]) => chainStub,
        in: (..._args: any[]) => chainStub,
        contains: (..._args: any[]) => chainStub,
        containedBy: (..._args: any[]) => chainStub,
        rangeGt: (..._args: any[]) => chainStub,
        rangeGte: (..._args: any[]) => chainStub,
        rangeLt: (..._args: any[]) => chainStub,
        rangeLte: (..._args: any[]) => chainStub,
        rangeAdjacent: (..._args: any[]) => chainStub,
        overlaps: (..._args: any[]) => chainStub,
        textSearch: (..._args: any[]) => chainStub,
        match: (..._args: any[]) => chainStub,
        not: (..._args: any[]) => chainStub,
        or: (..._args: any[]) => chainStub,
        filter: (..._args: any[]) => chainStub,
        order: (..._args: any[]) => chainStub,
        limit: (..._args: any[]) => chainStub,
        range: (..._args: any[]) => chainStub,
        abortSignal: (..._args: any[]) => chainStub,
        single: () => stubResponse,
        maybeSingle: () => stubResponse,
        csv: () => stubResponse,
        geojson: () => stubResponse,
        explain: () => stubResponse,
        then: (resolve: any) => resolve(stubResponse),
        // Make it thenable so it works with await
        data: null,
        error: { message: 'Use API routes from client-side code' }
      }
      return chainStub
    },

    auth: {
      getSession: async () => {
        // Use NextAuth on client side
        const res = await fetch('/api/auth/session')
        const session = await res.json()
        return { data: { session }, error: null }
      },
      getUser: async () => {
        const res = await fetch('/api/auth/session')
        const session = await res.json()
        return { data: { user: session?.user || null }, error: null }
      },
      signOut: async () => {
        await fetch('/api/auth/signout', { method: 'POST' })
        return { error: null }
      },
      signInWithPassword: async (_credentials: { email: string; password: string }) => {
        const user: { id: string } | null = null
        const session: { user: { id: string } | null } | null = null
        return {
          data: { user, session },
          error: { message: 'Use API routes for authentication' } as any,
        }
      },
      signInWithOAuth: async (_params: Record<string, unknown>) => {
        const user: { id: string } | null = null
        const session: { user: { id: string } | null } | null = null
        return {
          data: { user, session },
          error: { message: 'Use API routes for authentication' } as any,
        }
      },
      signUp: async (_params: Record<string, unknown>) => {
        const user: { id: string } | null = null
        const session: { user: { id: string } | null } | null = null
        return {
          data: { user, session },
          error: { message: 'Use API routes for authentication' } as any,
        }
      },
      resetPasswordForEmail: async (_email: string, _options?: { redirectTo?: string }) => ({
        data: null,
        error: { message: 'Use API routes for password reset' } as any,
      }),
      updateUser: async (_attributes: Record<string, unknown>) => ({
        data: { user: null },
        error: { message: 'Use API routes for authentication' } as any,
      }),
    },

    rpc: async (_fnName: string, _params?: Record<string, unknown>) => ({
      data: null,
      error: { message: 'Use API routes instead of rpc from the client' },
    }),

    storage: {
      from: (bucket: string) => ({
        upload: async (
          path: string,
          _file: File | Blob | ArrayBuffer | ArrayBufferView | string,
          _options?: Record<string, unknown>
        ) => ({
          data: {
            path,
            id: `${bucket}/${path}`,
            fullPath: `${bucket}/${path}`,
          },
          error: { message: 'Use S3 API routes for storage' },
        }),
        getPublicUrl: (path: string) => ({
          data: {
            publicUrl: `${process.env.NEXT_PUBLIC_STORAGE_URL || 'https://storage.example.com'}/${bucket}/${path}`,
          },
        }),
        download: async (_path: string) => ({
          data: null,
          error: { message: 'Use S3 API routes for storage' },
        }),
        list: async (_path?: string, _options?: Record<string, unknown>) => ({
          data: null,
          error: { message: 'Use S3 API routes for storage' },
        }),
        remove: async (_paths: string[]) => ({
          data: null,
          error: { message: 'Use S3 API routes for storage' },
        }),
      }),
    },

    channel: (_name: string) => {
      const channelStub = {
        on: (
          _event: string,
          _filterOrCallback: unknown,
          _callback?: Function
        ) => channelStub,
        subscribe: (_statusCallback?: Function) => channelStub,
        unsubscribe: () => {
          /* noop */
        },
        presenceState: () => ({} as Record<string, any[]>),
        track: async (_payload: Record<string, unknown>) => ({ error: null }),
      }

      return channelStub
    },

    removeChannel: (_channel: { unsubscribe?: () => void } | null | undefined) => {
      _channel?.unsubscribe?.()
      return { error: null }
    },

    removeAllChannels: () => ({ error: null }),
  }
}
