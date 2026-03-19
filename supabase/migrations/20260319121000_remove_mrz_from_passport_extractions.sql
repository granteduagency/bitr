UPDATE public.ikamet_applications
SET
  passport_extraction = CASE
    WHEN passport_extraction IS NULL THEN NULL
    ELSE passport_extraction - 'mrz'
  END,
  supporter_passport_extraction = CASE
    WHEN supporter_passport_extraction IS NULL THEN NULL
    ELSE supporter_passport_extraction - 'mrz'
  END
WHERE
  (passport_extraction IS NOT NULL AND passport_extraction ? 'mrz')
  OR (supporter_passport_extraction IS NOT NULL AND supporter_passport_extraction ? 'mrz');

UPDATE public.university_applications
SET passport_extraction = passport_extraction - 'mrz'
WHERE passport_extraction IS NOT NULL AND passport_extraction ? 'mrz';

UPDATE public.tercume_applications
SET passport_extraction = passport_extraction - 'mrz'
WHERE passport_extraction IS NOT NULL AND passport_extraction ? 'mrz';

UPDATE public.sigorta_applications
SET data = jsonb_set(data, '{passport_extraction}', (data->'passport_extraction') - 'mrz')
WHERE
  data IS NOT NULL
  AND jsonb_typeof(data->'passport_extraction') = 'object'
  AND (data->'passport_extraction') ? 'mrz';
