'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function JobRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/board/job/all')
  }, [router])

  return null
}
