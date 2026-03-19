DELETE FROM public.client_activity_logs
WHERE lead_id IN (
  SELECT id FROM public.client_leads WHERE phone = '+15550001234'
);

DELETE FROM public.client_leads
WHERE phone = '+15550001234';
