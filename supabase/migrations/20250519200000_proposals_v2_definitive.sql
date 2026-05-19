-- =============================================================================
-- DEFINITIEF: public.proposals — gelijk aan src/lib/supabase-proposals.ts
-- =============================================================================
-- Kolommen die de app schrijft:
--   id (uuid PK)
--   pipedrive_deal_id (text UNIQUE NOT NULL) — upsert conflict key
--   proposal_id (text) — bv. FIH-12345
--   title, status, source (text)
--   advisor, customer, proposal_data (jsonb) — alle offertevelden in proposal_data
--   pipedrive_deal_url (text)
--   created_at, updated_at (timestamptz)
--
-- Geen numeric kolommen → geen 22P02 door €/m² in verkeerde kolommen.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Nieuwe tabel (als je vanaf nul wilt starten na mislukte migraties)
--    Uncomment alleen als je de oude tabel wilt vervangen:
-- drop table if exists public.proposals cascade;
-- -----------------------------------------------------------------------------

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  pipedrive_deal_id text not null,
  proposal_id text not null,
  title text,
  status text not null default 'Nieuw vanuit Pipedrive',
  source text,
  advisor jsonb not null default '{}'::jsonb,
  customer jsonb not null default '{}'::jsonb,
  proposal_data jsonb not null default '{}'::jsonb,
  pipedrive_deal_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. Veilige upgrade van bestaande public.proposals
-- -----------------------------------------------------------------------------

-- Oude text-PK → uuid (alleen als id nog text is)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'proposals' and column_name = 'id'
      and data_type in ('text', 'character varying')
  ) then
    alter table public.proposals add column if not exists id_uuid uuid default gen_random_uuid();
    update public.proposals set id_uuid = gen_random_uuid() where id_uuid is null;
    update public.proposals set proposal_id = coalesce(proposal_id, id::text) where proposal_id is null;

    alter table public.proposals drop constraint if exists proposals_pkey;
    alter table public.proposals rename column id to id_legacy_text;
    alter table public.proposals rename column id_uuid to id;
    alter table public.proposals add primary key (id);
  end if;
end $$;

alter table public.proposals add column if not exists id uuid default gen_random_uuid();
alter table public.proposals add column if not exists pipedrive_deal_id text;
alter table public.proposals add column if not exists proposal_id text;
alter table public.proposals add column if not exists title text;
alter table public.proposals add column if not exists status text;
alter table public.proposals add column if not exists source text;
alter table public.proposals add column if not exists advisor jsonb;
alter table public.proposals add column if not exists customer jsonb;
alter table public.proposals add column if not exists proposal_data jsonb;
alter table public.proposals add column if not exists pipedrive_deal_url text;
alter table public.proposals add column if not exists created_at timestamptz;
alter table public.proposals add column if not exists updated_at timestamptz;

-- Legacy kolomnamen → nieuwe namen
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'proposals' and column_name = 'pipedrive_deal_link'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'proposals' and column_name = 'pipedrive_deal_url'
  ) then
    alter table public.proposals rename column pipedrive_deal_link to pipedrive_deal_url;
  end if;
end $$;

-- Backfill uit oude kolommen
update public.proposals
set
  proposal_id = coalesce(nullif(proposal_id, ''), id::text),
  pipedrive_deal_id = coalesce(
    nullif(pipedrive_deal_id, ''),
    nullif(proposal_data->'customer'->>'pipedriveDealId', ''),
    nullif(customer->>'pipedriveDealId', ''),
    regexp_replace(coalesce(nullif(proposal_id, ''), id::text, ''), '^FIH-', '')
  ),
  title = coalesce(title, proposal_data->>'title', label),
  status = coalesce(status, proposal_data->>'status', 'Nieuw vanuit Pipedrive'),
  advisor = coalesce(advisor, proposal_data->'advisor', '{}'::jsonb),
  customer = coalesce(customer, proposal_data->'customer', '{}'::jsonb),
  proposal_data = coalesce(proposal_data, '{}'::jsonb),
  pipedrive_deal_url = coalesce(
    pipedrive_deal_url,
    customer->>'pipedriveDealLink',
    proposal_data->'customer'->>'pipedriveDealLink'
  ),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where pipedrive_deal_id is null
   or proposal_id is null
   or proposal_data is null;

-- Verwijder rijen zonder pipedrive_deal_id (corrupte testdata)
delete from public.proposals where pipedrive_deal_id is null or pipedrive_deal_id = '';

-- Verplichte velden + defaults
alter table public.proposals alter column pipedrive_deal_id set not null;
alter table public.proposals alter column proposal_id set not null;
alter table public.proposals alter column status set default 'Nieuw vanuit Pipedrive';
alter table public.proposals alter column status set not null;
alter table public.proposals alter column advisor set default '{}'::jsonb;
alter table public.proposals alter column advisor set not null;
alter table public.proposals alter column customer set default '{}'::jsonb;
alter table public.proposals alter column customer set not null;
alter table public.proposals alter column proposal_data set default '{}'::jsonb;
alter table public.proposals alter column proposal_data set not null;
alter table public.proposals alter column created_at set default now();
alter table public.proposals alter column created_at set not null;
alter table public.proposals alter column updated_at set default now();
alter table public.proposals alter column updated_at set not null;

-- Optionele oude kolommen niet meer gebruikt door de app (blijven staan, geen conflict)
-- label, pdf_url, archived_at, id_legacy_text

-- Unieke Pipedrive deal
drop index if exists public.proposals_pipedrive_deal_id_uidx;
create unique index if not exists proposals_pipedrive_deal_id_uidx
  on public.proposals (pipedrive_deal_id);

create index if not exists proposals_status_idx on public.proposals (status);
create index if not exists proposals_updated_at_idx on public.proposals (updated_at desc);
create index if not exists proposals_proposal_id_idx on public.proposals (proposal_id);

-- PostgREST schema cache
notify pgrst, 'reload schema';
