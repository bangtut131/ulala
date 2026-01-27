-- Migration: Add vacancy_id to candidates table
-- Purpose: Track which vacancy a candidate applied for, even if they haven't been assigned to a Manpower Request yet.
-- This enables accurate "Dilamar" (Applied) counts on the Admin Vacancy Dashboard.

ALTER TABLE candidates ADD COLUMN vacancy_id UUID REFERENCES job_vacancies(id);

-- Optional: Create index for performance
CREATE INDEX idx_candidates_vacancy_id ON candidates(vacancy_id);
