'use client'

import React, { useState } from 'react'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material'
import { CalendarToday, ArrowBack } from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/hooks'
import AuthGuard from '@/components/AuthGuard'
import AppHeader from '@/components/AppHeader'

const steps = [
  {
    label: '강사 선택',
    description: '예약하고 싶은 강사를 선택하세요'
  },
  {
    label: '서비스 선택',
    description: '상담 유형을 선택하세요'
  },
  {
    label: '날짜 시간 선택',
    description: '예약 날짜와 시간을 선택하세요'
  },
  {
    label: '예약 확인',
    description: '예약 정보를 확인하고 완료하세요'
  }
]

function BookingContent() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [activeStep, setActiveStep] = useState(0)

  const handleBack = () => {
    router.push('/dashboard')
  }

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
      <AppHeader user={user} profile={profile} />
      
      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Header */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={handleBack}
            variant="outlined"
            color="inherit"
          >
            대시보드로 돌아가기
          </Button>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              새 예약 만들기
            </Typography>
            <Typography variant="body1" color="text.secondary">
              전문가와의 1:1 상담 예약을 만들어보세요
            </Typography>
          </Box>
        </Stack>

        {/* Booking Wizard */}
        <Card>
          <CardContent sx={{ p: 4 }}>
            {/* Under Construction Notice */}
            <Alert severity="info" sx={{ mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom>
                예약 시스템 개발 중
              </Typography>
              <Typography variant="body2">
                예약 기능은 현재 개발 중입니다. 예약을 원하시면 연락처로 직접 문의해주세요.
              </Typography>
            </Alert>

            {/* Stepper */}
            <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 4 }}>
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel>
                    <Typography variant="h6">{step.label}</Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {step.description}
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="contained"
                        size="small"
                        disabled
                      >
                        계속
                      </Button>
                      {index > 0 && (
                        <Button
                          size="small"
                          disabled
                        >
                          이전
                        </Button>
                      )}
                    </Stack>
                  </StepContent>
                </Step>
              ))}
            </Stepper>

            {/* Temporary Contact Information */}
            <Card variant="outlined" sx={{ p: 3, bgcolor: 'grey.50' }}>
              <Stack spacing={2}>
                <Typography variant="h6" gutterBottom>
                  임시 예약 방법
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  예약 시스템이 완성될 때까지 아래 연락처로 직접 예약을 요청해주세요:
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    • 이메일: contact@aiedulog.com
                  </Typography>
                  <Typography variant="body2">
                    • 전화: 02-1234-5678
                  </Typography>
                  <Typography variant="body2">
                    • 카카오톡: @aiedulog
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  예약 시 다음 정보를 알려주세요:
                  <br />
                  - 원하는 상담 유형
                  <br />
                  - 희망 날짜 및 시간
                  <br />
                  - 연락처 (이메일 또는 전화번호)
                </Typography>
              </Stack>
            </Card>

            {/* Action Buttons */}
            <Stack direction="row" justifyContent="center" spacing={2} sx={{ mt: 4 }}>
              <Button
                variant="outlined"
                onClick={handleBack}
                size="large"
              >
                대시보드로 돌아가기
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Feature Preview */}
        <Card sx={{ mt: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom>
              곱 출시 예정 기능
            </Typography>
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                • 실시간 예약 가능 시간 확인
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • 온라인/오프라인 상담 선택
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • 자동 알림 및 리마인더 발솨
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • 캘린더 연동 및 일정 관리
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • 상담 내역 및 피드백 관리
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}

export default function BookingPage() {
  return (
    <AuthGuard requireAuth>
      <BookingContent />
    </AuthGuard>
  )
}