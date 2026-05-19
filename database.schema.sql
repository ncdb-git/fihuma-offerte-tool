create table if not exists advisors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists proposals (
  id text primary key,
  status text not null default 'concept',
  label text not null default 'Fihuma Collectief',
  customer jsonb not null,
  advisor jsonb not null,
  proposal_data jsonb not null,
  pipedrive_deal_id text not null,
  pipedrive_deal_link text,
  pdf_url text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposals_customer_search_idx
  on proposals using gin (customer jsonb_path_ops);

create index if not exists proposals_status_idx
  on proposals (status);

create index if not exists proposals_created_at_idx
  on proposals (created_at desc);

create unique index if not exists proposals_pipedrive_deal_id_uidx
  on proposals (pipedrive_deal_id)
  where pipedrive_deal_id is not null and pipedrive_deal_id <> '';
