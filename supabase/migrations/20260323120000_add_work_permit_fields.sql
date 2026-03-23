alter table public.calisma_applications
  add column if not exists has_employer boolean,
  add column if not exists job_type text;
