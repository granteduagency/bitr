CREATE OR REPLACE FUNCTION public.record_client_activity(
  _name TEXT,
  _phone TEXT,
  _route TEXT,
  _service_key TEXT,
  _action TEXT,
  _details JSONB DEFAULT '{}'::jsonb,
  _reference_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_lead_id UUID;
BEGIN
  resolved_lead_id := public.upsert_client_lead(_name, _phone, 'dashboard', _details);

  IF resolved_lead_id IS NULL OR trim(coalesce(_action, '')) = '' THEN
    RETURN resolved_lead_id;
  END IF;

  INSERT INTO public.client_activity_logs (
    lead_id,
    route,
    service_key,
    action,
    reference_id,
    details
  )
  VALUES (
    resolved_lead_id,
    NULLIF(trim(coalesce(_route, '')), ''),
    NULLIF(trim(coalesce(_service_key, '')), ''),
    trim(_action),
    NULLIF(trim(coalesce(_reference_id, '')), ''),
    jsonb_strip_nulls(coalesce(_details, '{}'::jsonb))
  )
  ON CONFLICT (lead_id, action, reference_id)
    WHERE reference_id IS NOT NULL
  DO NOTHING;

  UPDATE public.client_leads
  SET
    last_seen_at = now(),
    last_activity_at = now(),
    last_route = NULLIF(trim(coalesce(_route, '')), ''),
    last_service_key = NULLIF(trim(coalesce(_service_key, '')), ''),
    last_action = trim(_action),
    metadata = public.client_leads.metadata || jsonb_strip_nulls(coalesce(_details, '{}'::jsonb))
  WHERE id = resolved_lead_id;

  RETURN resolved_lead_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_client_application(
  _name TEXT,
  _phone TEXT,
  _route TEXT,
  _service_key TEXT,
  _reference_id TEXT,
  _details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_lead_id UUID;
  inserted_id UUID;
BEGIN
  resolved_lead_id := public.upsert_client_lead(_name, _phone, 'application', _details);

  IF resolved_lead_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.client_activity_logs (
    lead_id,
    route,
    service_key,
    action,
    reference_id,
    details
  )
  VALUES (
    resolved_lead_id,
    NULLIF(trim(coalesce(_route, '')), ''),
    NULLIF(trim(coalesce(_service_key, '')), ''),
    'application_submitted',
    NULLIF(trim(coalesce(_reference_id, '')), ''),
    jsonb_strip_nulls(coalesce(_details, '{}'::jsonb))
  )
  ON CONFLICT (lead_id, action, reference_id)
    WHERE reference_id IS NOT NULL
  DO NOTHING
  RETURNING id INTO inserted_id;

  UPDATE public.client_leads
  SET
    last_seen_at = now(),
    last_activity_at = now(),
    last_route = NULLIF(trim(coalesce(_route, '')), ''),
    last_service_key = NULLIF(trim(coalesce(_service_key, '')), ''),
    last_action = CASE
      WHEN inserted_id IS NOT NULL THEN 'application_submitted'
      ELSE coalesce(last_action, 'application_submitted')
    END,
    last_application_at = CASE
      WHEN inserted_id IS NOT NULL THEN now()
      ELSE last_application_at
    END,
    application_count = CASE
      WHEN inserted_id IS NOT NULL THEN application_count + 1
      ELSE application_count
    END,
    metadata = public.client_leads.metadata || jsonb_strip_nulls(coalesce(_details, '{}'::jsonb))
  WHERE id = resolved_lead_id;

  RETURN resolved_lead_id;
END;
$$;
