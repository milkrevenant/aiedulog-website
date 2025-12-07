# identities → user_profiles 마이그레이션 계획

## 개요

**목표**: `identities` 테이블 참조를 모두 `user_profiles` 테이블로 변경

**배경**:
- Supabase → Cognito 전환 과정에서 `identities` 중간 계층이 불필요해짐
- 현재 DB에 `identities` 테이블이 존재하지 않아 해당 기능 사용 시 에러 발생
- 예약/스케줄링 시스템이 캘린더와 연동되어야 하므로 정리 필수

---

## 현재 상태

### DB 테이블 구조
```
현재 존재하는 테이블: user_profiles (user_id가 PK)
존재하지 않는 테이블: identities (코드에서 참조하지만 DB에 없음)
```

### user_profiles 스키마
```sql
user_id         UUID PRIMARY KEY
email           TEXT NOT NULL UNIQUE
username        TEXT UNIQUE
full_name       TEXT
avatar_url      TEXT
bio             TEXT
nickname        TEXT
school          TEXT
subject         TEXT
interests       TEXT[]
role            TEXT DEFAULT 'member'  -- 'member', 'admin', 'moderator', 'super_admin'
is_lecturer     BOOLEAN DEFAULT false
lecturer_info   JSONB DEFAULT '{}'
is_active       BOOLEAN DEFAULT true   -- identities.status 대체
last_sign_in_at TIMESTAMPTZ
last_active_at  TIMESTAMPTZ
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### 필드 매핑
| identities | user_profiles | 비고 |
|------------|---------------|------|
| id | user_id | PK |
| auth_user_id | (불필요) | Cognito에서 직접 관리 |
| status ('active', 'pending', 'inactive') | is_active (boolean) | 'pending' → is_active=false |
| role | role | 동일 |
| email | email | 동일 |
| full_name | full_name | 동일 |
| profile_image_url | avatar_url | 필드명 다름 |

---

## 수정 대상 파일 (36개 위치)

### 1. 핵심 서비스 (HIGH PRIORITY)

#### `src/lib/services/atomic-booking-service.ts`
```typescript
// 현재 (line 286, 297)
from('identities')
  .select('id, status, role')
  .eq('id', userId)

// 변경
from('user_profiles')
  .select('user_id, is_active, role')
  .eq('user_id', userId)

// 검증 로직 변경
// Before: status === 'active'
// After: is_active === true
```

#### `src/lib/services/appointment-service.ts`
```typescript
// 현재 (line 493)
from('identities')
  .select('id, full_name, status, role')
  .eq('id', instructorId)

// 변경
from('user_profiles')
  .select('user_id, full_name, is_active, role')
  .eq('user_id', instructorId)
```

#### `src/lib/security/appointment-authorization.ts`
```typescript
// 현재 (line 268, 734)
from('identities')
  .select('id, status, role, created_at')
  .eq('id', context.userId)

// JOIN 쿼리 (line 734)
from('appointments')
  .select(`
    *,
    user:identities!appointments_user_id_fkey(...),
    instructor:identities!appointments_instructor_id_fkey(...)
  `)

// 변경
from('user_profiles')
  .select('user_id, is_active, role, created_at')
  .eq('user_id', context.userId)

from('appointments')
  .select(`
    *,
    user:user_profiles!appointments_user_id_fkey(user_id, full_name, email, is_active, role),
    instructor:user_profiles!appointments_instructor_id_fkey(user_id, full_name, email, is_active, role)
  `)
```

#### `src/lib/services/notification-service.ts`
```typescript
// 현재 (line 821)
from('identities')
  .select('email')
  .eq('id', userId)

// 변경
from('user_profiles')
  .select('email')
  .eq('user_id', userId)
```

### 2. API Routes (HIGH PRIORITY)

#### `src/app/api/appointment-types/route.ts`
```typescript
// 현재 (line 144)
from('identities')
  .select('id, role, status')
  .eq('id', body.instructor_id)

// 변경
from('user_profiles')
  .select('user_id, role, is_active')
  .eq('user_id', body.instructor_id)
```

#### `src/app/api/booking/availability/route.ts`
```typescript
// 현재 (line 74, 147)
from('identities')
  .select('id')
  .eq('role', 'instructor')
  .eq('status', 'active')

// 변경
from('user_profiles')
  .select('user_id')
  .eq('role', 'instructor')
  .eq('is_active', true)
```

#### `src/app/api/instructors/availability/route.ts`
```typescript
// 현재 (line 147)
from('identities')
  .select('id, role, status')
  .eq('id', body.instructor_id)

// JOIN 변경
instructor:user_profiles!instructor_availability_instructor_id_fkey(
  user_id, full_name, email
)
```

#### `src/app/api/booking/sessions/[sessionId]/complete/route.ts`
```typescript
// 현재 (line 138, 156) - 익명 사용자 등록
from('identities')
  .select('id')
  .eq('email', email)

from('identities')
  .insert({
    email, full_name, phone,
    role: 'user', status: 'pending'
  })

// 변경
from('user_profiles')
  .select('user_id')
  .eq('email', email)

