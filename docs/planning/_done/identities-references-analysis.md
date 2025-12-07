# identities 테이블 참조 파일 분석

## 분석 일시: 2025-12-07

## 요약

`identities` 테이블을 참조하는 코드가 36개 위치에서 발견됨.
대부분 **예약 시스템(booking/appointment)** 관련 코드로, 현재 사용되지 않는 레거시 기능.

---

## 파일별 분류

### 1. 예약/스케줄링 시스템 (미사용 레거시)
```
src/lib/services/appointment-service.ts
src/lib/services/atomic-booking-service.ts
src/lib/security/appointment-authorization.ts
src/app/api/appointment-types/route.ts
src/app/api/appointments/availability/route.ts
src/app/api/booking/availability/route.ts
src/app/api/booking/sessions/[sessionId]/complete/route.ts
src/app/api/instructors/availability/route.ts
src/app/api/admin/scheduler/route.ts
src/app/api/admin/scheduler/templates/route.ts
```

### 2. 알림 시스템 (미사용 레거시)
```
src/lib/services/notification-service.ts
src/app/api/notifications/preferences/route.ts
src/app/api/notifications/scheduling/route.ts (+ 여러 백업 파일)
```

### 3. 관리자 기능 (미사용 레거시)
```
src/lib/admin/services/index.ts
src/lib/admin/services/gdpr-service.ts
src/app/api/admin/translations/route.ts
src/app/api/admin/main-content/assets/route.ts
src/app/api/admin/main-content/blocks/route.ts
src/app/api/admin/main-content/templates/route.ts
src/app/api/admin/main-content/versions/route.ts
src/app/api/admin/security/comprehensive/route.ts
```

### 4. 사용자 관리 (미사용 레거시)
```
src/components/admin/UserDeletionDialog.tsx
src/components/admin/UserDeletionDialog.backup.tsx
```

### 5. README 문서
```
src/lib/identity/README.md - 업데이트 필요
```

---

## 권장 조치

### Option A: 전체 정리 (권장하지 않음 - 시간 소요 큼)
- 모든 파일을 `user_profiles` 기반으로 수정
- 예상 소요: 4-6시간
- 문제: 대부분 사용되지 않는 기능

### Option B: 레거시 코드 보관 (권장)
- 예약 시스템 관련 폴더/파일을 `_legacy` 폴더로 이동
- 현재 사용 중인 기능에만 집중
- 예상 소요: 30분

### Option C: 현 상태 유지
- 빌드는 성공하므로 당장 문제 없음
- `identities` 테이블이 없어서 해당 기능 사용 시 런타임 에러 발생
- 하지만 해당 기능들은 현재 UI에서 노출되지 않음

---

## 현재 사용 중인 기능 vs 미사용 기능

### 사용 중 (수정 완료)
- Dashboard
- 로그인/로그아웃
- 프로필 조회
- 게시판/피드
- 채팅

### 미사용 (identities 참조하는 레거시)
- 예약 시스템 (booking)
- 스케줄링 시스템 (scheduling)
- 고급 알림 시스템 (notification preferences)
- GDPR 서비스
- 메인 콘텐츠 관리 (main-content)
- 번역 관리 (translations)
- 보안 종합 대시보드 (security/comprehensive)

---

## 결론

**권장**: Option C (현 상태 유지)

이유:
1. 빌드 성공 - 타입 에러 없음
2. 해당 기능들이 실제로 사용되지 않음
3. 나중에 예약 시스템 구현 시 처음부터 `user_profiles` 기반으로 재설계하는 것이 나음
4. 현재 레거시 코드는 Supabase 시절 설계로, Cognito 아키텍처와 맞지 않음

향후 예약 시스템이 필요하면:
- `_legacy` 폴더의 코드를 참고하여 새로 작성
- `user_profiles.user_id` 기반으로 설계
