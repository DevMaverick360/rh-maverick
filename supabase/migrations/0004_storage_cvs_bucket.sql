-- Bucket público para currículos (API /api/cv/submit e painel)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cvs',
  'cvs',
  true,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Leitura pública (URLs getPublicUrl)
DROP POLICY IF EXISTS "cvs_select_public" ON storage.objects;
CREATE POLICY "cvs_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cvs');

-- Upload sem login (formulário / anon) — alinhado à política de insert em candidates
DROP POLICY IF EXISTS "cvs_insert_anon" ON storage.objects;
CREATE POLICY "cvs_insert_anon"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'cvs');

-- Upload logado (painel)
DROP POLICY IF EXISTS "cvs_insert_authenticated" ON storage.objects;
CREATE POLICY "cvs_insert_authenticated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cvs');

-- Atualizar / remover apenas usuários autenticados (manutenção no painel)
DROP POLICY IF EXISTS "cvs_update_authenticated" ON storage.objects;
CREATE POLICY "cvs_update_authenticated"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cvs')
  WITH CHECK (bucket_id = 'cvs');

DROP POLICY IF EXISTS "cvs_delete_authenticated" ON storage.objects;
CREATE POLICY "cvs_delete_authenticated"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cvs');
