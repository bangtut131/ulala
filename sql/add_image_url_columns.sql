-- Add image_url column to manpower_requests table
ALTER TABLE manpower_requests ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to job_vacancies table
ALTER TABLE job_vacancies ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for vacancy images (run in Supabase SQL Editor)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('vacancy-images', 'vacancy-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policy: Allow public read access
-- CREATE POLICY "Public Read vacancy-images" ON storage.objects
--   FOR SELECT USING (bucket_id = 'vacancy-images');

-- Storage policy: Allow authenticated upload
-- CREATE POLICY "Authenticated Upload vacancy-images" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'vacancy-images');

-- Storage policy: Allow authenticated update
-- CREATE POLICY "Authenticated Update vacancy-images" ON storage.objects
--   FOR UPDATE USING (bucket_id = 'vacancy-images');

-- Storage policy: Allow authenticated delete
-- CREATE POLICY "Authenticated Delete vacancy-images" ON storage.objects
--   FOR DELETE USING (bucket_id = 'vacancy-images');
