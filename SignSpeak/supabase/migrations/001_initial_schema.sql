-- SignSpeak Supabase PostgreSQL Initial Schema & Row Level Security (RLS)
-- Note: Webcam video frames and raw camera imagery are NEVER stored in PostgreSQL.

create extension if not exists "pgcrypto";

-- 1. User Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Automatically provision a profile row when a new Supabase Auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'SignSpeak Learner')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Public Learning Gestures Catalog (readable without login)
create table if not exists public.gestures (
  id text primary key,
  gesture_name text not null,
  meaning text not null,
  category text not null,
  difficulty text not null default 'Beginner',
  description text not null,
  handshape text not null default '',
  movement text not null default '',
  tip text not null default '',
  asset_url text not null default '',
  source_reference text not null default '',
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.gestures enable row level security;

drop policy if exists "Public learning gestures are readable without login" on public.gestures;
create policy "Public learning gestures are readable without login"
  on public.gestures
  for select
  to anon, authenticated
  using (true);

-- 3. Per-User Learning Progress
create table if not exists public.learning_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gesture_id text not null references public.gestures(id) on delete cascade,
  completed boolean not null default false,
  score integer not null default 0 check (score >= 0 and score <= 100),
  updated_at timestamptz not null default now(),
  constraint learning_progress_user_gesture_unique unique (user_id, gesture_id)
);

create index if not exists idx_learning_progress_user_id
  on public.learning_progress (user_id);

alter table public.learning_progress enable row level security;

drop policy if exists "Users can view their own learning progress" on public.learning_progress;
create policy "Users can view their own learning progress"
  on public.learning_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own learning progress" on public.learning_progress;
create policy "Users can insert their own learning progress"
  on public.learning_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own learning progress" on public.learning_progress;
create policy "Users can update their own learning progress"
  on public.learning_progress
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own learning progress" on public.learning_progress;
create policy "Users can delete their own learning progress"
  on public.learning_progress
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- 4. Per-User Quiz Results
create table if not exists public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null check (score >= 0),
  total_questions integer not null check (total_questions > 0),
  category text default 'All',
  created_at timestamptz not null default now()
);

create index if not exists idx_quiz_results_user_id_created
  on public.quiz_results (user_id, created_at desc);

alter table public.quiz_results enable row level security;

drop policy if exists "Users can view their own quiz results" on public.quiz_results;
create policy "Users can view their own quiz results"
  on public.quiz_results
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own quiz results" on public.quiz_results;
create policy "Users can insert their own quiz results"
  on public.quiz_results
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own quiz results" on public.quiz_results;
create policy "Users can delete their own quiz results"
  on public.quiz_results
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- 5. Per-User Translation History (Text strings ONLY — no webcam video/frames stored)
create table if not exists public.translation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  translated_text text not null check (char_length(trim(translated_text)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_translation_history_user_id_created
  on public.translation_history (user_id, created_at desc);

alter table public.translation_history enable row level security;

drop policy if exists "Users can view their own translation history" on public.translation_history;
create policy "Users can view their own translation history"
  on public.translation_history
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own translation history" on public.translation_history;
create policy "Users can insert their own translation history"
  on public.translation_history
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own translation history" on public.translation_history;
create policy "Users can delete their own translation history"
  on public.translation_history
  for delete
  to authenticated
  using (auth.uid() = user_id);
