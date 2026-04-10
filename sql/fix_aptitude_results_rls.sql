-- Fix: Enable RLS on aptitude_results table
-- This table was created without RLS, triggering a Supabase security warning.
-- All other tables already have RLS enabled.

-- 1. Enable Row Level Security
ALTER TABLE aptitude_results ENABLE ROW LEVEL SECURITY;

-- 2. Create permissive policy (matching the pattern used by all other tables)
CREATE POLICY "Enable all access for all users" ON aptitude_results FOR ALL 
USING (true) 
WITH CHECK (true);

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
