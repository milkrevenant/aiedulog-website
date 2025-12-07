# DB 테이블 스키마 분석 및 개선 계획

## 문제 요약

현재 DB 스키마에 **두 가지 상충하는 아키텍처**가 섞여 있음:

1. **현재 적용된 스키마 (migrations/002_core_tables.sql)**
   - `user_profiles` 테이블이 **직접 user_id를 PK로 사용**
   - `auth_methods`가 `user_profiles.user_id`를 직접 참조
   - 단순한 1:N 구조

2. **Supabase 시절 설계된 스키마 (supabase/migrations/)**
   - `identities` 테이블이 **중간 계층**으로 존재
   - `user_profiles` → `identities` → `auth.users` 구조
   - `auth_methods`가 `identities.id`를 참조

---

## 현재 실제 DB 상태 (Docker PostgreSQL)

### 존재하는 테이블 (28개)
```
user_profiles, auth_methods, posts, comments, post_likes, bookmarks,
chat_rooms, chat_participants, chat_messages, lectures, lecture_registrations,
notifications, announcements, news_posts, resources, regular_meetings,
research_members, staff_members, training_materials, training_programs,
footer_categories, footer_links, footer_social_links, footer_settings,
permission_areas, user_permissions, page_views, calendar_events
```

### 존재하지 않는 테이블
```
identities (❌ 누락됨 - StableIdentityService에서 에러 발생 원인)
```

---

## 코드에서 문제가 되는 부분

### 1. StableIdentityService (src/lib/identity/stable-identity-service.ts)

**문제 코드 (281-305줄):**
```typescript
// identities 테이블을 조회하지만 테이블이 존재하지 않음
const [totalUsersResult, ...] = await Promise.all([
  this.supabaseClient
    .from('identities')  // ❌ 테이블 없음
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active'),  // ❌ status 컬럼도 없음
  ...
])
```

**영향:**
- `getUserStats()` 호출 시 에러 발생
- Dashboard 등에서 사용자 통계 조회 실패

### 2. ensure_user_identity() 함수

**문제:**
- 코드에서 `rpc('ensure_user_identity', ...)` 호출
- 하지만 이 DB 함수가 정의되어 있지 않음

**영향:**
- `resolveUserIdentity()` 실패 → fallback 로직으로 폴백
- fallback에서도 `identities` 테이블 조회 시도하여 실패

### 3. 레거시 마이그레이션 파일들

**supabase/migrations/ 폴더:**
- Supabase 시절 설계된 복잡한 스키마
- `identities` 중심 아키텍처
- 현재 사용되지 않지만 코드에 흔적이 남아있음

---

## 근본 원인

### Supabase → Cognito 전환 과정에서 발생

1. **Supabase 시절:**
   - `auth.users` (Supabase 내장) → `identities` → `user_profiles`
   - `identities` 테이블이 auth.users.id 변경에 대응하기 위한 안정적 ID 제공
   - 여러 인증 방법(auth_methods)을 하나의 identity에 매핑

2. **Cognito 전환 후:**
   - `auth.users` 대신 AWS Cognito 사용
   - `user_profiles.user_id`를 직접 사용하는 단순화된 구조 채택
   - **하지만 StableIdentityService 등 일부 코드가 업데이트되지 않음**

---

## 개선 방안 (2가지)

### Option A: 코드 정리 (권장)

**identities 관련 코드 제거/수정**

1. **StableIdentityService 수정**
   - `identities` 테이블 참조 제거
   - `user_profiles` 직접 조회하도록 변경
   - `getUserStats()` → `user_profiles` 기반으로 재작성

2. **불필요한 파일 정리**
   - `src/lib/identity/` 폴더 전체 검토
   - Supabase 시절 마이그레이션 파일 정리/보관

3. **DB 함수 제거**
   - `ensure_user_identity` 함수 참조 제거
   - 관련 RPC 호출 제거

**장점:**
- 단순한 아키텍처 유지
- 유지보수 용이
- Cognito 중심 설계에 적합

**단점:**
- 코드 수정 필요
- 향후 다중 인증 제공자 확장 시 재설계 필요

---

