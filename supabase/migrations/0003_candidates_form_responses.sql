-- Respostas de formulário externo (ex.: Google Forms): pergunta + resposta por item
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS form_responses JSONB DEFAULT NULL;

COMMENT ON COLUMN candidates.form_responses IS 'Array JSON: [{"question":"...","answer":"..."}, ...]';
