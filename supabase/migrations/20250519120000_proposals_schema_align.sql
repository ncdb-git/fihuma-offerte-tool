-- Align public.proposals with src/lib/proposal-store.ts upsert row:
-- id, status, label, customer, advisor, proposal_data,
-- pipedrive_deal_id, pipedrive_deal_link, updated_at, archived_at
-- (+ created_at default, pdf_url optional)

create table if not exists public.proposals (
  id text primary key,
  status text not null default 'concept',
  label text not null default 'Fihuma Collectief',
  customer jsonb not null default '{}'::jsonb,
  advisor jsonb not null default '{}'::jsonb,
  proposal_data jsonb not null default '{}'::jsonb,
  pipedrive_deal_id text not null default '',
  pipedrive_deal_link text,
  pdf_url text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bestaande tabellen: ontbrekende kolommen toevoegen (bestaande kolommen blijven staan)
alter table public.proposals add column if not exists status text;
alter table public.proposals add column if not exists label text;
alter table public.proposals add column if not exists customer jsonb;
alter table public.proposals add column if not exists advisor jsonb;
alter table public.proposals add column if not exists proposal_data jsonb;
alter table public.proposals add column if not exists pipedrive_deal_id text;
alter table public.proposals add column if not exists pipedrive_deal_link text;
alter table public.proposals add column if not exists pdf_url text;
alter table public.proposals add column if not exists archived_at timestamptz;
alter table public.proposals add column if not exists created_at timestamptz;
alter table public.proposals add column if not exists updated_at timestamptz;

-- Legacy kolomnamen (oude schema's) → huidige namen
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'proposals' and column_name = 'data'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'proposals' and column_name = 'proposal_data'
  ) then
    alter table public.proposals rename column data to proposal_data;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'proposals' and column_name = 'deal_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'proposals' and column_name = 'pipedrive_deal_id'
  ) then
    alter table public.proposals rename column deal_id to pipedrive_deal_id;
  end if;
end $$;

-- Defaults voor bestaande rijen
update public.proposals set status = coalesce(status, 'concept') where status is null;
update public.proposals set label = coalesce(label, 'Fihuma Collectief') where label is null;
update public.proposals set customer = coalesce(customer, '{}'::jsonb) where customer is null;
update public.proposals set advisor = coalesce(advisor, '{}'::jsonb) where advisor is null;
update public.proposals set proposal_data = coalesce(proposal_data, '{}'::jsonb) where proposal_data is null;
update public.proposals set pipedrive_deal_id = coalesce(nullif(pipedrive_deal_id, ''), id) where pipedrive_deal_id is null or pipedrive_deal_id = '';
update public.proposals set created_at = coalesce(created_at, now()) where created_at is null;
update public.proposals set updated_at = coalesce(updated_at, now()) where updated_at is null;

-- NOT NULL + defaults (veilig na backfill)
alter table public.proposals alter column status set default 'concept';
alter table public.proposals alter column status set not null;
alter table public.proposals alter column label set default 'Fihuma Collectief';
alter table public.proposals alter column label set not null;
alter table public.proposals alter column customer set default '{}'::jsonb;
alter table public.proposals alter column customer set not null;
alter table public.proposals alter column advisor set default '{}'::jsonb;
alter table public.proposals alter column advisor set not null;
alter table public.proposals alter column proposal_data set default '{}'::jsonb;
alter table public.proposals alter column proposal_data set not null;
alter table public.proposals alter column pipedrive_deal_id set default '';
alter table public.proposals alter column pipedrive_deal_id set not null;
alter table public.proposals alter column created_at set default now();
alter table public.proposals alter column created_at set not null;
alter table public.proposals alter column updated_at set default now();
alter table public.proposals alter column updated_at set not null;

-- Indexen
create index if not exists proposals_status_idx on public.proposals (status);
create index if not exists proposals_created_at_idx on public.proposals (created_at desc);
create index if not exists proposals_updated_at_idx on public.proposals (updated_at desc);

create index if not exists proposals_customer_search_idx
  on public.proposals using gin (customer jsonb_path_ops);

create unique index if not exists proposals_pipedrive_deal_id_uidx
  on public.proposals (pipedrive_deal_id)
  where pipedrive_deal_id is not null and pipedrive_deal_id <> '';

-- PostgREST schema cache verversen (Supabase)
notify pgrst, 'reload schema';
