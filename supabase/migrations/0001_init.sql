-- Torsonodor initial schema.
-- Run in Supabase SQL Editor (or `supabase db push` with the CLI).

create table if not exists public.greetings (
  id text primary key,
  guest_id text,
  creator_email text,
  recipient_name text not null default '',
  template_id text,
  greeting_status text not null default 'DRAFT',
  payment_status text not null default 'UNPAID',
  engagement_status text not null default 'NOT_OPENED',
  moderation_status text not null default 'NORMAL',
  slug text unique,
  draft_json jsonb not null,
  total_view_count integer not null default 0,
  unique_view_count integer not null default 0,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists greetings_updated_at_idx
  on public.greetings (updated_at desc);
create index if not exists greetings_creator_email_idx
  on public.greetings (creator_email);

create table if not exists public.reactions (
  id text primary key,
  greeting_id text not null references public.greetings(id) on delete cascade,
  session_id text not null,
  emoji text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reactions_greeting_id_idx
  on public.reactions (greeting_id);
create unique index if not exists reactions_session_greeting_unique
  on public.reactions (greeting_id, session_id);

create table if not exists public.replies (
  id text primary key,
  greeting_id text not null references public.greetings(id) on delete cascade,
  session_id text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists replies_greeting_id_idx
  on public.replies (greeting_id);

create table if not exists public.admin_audit_logs (
  id text primary key,
  greeting_id text references public.greetings(id) on delete set null,
  actor text not null,
  action text not null,
  previous_value text,
  next_value text,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_greeting_id_idx
  on public.admin_audit_logs (greeting_id);

-- RLS: service_role bypass бүх RLS-ийг. Client-side ашиглах болвол доорх бодлого нэмнэ.
alter table public.greetings enable row level security;
alter table public.reactions enable row level security;
alter table public.replies enable row level security;
alter table public.admin_audit_logs enable row level security;

-- Storage bucket for greeting media.
insert into storage.buckets (id, name, public)
values ('greetings', 'greetings', false)
on conflict (id) do nothing;
