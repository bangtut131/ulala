-- Add SLA tracking columns to manpower_requests table

ALTER TABLE manpower_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE manpower_requests ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP WITH TIME ZONE;
