-- Add screening_status column to candidates table
-- Values: 'pending' (default), 'lanjut_screening', 'rejected'
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS screening_status TEXT DEFAULT 'pending';

-- Optional: Add index for filtering by status
CREATE INDEX IF NOT EXISTS idx_candidates_screening_status ON candidates(screening_status);
