-- ====================================================================
-- Indochina Travel Pro — Supabase Schema Setup
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run
-- ====================================================================

-- 1. Structured Knowledge Table (stores the 4 structured data files)
CREATE TABLE IF NOT EXISTS structured_knowledge (
  filename TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (recommended by Supabase)
ALTER TABLE structured_knowledge ENABLE ROW LEVEL SECURITY;

-- Allow service key full access (server-side only)
CREATE POLICY "Service key full access" ON structured_knowledge
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. Verify the table was created
SELECT 'structured_knowledge table created successfully!' AS status;
