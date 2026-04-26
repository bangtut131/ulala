-- ============================================
-- E-LEARNING MODULE - Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. LEARNING COURSES (per divisi)
CREATE TABLE IF NOT EXISTS learning_courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    division VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LEARNING MODULES (materi per course)
CREATE TABLE IF NOT EXISTS learning_modules (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES learning_courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    attachments JSONB DEFAULT '[]',
    duration_days INTEGER DEFAULT 7,
    passing_score INTEGER DEFAULT 70,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. LEARNING QUESTIONS (post-test per module)
CREATE TABLE IF NOT EXISTS learning_questions (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES learning_modules(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT,
    option_d TEXT,
    correct_answer CHAR(1) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. LEARNING RESULTS (hasil test karyawan)
CREATE TABLE IF NOT EXISTS learning_results (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    module_id INTEGER REFERENCES learning_modules(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    total_questions INTEGER,
    correct_answers INTEGER,
    passed BOOLEAN DEFAULT false,
    answers JSONB,
    attempt_number INTEGER DEFAULT 1,
    retake_approved BOOLEAN DEFAULT false,
    retake_approved_by VARCHAR(100),
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. LEARNING ACCESS (track waktu akses materi)
CREATE TABLE IF NOT EXISTS learning_access (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    module_id INTEGER REFERENCES learning_modules(id) ON DELETE CASCADE,
    first_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    access_count INTEGER DEFAULT 1,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, module_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_learning_courses_division ON learning_courses(division);
CREATE INDEX IF NOT EXISTS idx_learning_modules_course ON learning_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_questions_module ON learning_questions(module_id);
CREATE INDEX IF NOT EXISTS idx_learning_results_employee ON learning_results(employee_id);
CREATE INDEX IF NOT EXISTS idx_learning_results_module ON learning_results(module_id);
CREATE INDEX IF NOT EXISTS idx_learning_access_employee ON learning_access(employee_id);

-- RLS
ALTER TABLE learning_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_access ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='learning_courses' AND policyname='sr_all_lc') THEN
        CREATE POLICY sr_all_lc ON learning_courses FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='learning_modules' AND policyname='sr_all_lm') THEN
        CREATE POLICY sr_all_lm ON learning_modules FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='learning_questions' AND policyname='sr_all_lq') THEN
        CREATE POLICY sr_all_lq ON learning_questions FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='learning_results' AND policyname='sr_all_lr') THEN
        CREATE POLICY sr_all_lr ON learning_results FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='learning_access' AND policyname='sr_all_la') THEN
        CREATE POLICY sr_all_la ON learning_access FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
