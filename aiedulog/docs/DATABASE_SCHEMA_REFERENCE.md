# AIedulog Database Schema Reference

## Overview

This document provides comprehensive documentation for the AIedulog database schema, with a focus on our **user-centered design philosophy**. Understanding this design philosophy is critical for all developers working with the system.

## 🎯 User-Centered Design Philosophy

### Core Principle

AIedulog uses a **user-centered design approach** where `identities` is the primary entity, not auth users. This design provides several key advantages:

1. **Decoupling from Auth Provider**: Our identity system is independent of authentication providers
2. **Enhanced User Experience**: Single identity across multiple auth methods
3. **Better Data Integrity**: Consistent relationships across all application data
4. **Scalability**: Easy to add new authentication methods or providers
5. **Privacy & Security**: Better control over user data and permissions

### Why NOT Auth-Centered Design

❌ **Anti-Pattern: Auth-Centered Design**
```sql
-- WRONG: Using auth_user_id directly in business tables
CREATE TABLE appointments (
  id UUID PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id), -- ❌ WRONG
  instructor_auth_id UUID REFERENCES auth.users(id), -- ❌ WRONG
  ...
);
```

**Problems with Auth-Centered Approach:**
- Tight coupling with authentication system
- Difficult to support multiple auth providers
- Complex data migration when changing auth systems
- Auth system limitations affect business logic
- Poor separation of concerns

### ✅ Correct: User-Centered Design

```sql
-- CORRECT: Using identity_id for business relationships
CREATE TABLE appointments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES identities(id), -- ✅ CORRECT
  instructor_id UUID REFERENCES identities(id), -- ✅ CORRECT
  ...
);
```

## 🏗️ Database Architecture

### Core Identity System

#### 1. `identities` Table (Primary User Entity)
```sql
CREATE TABLE identities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE NOT NULL, -- References auth.users.id
  status VARCHAR(20) DEFAULT 'active',
  role VARCHAR(50) DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose**: Central user identity that persists across authentication changes.

**Key Fields**:
- `id`: Primary identity UUID used throughout the system
- `auth_user_id`: Links to current authentication user
- `status`: User account status (active, inactive, suspended, banned)
- `role`: User role (member, verified, moderator, admin, super_admin)

#### 2. `auth_methods` Table (Authentication Bridge)
```sql
CREATE TABLE auth_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  provider_user_id UUID NOT NULL UNIQUE, -- auth.users.id
  provider_type VARCHAR(50) NOT NULL DEFAULT 'supabase',
  provider_data JSONB DEFAULT '{}',
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose**: Maps authentication providers to identities, enabling multi-provider support.

#### 3. `user_profiles` Table (User Information)
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  nickname VARCHAR(100),
  full_name VARCHAR(255),
  avatar_url TEXT,
  school VARCHAR(255),
  subject VARCHAR(255),
  role VARCHAR(50) DEFAULT 'member',
  bio TEXT,
  social_links JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose**: Stores user profile information and preferences.

## 📋 Business Domain Tables

### Appointment System

All appointment-related tables use `identity_id` references:

#### `appointments` Table
```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES identities(id), -- ✅ User-centered
  instructor_id UUID NOT NULL REFERENCES identities(id), -- ✅ User-centered
  appointment_type_id UUID NOT NULL REFERENCES appointment_types(id),
  -- ... other fields
);
```

#### `appointment_types` Table
```sql
CREATE TABLE appointment_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instructor_id UUID NOT NULL REFERENCES identities(id), -- ✅ User-centered
  type_name VARCHAR(150) NOT NULL,
  -- ... other fields
);
```

### Content System

#### `posts` Table
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identity_id UUID NOT NULL REFERENCES identities(id), -- ✅ User-centered
  title VARCHAR(500) NOT NULL,
  content TEXT,
  -- ... other fields
);
```

### Payment System

#### `payments` Table
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES identities(id), -- ✅ User-centered
  appointment_id UUID REFERENCES appointments(id),
  -- ... other fields
);
```

### Notification System

#### `notifications` Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES identities(id), -- ✅ User-centered
  title VARCHAR(255) NOT NULL,
  -- ... other fields
);
```

## 🔄 Identity Resolution Pattern

### Standard Implementation Pattern

```typescript
// ✅ CORRECT: Always resolve identity first
export async function getUserIdentity(user: User): Promise<IdentityData | null> {
  const { data: authMethod } = await supabase
    .from('auth_methods')
    .select(`
      identity_id,
      identities!auth_methods_identity_id_fkey (
        id,
        status,
        user_profiles!user_profiles_identity_id_fkey (*)
      )
    `)
    .eq('provider_user_id', user.id)
    .single()

  return authMethod?.identities?.[0] ? {
    identity_id: authMethod.identities[0].id,
    profile: authMethod.identities[0].user_profiles[0]
  } : null
}
```

### Query Patterns

#### ✅ Correct Query Pattern
```typescript
// Get user's appointments
const { data: appointments } = await supabase
  .from('appointments')
  .select('*, instructor:identities!instructor_id(*)')
  .eq('user_id', identityId) // ✅ Using identity_id
```

#### ❌ Incorrect Query Pattern
```typescript
// DON'T DO THIS
const { data: appointments } = await supabase
  .from('appointments')
  .select('*')
  .eq('auth_user_id', user.id) // ❌ Using auth_user_id directly
```

## 🚀 Implementation Guidelines

### 1. Always Use Identity Resolution

```typescript
// ✅ CORRECT: Always resolve identity first
const identity = await getUserIdentity(user)
if (!identity) {
  throw new Error('User identity not found')
}

