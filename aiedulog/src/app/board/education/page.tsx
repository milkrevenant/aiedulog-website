'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EducationBoardPage() {
  const router = useRouter()
  
  useEffect(() => {
    // /board/education은 전체 보기로 리다이렉트
    router.replace('/board/education/all')
  }, [router])
  
  return null
}