### Option B: identities 테이블 생성

**누락된 테이블/함수 추가**

1. **마이그레이션 작성**
   ```sql
   CREATE TABLE identities (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     auth_user_id UUID UNIQUE NOT NULL,
     status VARCHAR(20) DEFAULT 'active',
     role VARCHAR(50) DEFAULT 'member',
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- user_profiles 수정하여 identity_id FK 추가
   -- ensure_user_identity() 함수 생성
   ```

2. **데이터 마이그레이션**
   - 기존 `user_profiles` 데이터를 `identities`로 변환
   - FK 관계 재설정

**장점:**
- 기존 코드 수정 최소화
- 향후 다중 인증 제공자 지원 용이

**단점:**
- 복잡도 증가
- 현재 Cognito만 사용하므로 과설계
- 마이그레이션 복잡

---

## 권장 사항: Option A (코드 정리)

### 이유:
1. 현재 Cognito 단일 인증 사용
2. `user_profiles.user_id`가 이미 안정적 ID 역할 수행
3. `identities` 계층은 Supabase auth.users.id 변경 대응용이었으나 Cognito에서는 불필요
4. 단순한 구조가 유지보수에 유리

### 수정 대상 파일:

| 파일 | 수정 내용 |
|------|----------|
| `src/lib/identity/stable-identity-service.ts` | identities → user_profiles로 변경 |
| `src/lib/identity/health-check-agent.ts` | 검토 후 수정/삭제 |
| `src/lib/identity/fallback.ts` | 검토 후 수정/삭제 |
| `src/lib/identity/migration.ts` | 삭제 (불필요) |
| `src/lib/identity/examples.ts` | 삭제 (불필요) |
| `src/lib/identity/helpers.ts` | 검토 후 수정 |

### 삭제/보관 대상:

| 경로 | 처리 |
|------|------|
| `supabase/migrations/2025090*` | 보관 (참고용) |
| `scripts/run-migration.sql` | 삭제 또는 업데이트 |

---

## 작업 순서 (예상 소요: 1-2시간)

### Phase 1: 분석 (15분)
- [x] 현재 DB 테이블 구조 확인
- [x] 문제 코드 식별
- [x] 근본 원인 분석

### Phase 2: StableIdentityService 수정 (30분)
- [ ] `getUserStats()` 수정 → user_profiles 기반
- [ ] `getIdentityById()` 수정 → profiles 대신 user_profiles
- [ ] `fallbackUserIdentity()` 수정 → identities 참조 제거
- [ ] `resolveUserIdentity()` 단순화

### Phase 3: 관련 파일 정리 (30분)
- [ ] identity 폴더 내 불필요 파일 제거
- [ ] 레거시 마이그레이션 파일 정리
- [ ] import 경로 정리

### Phase 4: 테스트 (15분)
- [ ] 빌드 테스트
- [ ] 프로필 조회 테스트
- [ ] Dashboard 통계 테스트

---

## 참고: 현재 user_profiles 스키마

```sql
Table "public.user_profiles"
     Column      |           Type           | Nullable | Default
-----------------+--------------------------+----------+--------------------
 user_id         | uuid                     | not null | uuid_generate_v4()
 email           | text                     | not null |
 username        | text                     |          |
 full_name       | text                     |          |
 avatar_url      | text                     |          |
 bio             | text                     |          |
 nickname        | text                     |          |
 school          | text                     |          |
 subject         | text                     |          |
 interests       | text[]                   |          | '{}'::text[]
 role            | text                     |          | 'member'::text
 is_lecturer     | boolean                  |          | false
 lecturer_info   | jsonb                    |          | '{}'::jsonb
 is_active       | boolean                  |          | true
 last_sign_in_at | timestamp with time zone |          |
 last_active_at  | timestamp with time zone |          |
 created_at      | timestamp with time zone |          | now()
 updated_at      | timestamp with time zone |          | now()
```

**핵심 포인트:**
- `user_id`가 PK이자 안정적 식별자
- `is_active`로 상태 관리 가능 (identities.status 대체)
- `role`로 권한 관리 (identities.role 대체)

---

*작성일: 2025-12-07*
