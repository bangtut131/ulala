-- Tambahkan kolom snapshots (menyimpan URL array dalam bentu JSONB) pada tabel candidates
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS snapshots JSONB DEFAULT '[]'::jsonb;

-- Buat Storage Bucket baru untuk menampung gambar dari webcam (Proctoring)
-- Pastikan untuk menjalankan ini di Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public) 
VALUES ('candidate-snapshots', 'candidate-snapshots', true)
ON CONFLICT (id) DO NOTHING;

-- Policies untuk Storage (Publik bisa Upload dan Read)
-- Agar kandidat dari frontend bisa langsung diambil gambarnya oleh service role backend
CREATE POLICY "Public Read Snapshots"
ON storage.objects FOR SELECT
USING ( bucket_id = 'candidate-snapshots' );

CREATE POLICY "Authenticated Write Snapshots"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'candidate-snapshots' );
