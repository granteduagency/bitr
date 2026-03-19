INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = true;
