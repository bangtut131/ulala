-- Migration: Add other_info to candidates table
-- Purpose: Store debug logs from background workers and additional candidate data not covered by other columns.
-- This is critical for troubleshooting AI analysis issues.

ALTER TABLE candidates ADD COLUMN other_info TEXT;
