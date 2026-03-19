CREATE TABLE public.client_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_route TEXT,
  last_service_key TEXT,
  last_action TEXT,
  application_count INTEGER NOT NULL DEFAULT 0,
  last_application_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.client_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.client_leads(id) ON DELETE CASCADE,
  route TEXT,
  service_key TEXT,
  action TEXT NOT NULL,
  reference_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_leads_last_activity_at
  ON public.client_leads(last_activity_at DESC);

CREATE INDEX idx_client_leads_application_count
  ON public.client_leads(application_count);

CREATE INDEX idx_client_activity_logs_lead_id
  ON public.client_activity_logs(lead_id, created_at DESC);

CREATE UNIQUE INDEX idx_client_activity_logs_unique_reference
  ON public.client_activity_logs(lead_id, action, reference_id)
  WHERE reference_id IS NOT NULL;

ALTER TABLE public.client_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view client leads" ON public.client_leads
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage client leads" ON public.client_leads
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view client activity logs" ON public.client_activity_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage client activity logs" ON public.client_activity_logs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.normalize_contact_phone(_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned TEXT;
BEGIN
  cleaned := regexp_replace(trim(coalesce(_phone, '')), '[^0-9+]', '', 'g');

  IF cleaned = '' THEN
    RETURN '';
  END IF;

  IF cleaned LIKE '00%' THEN
    cleaned := '+' || substr(cleaned, 3);
  ELSIF left(cleaned, 1) <> '+' THEN
    cleaned := '+' || cleaned;
  END IF;

  RETURN cleaned;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_client_lead(
  _name TEXT,
  _phone TEXT,
  _entry_source TEXT DEFAULT 'landing',
  _metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_name TEXT := regexp_replace(trim(coalesce(_name, '')), '\s+', ' ', 'g');
  normalized_phone TEXT := public.normalize_contact_phone(_phone);
  lead_id UUID;
BEGIN
  IF normalized_name = '' OR normalized_phone = '' THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.client_leads (
    name,
    phone,
    first_seen_at,
    last_seen_at,
    last_activity_at,
    metadata
  )
  VALUES (
    normalized_name,
    normalized_phone,
    now(),
    now(),
    now(),
    jsonb_strip_nulls(coalesce(_metadata, '{}'::jsonb) || jsonb_build_object('entrySource', _entry_source))
  )
  ON CONFLICT (phone) DO UPDATE
  SET
    name = EXCLUDED.name,
    last_seen_at = now(),
    last_activity_at = now(),
    metadata = public.client_leads.metadata || EXCLUDED.metadata
  RETURNING id INTO lead_id;

  RETURN lead_id;
END;
$$;

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

GRANT EXECUTE ON FUNCTION public.upsert_client_lead(TEXT, TEXT, TEXT, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_client_activity(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_client_application(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated, service_role;
