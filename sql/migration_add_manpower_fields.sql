-- Add new fields for enhanced Manpower Request
-- hire_purpose: Replacement, Penambahan Karyawan, Posisi baru
-- position_level: Staff, Senior Staff, Head, etc.
-- Detailed requirements

ALTER TABLE manpower_requests ADD COLUMN IF NOT EXISTS hire_purpose TEXT;
ALTER TABLE manpower_requests ADD COLUMN IF NOT EXISTS position_level TEXT;
ALTER TABLE manpower_requests ADD COLUMN IF NOT EXISTS education_qualification TEXT;
ALTER TABLE manpower_requests ADD COLUMN IF NOT EXISTS years_of_experience TEXT;
ALTER TABLE manpower_requests ADD COLUMN IF NOT EXISTS other_qualifications TEXT;
