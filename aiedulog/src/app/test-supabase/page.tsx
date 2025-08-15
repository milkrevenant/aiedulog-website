'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestSupabase() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const testConnection = async () => {
      try {
        const supabase = createClient()
        
        // 간단한 연결 테스트 - 세션 확인
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          setError(error.message)
          setConnected(false)
        } else {
          setConnected(true)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setConnected(false)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase 연결 테스트</h1>
      
      {connected === null && <p>연결 확인 중...</p>}
      
      {connected === true && (
        <div className="text-green-600">
          ✅ Supabase 연결 성공!
        </div>
      )}
      
      {connected === false && (
        <div className="text-red-600">
          ❌ 연결 실패: {error}
        </div>
      )}
      
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p className="text-sm">
          <strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}
        </p>
        <p className="text-sm">
          <strong>Key (앞 20자):</strong> {process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.substring(0, 20)}...
        </p>
      </div>
    </div>
  )
}