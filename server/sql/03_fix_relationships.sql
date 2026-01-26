-- Fix Relations
-- Supabase/PostgREST needs explicit foreign keys to perform joins ("embedding")

-- 1. Analyses
ALTER TABLE analyses 
DROP CONSTRAINT IF EXISTS fk_analyses_candidate;

ALTER TABLE analyses
ADD CONSTRAINT fk_analyses_candidate
FOREIGN KEY (candidate_id) 
REFERENCES candidates(id)
ON DELETE CASCADE;

-- 2. DISC Results
ALTER TABLE disc_results 
DROP CONSTRAINT IF EXISTS fk_disc_candidate;

ALTER TABLE disc_results
ADD CONSTRAINT fk_disc_candidate
FOREIGN KEY (candidate_id) 
REFERENCES candidates(id)
ON DELETE CASCADE;

-- 3. Aptitude Results
ALTER TABLE aptitude_results 
DROP CONSTRAINT IF EXISTS fk_aptitude_candidate;

ALTER TABLE aptitude_results
ADD CONSTRAINT fk_aptitude_candidate
FOREIGN KEY (candidate_id) 
REFERENCES candidates(id)
ON DELETE CASCADE;

-- 4. Reload Schema Cache (Supabase specific)
NOTIFY pgrst, 'reload config';
