-- Maverick 360 Database Schema

-- Custom Types
CREATE TYPE candidate_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE interview_status AS ENUM ('scheduled', 'confirmed', 'missed');

-- Table: jobs
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cultural_criteria TEXT,
  technical_criteria TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: candidates
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cv_url TEXT,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  status candidate_status NOT NULL DEFAULT 'pending',
  cultural_score INTEGER CHECK (cultural_score >= 0 AND cultural_score <= 100),
  technical_score INTEGER CHECK (technical_score >= 0 AND technical_score <= 100),
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: interviews
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status interview_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS and create basic policies (Optional but recommended)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

-- Examples policies (assuming dashboard access requires authenticated users)
CREATE POLICY "Allow authenticated full access to jobs" ON jobs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow anonymous to read jobs" ON jobs FOR SELECT TO anon USING (true);

CREATE POLICY "Allow authenticated full access to candidates" ON candidates FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow anonymous to insert candidates" ON candidates FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to interviews" ON interviews FOR ALL TO authenticated USING (true);