// Use identity.identity_id for all database operations
const result = await createPost(identity.identity_id, postData)
```

### 2. Database Queries

```typescript
// ✅ CORRECT: Use identity-based relationships
const getUserPosts = async (identityId: string) => {
  return await supabase
    .from('posts')
    .select('*')
    .eq('identity_id', identityId)
}
```

### 3. API Endpoint Pattern

```typescript
// ✅ CORRECT: API endpoint implementation
export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Resolve identity first
  const identity = await getUserIdentity(user)
  if (!identity) {
    return NextResponse.json({ error: 'Identity not found' }, { status: 404 })
  }

  // Use identity.identity_id for business logic
  const result = await businessLogic(identity.identity_id)
  return NextResponse.json(result)
}
```

## ❌ Anti-Patterns & Common Mistakes

### 1. Using auth_user_id Directly

```typescript
// ❌ WRONG: Using auth_user_id in business logic
const createAppointment = async (authUserId: string, data: AppointmentData) => {
  return await supabase
    .from('appointments')
    .insert({
      auth_user_id: authUserId, // ❌ WRONG
      ...data
    })
}
```

### 2. Mixing Auth and Business Logic

```typescript
// ❌ WRONG: Querying auth.users from business logic
const getUserInfo = async (userId: string) => {
  const { data } = await supabase.auth.admin.getUserById(userId) // ❌ WRONG
  return data
}
```

### 3. Direct Foreign Key to auth.users

```sql
-- ❌ WRONG: Direct reference to auth.users
CREATE TABLE business_table (
  id UUID PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) -- ❌ WRONG
);
```

### 4. Bypassing Identity System

```typescript
// ❌ WRONG: Using user.id directly
const result = await supabase
  .from('posts')
  .select('*')
  .eq('user_id', user.id) // ❌ WRONG - assuming user_id = auth.users.id
```

## 🔒 Security Benefits

### Row Level Security (RLS) Patterns

```sql
-- ✅ CORRECT: Identity-based RLS policy
CREATE POLICY "appointments_user_access" ON appointments
FOR SELECT USING (
  user_id IN (
    SELECT i.id FROM identities i WHERE i.auth_user_id = auth.uid()
  )
);
```

### Access Control

The user-centered design enables:
- **Granular permissions**: Role-based access at identity level
- **Data isolation**: Clear ownership boundaries
- **Audit trails**: Consistent user tracking
- **Privacy controls**: User data management

## 🔧 Utility Functions

### Core Helper Functions

```typescript
// Get identity from auth user
export async function getUserIdentity(user: User): Promise<IdentityData | null>

// Get identity ID only
export async function getIdentityId(user: User): Promise<string | null>

// Search users by identity
export async function searchUsers(searchText: string): Promise<UserProfile[]>

// Get user statistics
export async function getUserStats(): Promise<UserStats>
```

### Database Utility Functions

```sql
-- Ensure identity exists for auth user
CREATE FUNCTION ensure_user_identity(user_id UUID, user_email TEXT) RETURNS UUID

-- Create user profile automatically
CREATE FUNCTION create_user_profile_from_auth() RETURNS TRIGGER
```

## 🧾 TypeScript Schema Mapping

- `src/lib/db/types.ts`는 본 문서의 테이블/열 정의를 기반으로 60개 이상의 인터페이스와 enum literal을 제공한다.
- `DatabaseTables` 맵과 `TableRow<Table>` 헬퍼를 활용해 `RDSClient` 제네릭 작업(TODO: Track A/B)과 API 타입 지정 시 스키마와 동기화할 수 있다.
- 새 테이블 추가 시 먼저 여기 문서를 갱신하고, 이후 `types.ts`에 동일 필드를 반영해 타입 불일치를 예방한다.

## 📊 Schema Relationships

### Primary Relationships

```
auth.users (Supabase Auth)
    ↓ (linked via auth_user_id)
identities (Central Identity)
    ↓ (one-to-one)
user_profiles (Profile Data)
    ↓ (one-to-many)
posts, appointments, payments, etc. (Business Data)
```

### Foreign Key Pattern

All business tables follow this pattern:
- Use `identity_id` or `user_id` referencing `identities(id)`
- Never reference `auth.users` directly from business tables
- Use consistent naming: `user_id`, `instructor_id`, `created_by`, etc.

## 🎯 Benefits Summary

### Developer Benefits
- **Clear separation of concerns**
- **Consistent data access patterns**
- **Easy testing and mocking**
- **Provider-agnostic design**

### User Benefits
- **Single identity across providers**
- **Seamless auth provider switching**
- **Better privacy controls**
- **Consistent user experience**

### System Benefits
- **Better scalability**
- **Enhanced security**
- **Easier maintenance**
- **Future-proof architecture**

## 🔄 Migration Considerations

When working with the database:

1. **Always resolve identity first** before any business operations
2. **Use helper functions** for consistent identity resolution
3. **Follow naming conventions** for identity references
4. **Implement proper error handling** for missing identities
5. **Use RLS policies** based on identity relationships

## 📝 Development Checklist

Before implementing new features:

- [ ] Understand the user-centered design principle
- [ ] Identify which users/identities are involved
- [ ] Use `identities(id)` for all user references
- [ ] Implement proper identity resolution
- [ ] Add appropriate RLS policies
- [ ] Follow consistent naming conventions
- [ ] Add proper error handling
- [ ] Test with different user scenarios

## 🚨 Critical Reminders

1. **NEVER use `auth_user_id` in business logic**
2. **ALWAYS resolve identity first**
3. **Use `identity_id` for all user relationships**
4. **Follow the established patterns**
5. **Consult this document when in doubt**

---

This user-centered design is fundamental to AIedulog's architecture. Understanding and following these patterns ensures consistency, maintainability, and scalability across the entire system.
