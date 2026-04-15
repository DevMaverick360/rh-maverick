-- Permite criar a linha singleton de ai_settings pelo painel (updateAISettings quando não existe registro).
CREATE POLICY "Authenticated can insert ai_settings"
  ON ai_settings FOR INSERT TO authenticated
  WITH CHECK (true);