from('user_profiles')
  .insert({
    email, full_name, phone,
    role: 'member', is_active: false  // pending → is_active: false
  })
```

#### `src/app/api/appointments/availability/route.ts`
```typescript
// 현재 (line 73)
from('identities')
  .select('id')
  .eq('role', 'instructor')
  .eq('status', 'active')

// 변경
from('user_profiles')
  .select('user_id')
  .eq('role', 'instructor')  // 또는 is_lecturer = true
  .eq('is_active', true)
```

### 3. 알림 시스템 (MEDIUM PRIORITY)

#### `src/app/api/notifications/preferences/route.ts`
```typescript
// 현재 (line 413)
from('identities')
  .select('id')
  .eq('id', user_id)

// 변경
from('user_profiles')
  .select('user_id')
  .eq('user_id', user_id)
```

#### `src/app/api/notifications/scheduling/route.ts`
```typescript
// 현재 (line 523)
from('identities') 참조

// 변경
from('user_profiles')
```

### 4. 관리자 기능 (MEDIUM PRIORITY)

#### `src/app/api/admin/scheduler/route.ts` (line 158)
#### `src/app/api/admin/scheduler/templates/route.ts` (line 73)
#### `src/app/api/admin/translations/route.ts` (line 218)
#### `src/app/api/admin/main-content/assets/route.ts` (line 94)
#### `src/app/api/admin/main-content/blocks/route.ts` (line 87, 142)
#### `src/app/api/admin/main-content/templates/route.ts` (line 90)
#### `src/app/api/admin/main-content/versions/route.ts` (line 110, 191)
#### `src/app/api/admin/security/comprehensive/route.ts` (line 225, 709)

모두 동일 패턴:
```typescript
// 변경 전
from('identities').select(...).eq('id', ...)

// 변경 후
from('user_profiles').select(...).eq('user_id', ...)
```

### 5. 사용자 관리 (MEDIUM PRIORITY)

#### `src/lib/admin/services/index.ts` (line 427)
#### `src/lib/admin/services/gdpr-service.ts`
```typescript
// GDPR 삭제 시 CASCADE 활용
from('user_profiles')
  .delete()
  .eq('user_id', userId)
```

#### `src/components/admin/UserDeletionDialog.tsx` (line 231, 253)
```typescript
// 변경 전
from('identities')

// 변경 후
from('user_profiles')
```

### 6. 기타

#### `src/lib/security/rls-enforcer.ts`
설정 상수만 변경 (테이블명, 필드명)

#### `src/components/admin/UserDeletionDialog.backup.tsx`
백업 파일 - 삭제 또는 무시

---

## 변경 규칙 요약

### 1. 테이블 참조 변경
```typescript
from('identities') → from('user_profiles')
```

### 2. 필드명 변경
```typescript
.select('id, ...')     → .select('user_id, ...')
.eq('id', userId)      → .eq('user_id', userId)
status                 → is_active
profile_image_url      → avatar_url
```

### 3. 상태 검증 로직 변경
```typescript
// Before
.eq('status', 'active')
if (user.status === 'active')

// After
.eq('is_active', true)
if (user.is_active === true)
```

### 4. 역할 검증 (instructor 확인)
```typescript
// 두 가지 방법 중 선택
.eq('role', 'instructor')  // role 필드 사용
.eq('is_lecturer', true)   // is_lecturer 필드 사용

// 권장: role 필드 사용 (일관성)
['instructor', 'admin', 'super_admin'].includes(user.role)
```

### 5. JOIN 쿼리 FK 이름 변경
```typescript
// Before
identities!appointments_user_id_fkey(...)
identities!appointments_instructor_id_fkey(...)

// After
user_profiles!appointments_user_id_fkey(...)
user_profiles!appointments_instructor_id_fkey(...)
```

---

## 주의사항

### CRITICAL
1. **atomic-booking-service.ts**: Race condition 방지 로직 유지 필수
2. **appointment-authorization.ts**: 권한 검증 정확성 보장
3. **gdpr-service.ts**: GDPR 법적 요구사항 충족

### IMPORTANT
1. 모든 변경 후 빌드 테스트 필수
2. 익명 사용자 등록 워크플로우 (status: 'pending' → is_active: false)
3. Foreign Key 관계 유지 (실제 FK constraint는 DB에서 별도 관리)

---

## 작업 순서 권장

1. **Phase 1**: 핵심 서비스 (atomic-booking, appointment, authorization)
2. **Phase 2**: API Routes (booking, appointments, instructors)
3. **Phase 3**: 알림 시스템
4. **Phase 4**: 관리자 기능
5. **Phase 5**: 빌드 테스트 및 검증

---

## 완료 기준

- [ ] 모든 `from('identities')` 참조 제거
- [ ] 모든 `identity_id` 참조를 `user_id`로 변경
- [ ] `npm run build` 성공
- [ ] 타입 에러 0개

---

## 참고: 이미 완료된 파일

- `src/lib/identity/stable-identity-service.ts` ✅
- `src/lib/identity/helpers.ts` ✅
- `src/lib/identity/fallback.ts` ✅
- `src/lib/chat/unified-system.ts` ✅

---

*작성일: 2025-12-07*
*작성자: Claude*
