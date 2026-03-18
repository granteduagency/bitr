ALTER TABLE public.ikamet_applications
ADD COLUMN IF NOT EXISTS passport_document_id TEXT,
ADD COLUMN IF NOT EXISTS passport_extraction JSONB,
ADD COLUMN IF NOT EXISTS supporter_passport_document_id TEXT,
ADD COLUMN IF NOT EXISTS supporter_passport_extraction JSONB;

ALTER TABLE public.university_applications
ADD COLUMN IF NOT EXISTS passport_document_id TEXT,
ADD COLUMN IF NOT EXISTS passport_extraction JSONB;

ALTER TABLE public.tercume_applications
ADD COLUMN IF NOT EXISTS passport_document_id TEXT,
ADD COLUMN IF NOT EXISTS passport_extraction JSONB;
