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
  updated_at timestamptz not null default now(),
  constraint greetings_status_check check (
    greeting_status in ('DRAFT', 'READY_TO_PAY', 'READY_TO_PUBLISH', 'PUBLISHED', 'EXPIRED', 'ARCHIVED', 'BLOCKED')
  ),
  constraint payment_status_check check (
    payment_status in ('UNPAID', 'PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED')
  ),
  constraint engagement_status_check check (
    engagement_status in ('NOT_OPENED', 'OPENED', 'REACTED', 'REPLIED')
  ),
  constraint moderation_status_check check (
    moderation_status in ('NORMAL', 'REPORTED', 'UNDER_REVIEW', 'BLOCKED', 'RESTORED')
  )
);

create index if not exists greetings_updated_at_idx on public.greetings (updated_at desc);
create index if not exists greetings_creator_email_idx on public.greetings (creator_email);
create index if not exists greetings_statuses_idx on public.greetings (
  greeting_status,
  payment_status,
  engagement_status,
  moderation_status
);

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  greeting_id text not null references public.greetings(id) on delete cascade,
  session_id text not null,
  emoji text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (greeting_id, session_id)
);

create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  greeting_id text not null references public.greetings(id) on delete cascade,
  session_id text not null,
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  greeting_id text references public.greetings(id) on delete set null,
  actor text not null,
  action text not null,
  previous_value text,
  next_value text,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.greetings enable row level security;
alter table public.reactions enable row level security;
alter table public.replies enable row level security;
alter table public.admin_audit_logs enable row level security;

-- The browser never queries these tables directly. Server routes use the
-- service role and enforce ownership, publication, and moderation checks.

insert into storage.buckets (id, name, public)
values ('greetings', 'greetings', false)
on conflict (id) do update set public = false;
