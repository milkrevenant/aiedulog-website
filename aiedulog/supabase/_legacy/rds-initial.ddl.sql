-- Minimal baseline DDL for RDS PostgreSQL (no Supabase RLS or extensions)

create extension if not exists "uuid-ossp";

create table if not exists identities (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid unique not null,
  status varchar(20) default 'active',
  role varchar(50) default 'member',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists auth_methods (
  id uuid primary key default uuid_generate_v4(),
  identity_id uuid not null references identities(id) on delete cascade,
  provider_user_id uuid not null unique,
  provider_type varchar(50) not null default 'cognito',
  provider_data jsonb default '{}',
  is_primary boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint unique_primary_per_identity unique (identity_id, is_primary) deferrable initially deferred
);

create table if not exists user_profiles (
  id uuid primary key default uuid_generate_v4(),
  identity_id uuid not null references identities(id) on delete cascade,
  email varchar(255) not null,
  nickname varchar(100),
  avatar_url text,
  role varchar(50) default 'member',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(identity_id),
  unique(email)
);

create index if not exists idx_identities_auth_user_id on identities(auth_user_id);
create index if not exists idx_auth_methods_provider_user_id on auth_methods(provider_user_id);
create index if not exists idx_auth_methods_identity_id on auth_methods(identity_id);
create index if not exists idx_user_profiles_identity_id on user_profiles(identity_id);
