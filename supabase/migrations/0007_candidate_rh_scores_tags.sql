-- Avaliação manual do RH (paralela à IA) e sistema de tags por candidato

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS rh_notes TEXT,
  ADD COLUMN IF NOT EXISTS rh_technical_score INTEGER CHECK (rh_technical_score IS NULL OR (rh_technical_score >= 0 AND rh_technical_score <= 100)),
  ADD COLUMN IF NOT EXISTS rh_cultural_score INTEGER CHECK (rh_cultural_score IS NULL OR (rh_cultural_score >= 0 AND rh_cultural_score <= 100));

COMMENT ON COLUMN candidates.rh_notes IS 'Comentário / notas manuais do RH sobre o candidato.';
COMMENT ON COLUMN candidates.rh_technical_score IS 'Score técnico atribuído pelo RH (0–100), independente da IA.';
COMMENT ON COLUMN candidates.rh_cultural_score IS 'Score cultural atribuído pelo RH (0–100), independente da IA.';

-- Catálogo de tags (reutilizável em filtros, kanban, etc.)
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tags_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS tags_slug_idx ON tags (slug);

COMMENT ON TABLE tags IS 'Etiquetas globais associáveis a candidatos (filtros, kanban, automações).';

-- N:N candidato ↔ tag
CREATE TABLE IF NOT EXISTS candidate_tags (
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (candidate_id, tag_id)
);

CREATE INDEX IF NOT EXISTS candidate_tags_tag_id_idx ON candidate_tags (tag_id);
CREATE INDEX IF NOT EXISTS candidate_tags_candidate_id_idx ON candidate_tags (candidate_id);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to tags"
  ON tags FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to candidate_tags"
  ON candidate_tags FOR ALL TO authenticated USING (true) WITH CHECK (true);
