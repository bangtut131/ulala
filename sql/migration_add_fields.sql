-- Add these columns to your 'candidates' table in Supabase

ALTER TABLE candidates ADD COLUMN nik TEXT;
ALTER TABLE candidates ADD COLUMN sim_ownership TEXT;
ALTER TABLE candidates ADD COLUMN sim_number TEXT;
ALTER TABLE candidates ADD COLUMN medical_history TEXT;
ALTER TABLE candidates ADD COLUMN experience JSONB;
ALTER TABLE candidates ADD COLUMN education JSONB;

-- Note: In SQLite (if used locally), JSONB is just TEXT. 
-- In Supabase (PostgreSQL), JSONB is binary JSON. This script is standard SQL.
