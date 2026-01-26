-- Add full_result column to disc_results table to store detailed analysis
ALTER TABLE disc_results ADD COLUMN IF NOT EXISTS full_result JSONB;

-- Comment on column
COMMENT ON COLUMN disc_results.full_result IS 'Stores the complete calculated DISC result including Graphs, Consistency, and Job Match analysis';
