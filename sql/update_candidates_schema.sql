-- Run this script in your Supabase SQL Editor to fix the missing column errors

-- Add 'biggest_achievement' column (Text)
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS biggest_achievement TEXT;

-- Add 'strengths' column (JSON Array)
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS strengths JSONB DEFAULT '[]'::jsonb;

-- Add 'weaknesses' column (JSON Array)
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS weaknesses JSONB DEFAULT '[]'::jsonb;
