-- Fix missing relationship between Candidates and Manpower Requests

-- Add Foreign Key constraint to candidates table
-- This allows Supabase to detect the relationship "candidates!request_id"
ALTER TABLE candidates
ADD CONSTRAINT fk_candidates_manpower_requests
FOREIGN KEY (request_id) REFERENCES manpower_requests(id)
ON DELETE SET NULL;

-- Notify Supabase to refresh schema cache (usually automatic after DDL)
