-- Referentie-schema — draai in Supabase SQL Editor:
-- supabase/migrations/20250519200000_proposals_v2_definitive.sql

create extension if not exists pgcrypto;

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

create unique index if not exists proposals_pipedrive_deal_id_uidx
  on public.proposals (pipedrive_deal_id);

create index if not exists proposals_status_idx on public.proposals (status);
create index if not exists proposals_updated_at_idx on public.proposals (updated_at desc);
create index if not exists proposals_proposal_id_idx on public.proposals (proposal_id);
