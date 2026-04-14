create table if not exists public.kyc_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending',
  verification_method text,
  verified_at timestamptz,
  pep_status text not null default 'unknown',
  sanctions_status text not null default 'unknown',
  risk_rating text not null default 'medium',
  full_name text,
  date_of_birth timestamptz,
  nationality text,
  enhanced_due_diligence boolean not null default false,
  documents jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  rejection_reason text
);

alter table public.kyc_profiles enable row level security;

create policy "Users can view own kyc profile"
  on public.kyc_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own kyc profile"
  on public.kyc_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own kyc profile"
  on public.kyc_profiles for update
  using (auth.uid() = user_id);
