-- Maverick 360 — Settings Schema Migration

-- Table: profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'rh', 'visualizador')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: ai_settings (singleton-style, one row per org)
CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_prompt TEXT NOT NULL DEFAULT 'Você é um especialista em RH e recrutamento. Analise o currículo do candidato com base nos critérios técnicos e culturais da vaga. Retorne uma pontuação de 0 a 100 para cada critério e um resumo da análise.',
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  temperature NUMERIC(3,2) NOT NULL DEFAULT 0.3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default AI settings row
INSERT INTO ai_settings (system_prompt, model, temperature) VALUES (
  'Você é um especialista em RH e recrutamento. Analise o currículo do candidato com base nos critérios técnicos e culturais da vaga. Retorne uma pontuação de 0 a 100 para cada critério e um resumo da análise.',
  'gpt-4o-mini',
  0.3
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can manage profiles" ON profiles FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can read ai_settings" ON ai_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update ai_settings" ON ai_settings FOR UPDATE TO authenticated USING (true);

-- Trigger: auto-create profile on signup
-- SET search_path: obrigatório no Supabase Auth; senão INSERT em profiles falha (RLS/contexto).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    ),
    'admin'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
