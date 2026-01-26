-- FORCE FIX Candidate Relationships and Cascading Deletes

-- 1. Fix 'analyses' table Foreign Key
-- Drop existing constraints (trying common names)
ALTER TABLE analyses DROP CONSTRAINT IF EXISTS analyses_candidate_id_fkey;
ALTER TABLE analyses DROP CONSTRAINT IF EXISTS fk_analyses_candidate;

-- Re-add with CASCADE
ALTER TABLE analyses
ADD CONSTRAINT analyses_candidate_id_fkey
FOREIGN KEY (candidate_id) REFERENCES candidates(id)
ON DELETE CASCADE;


-- 2. Fix 'disc_results' table Foreign Key
ALTER TABLE disc_results DROP CONSTRAINT IF EXISTS disc_results_candidate_id_fkey;
ALTER TABLE disc_results DROP CONSTRAINT IF EXISTS fk_disc_results_candidate;

-- Re-add with CASCADE
ALTER TABLE disc_results
ADD CONSTRAINT disc_results_candidate_id_fkey
FOREIGN KEY (candidate_id) REFERENCES candidates(id)
ON DELETE CASCADE;


-- 3. Force Schema Cache Refresh
NOTIFY pgrst, 'reload schema';
