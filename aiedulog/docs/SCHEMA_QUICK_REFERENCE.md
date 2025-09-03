# AIedulog Database Schema - Quick Reference

## 🎯 Core Principle: User-Centered Design

**Key Concept**: `identities` is the primary user entity, NOT `auth.users`

```
auth.users → identities → business_tables
    (auth)      (core)      (appointments, posts, etc.)
```

## 📋 Core Tables Overview

### Identity System (The Foundation)

```sql
identities              -- Primary user entity
├── id (UUID)          -- ✅ Use this for all user references
├── auth_user_id       -- Links to auth.users (internal use only)
├── status             -- active, inactive, suspended, banned
└── role               -- member, verified, moderator, admin, super_admin

auth_methods           -- Authentication bridge
├── identity_id        -- → identities(id)
├── provider_user_id   -- auth.users.id
└── provider_type      -- supabase, google, etc.

user_profiles          -- User information
├── identity_id        -- → identities(id)
├── email, nickname, full_name
├── avatar_url, school, subject
└── preferences (JSONB)
```

### Business Domain Tables

All business tables reference `identities(id)`:

```sql
-- Appointment System
appointments
├── user_id            -- → identities(id) ✅
├── instructor_id      -- → identities(id) ✅
└── appointment_type_id

appointment_types
├── instructor_id      -- → identities(id) ✅
└── service details

-- Content System  
posts
├── identity_id        -- → identities(id) ✅
└── content fields

-- Payment System
payments
├── user_id            -- → identities(id) ✅
└── payment details

-- Notification System
notifications
├── user_id            -- → identities(id) ✅
└── notification details
```

## 🔄 Standard Implementation Pattern

### 1. Identity Resolution (Required First Step)

```typescript
// ✅ ALWAYS do this first
const identity = await getUserIdentity(user)
if (!identity) throw new Error('Identity not found')

// ✅ Then use identity.identity_id for business logic
const result = await businessOperation(identity.identity_id)
```

### 2. Database Query Pattern

```typescript
// ✅ CORRECT
const { data } = await supabase
  .from('appointments')
  .select('*')
  .eq('user_id', identityId)  // Using identity_id

// ❌ WRONG  
const { data } = await supabase
  .from('appointments')
  .select('*')
  .eq('auth_user_id', user.id)  // Using auth_user_id directly
```

### 3. API Endpoint Pattern

```typescript
export async function POST(request: Request) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  // ✅ Required: Resolve identity first
  const identity = await getUserIdentity(user)
  if (!identity) return notFound()

  // ✅ Use identity.identity_id for business logic
  return businessLogic(identity.identity_id, requestData)
}
```

## ❌ Anti-Patterns to Avoid

### 1. Direct auth_user_id Usage
```typescript
// ❌ NEVER do this
const appointments = await supabase
  .from('appointments')
  .select('*')
  .eq('auth_user_id', user.id)  // Wrong field, wrong approach
```

### 2. Direct auth.users References
```sql
-- ❌ NEVER create tables like this
CREATE TABLE bad_table (
  id UUID PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id)  -- Wrong!
);
```

### 3. Mixing Auth and Business Logic
```typescript
// ❌ Don't query auth.users from business logic
const userData = await supabase.auth.admin.getUserById(userId)
```

## 🔒 Security (RLS) Pattern

```sql
-- ✅ CORRECT: Identity-based RLS
CREATE POLICY "table_user_access" ON table_name
FOR SELECT USING (
  user_id IN (
    SELECT i.id FROM identities i WHERE i.auth_user_id = auth.uid()
  )
);
```

## 🛠️ Helper Functions

### Core Functions (Always Use These)
```typescript
// Get complete identity data
getUserIdentity(user: User): Promise<IdentityData | null>

// Get just the identity ID  
getIdentityId(user: User): Promise<string | null>

// Search users by identity
searchUsers(searchText: string): Promise<UserProfile[]>
```

## 🎯 Quick Decision Tree

```
Need to work with user data?
├── Is this auth/login related?
│   ├── Yes → Use auth.users and Supabase auth functions
│   └── No → Continue below
├── Is this business logic?
│   ├── Yes → Resolve identity first, use identity_id
│   └── No → You might be in the wrong place
└── Creating new table with user reference?
    └── Use REFERENCES identities(id), never auth.users(id)
```

## 📊 Complete Table List

### Core System
- `identities` - Primary user entity
- `auth_methods` - Auth provider mapping  
- `user_profiles` - User information
- `posts` - Content posts

### Appointment System  
- `appointments` - Appointment bookings
- `appointment_types` - Service offerings
- `instructor_availability` - Weekly schedules
- `time_blocks` - Schedule exceptions
- `booking_sessions` - Multi-step booking
- `appointment_notifications` - Scheduled notifications

### Notification System
- `notifications` - Main notifications
- `notification_templates` - Message templates
- `notification_preferences` - User settings
- `notification_deliveries` - Delivery tracking
- `notification_analytics` - Performance metrics
- `notification_queue` - Real-time queue

### Payment System
- `payments` - Payment records
- `payment_methods` - Stored payment methods
- `refunds` - Refund tracking
- `payment_transactions` - Transaction audit
- `payment_webhooks` - Webhook events

### Footer System
- `footer_categories` - Footer sections
- `footer_links` - Navigation links
- `footer_social_links` - Social media links
- `footer_settings` - Footer configuration

### Security System
- `security_violations` - Security incidents
- `security_audit_log` - Audit trail
- `booking_transactions` - Booking locks

### Templates & Configuration
- `schedule_templates` - Reusable schedules

## 🚨 Remember

1. **identities.id** is your primary user reference
2. **Always resolve identity first** in business logic
3. **Never use auth_user_id** in business tables
4. **Use helper functions** for consistency
5. **When in doubt, check the full reference document**

---

**File**: `/docs/DATABASE_SCHEMA_REFERENCE.md` for complete details