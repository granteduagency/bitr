ALTER TABLE public.university_applications
ADD COLUMN IF NOT EXISTS external_workspace_id TEXT,
ADD COLUMN IF NOT EXISTS external_university_id TEXT,
ADD COLUMN IF NOT EXISTS external_university_name TEXT,
ADD COLUMN IF NOT EXISTS external_university_city TEXT,
ADD COLUMN IF NOT EXISTS external_university_country TEXT,
ADD COLUMN IF NOT EXISTS external_university_website TEXT;

CREATE INDEX IF NOT EXISTS idx_uni_apps_external_university_id
  ON public.university_applications(external_university_id);
