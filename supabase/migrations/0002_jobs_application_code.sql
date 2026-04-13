-- Código curto para integrações externas (Google Forms, Zapier, etc.)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS application_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS jobs_application_code_unique
  ON jobs (lower(trim(application_code)))
  WHERE application_code IS NOT NULL AND trim(application_code) <> '';
