-- ============================================
-- EMPLOYEE DATABASE MODULE - Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE,
    candidate_id INTEGER REFERENCES candidates(id) ON DELETE SET NULL,
    
    -- Core Info
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    nik VARCHAR(30),
    dob DATE,
    religion VARCHAR(50),
    blood_type VARCHAR(10),
    address TEXT,
    photo_url TEXT,
    
    -- Employment Info
    division VARCHAR(100),
    position VARCHAR(255),
    position_level VARCHAR(100),
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    employment_type VARCHAR(50) DEFAULT 'Full-time',
    
    -- Status Management
    status VARCHAR(50) DEFAULT 'Probation',
    probation_months INTEGER DEFAULT 3,
    probation_end_date DATE,
    
    -- Dynamic Custom Fields (JSONB)
    custom_fields JSONB DEFAULT '{}',
    
    -- Screening Snapshot
    disc_profile VARCHAR(20),
    match_score INTEGER,
    cv_url TEXT,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. EMPLOYEE HISTORY TABLE
CREATE TABLE IF NOT EXISTS employee_history (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_date TIMESTAMPTZ DEFAULT NOW(),
    old_value JSONB,
    new_value JSONB,
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EXIT RECORDS TABLE
CREATE TABLE IF NOT EXISTS exit_records (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    exit_date DATE NOT NULL,
    exit_type VARCHAR(50),
    reason TEXT,
    last_working_day DATE,
    
    -- Feedback (1-5 rating)
    feedback_work_environment INTEGER,
    feedback_management INTEGER,
    feedback_career_growth INTEGER,
    feedback_compensation INTEGER,
    feedback_overall INTEGER,
    suggestions TEXT,
    would_rejoin BOOLEAN,
    exit_interview_notes TEXT,
    
    -- Clearance
    clearance JSONB DEFAULT '{}',
    
    filled_by VARCHAR(50) DEFAULT 'hr',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ONBOARDING ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS onboarding_accounts (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    account_type VARCHAR(100) NOT NULL,
    username VARCHAR(255),
    password VARCHAR(255),
    url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ONBOARDING USERS TABLE (login portal)
CREATE TABLE IF NOT EXISTS onboarding_users (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_division ON employees(division);
CREATE INDEX IF NOT EXISTS idx_employees_candidate ON employees(candidate_id);
CREATE INDEX IF NOT EXISTS idx_employee_history_employee ON employee_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_exit_records_employee ON exit_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_accounts_employee ON onboarding_accounts(employee_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_users_employee ON onboarding_users(employee_id);

-- RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_users ENABLE ROW LEVEL SECURITY;

-- Policies (allow all via service_role, which our supabaseAdmin client uses)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname = 'service_role_all_employees') THEN
        CREATE POLICY service_role_all_employees ON employees FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_history' AND policyname = 'service_role_all_employee_history') THEN
        CREATE POLICY service_role_all_employee_history ON employee_history FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exit_records' AND policyname = 'service_role_all_exit_records') THEN
        CREATE POLICY service_role_all_exit_records ON exit_records FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'onboarding_accounts' AND policyname = 'service_role_all_onboarding_accounts') THEN
        CREATE POLICY service_role_all_onboarding_accounts ON onboarding_accounts FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'onboarding_users' AND policyname = 'service_role_all_onboarding_users') THEN
        CREATE POLICY service_role_all_onboarding_users ON onboarding_users FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
