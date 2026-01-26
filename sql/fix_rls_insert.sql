-- Fix RLS Policies to explicitly allow INSERTs (WITH CHECK)

-- 1. Candidates
DROP POLICY IF EXISTS "Enable all access for all users" ON candidates;
CREATE POLICY "Enable all access for all users" ON candidates FOR ALL 
USING (true) 
WITH CHECK (true);

-- 2. Manpower Requests
DROP POLICY IF EXISTS "Enable all access for all users" ON manpower_requests;
CREATE POLICY "Enable all access for all users" ON manpower_requests FOR ALL 
USING (true) 
WITH CHECK (true);

-- 3. Job Vacancies
DROP POLICY IF EXISTS "Enable all access for all users" ON job_vacancies;
CREATE POLICY "Enable all access for all users" ON job_vacancies FOR ALL 
USING (true) 
WITH CHECK (true);

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
