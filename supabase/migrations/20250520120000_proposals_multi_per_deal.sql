-- Meerdere conceptoffertes per Pipedrive-deal (zelfde klant)
drop index if exists public.proposals_pipedrive_deal_id_uidx;

create unique index if not exists proposals_proposal_id_uidx
  on public.proposals (proposal_id);

create index if not exists proposals_pipedrive_deal_id_idx
  on public.proposals (pipedrive_deal_id);

notify pgrst, 'reload schema';
