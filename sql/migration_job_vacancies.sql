-- Create job_vacancies table
CREATE TABLE IF NOT EXISTS job_vacancies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manpower_request_id BIGINT REFERENCES manpower_requests(id),
    title TEXT NOT NULL,
    description TEXT,
    requirements TEXT,
    location TEXT DEFAULT 'Head Office',
    type TEXT DEFAULT 'Full-time',
    salary_range TEXT,
    posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster public queries
CREATE INDEX IF NOT EXISTS idx_vacancies_active ON job_vacancies(is_active, expires_at);
