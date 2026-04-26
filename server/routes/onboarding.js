const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../services/supabaseClient');

const JWT_SECRET = process.env.JWT_SECRET || 'hr-screening-secret-key';

// POST /api/onboarding/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi' });

        const { data: user, error } = await supabaseAdmin
            .from('onboarding_users')
            .select('*, employees(id, full_name, position, division, photo_url)')
            .eq('username', username)
            .single();

        if (error || !user) return res.status(401).json({ error: 'Username tidak ditemukan' });
        if (!user.is_active) return res.status(403).json({ error: 'Akun sudah dinonaktifkan' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Password salah' });

        // Update last_login
        await supabaseAdmin.from('onboarding_users').update({ last_login: new Date().toISOString() }).eq('id', user.id);

        const token = jwt.sign({ id: user.id, employeeId: user.employee_id, role: 'onboarding' }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                employeeId: user.employee_id,
                employee: user.employees || null
            }
        });
    } catch (error) {
        console.error('Onboarding login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Middleware for onboarding auth
function authenticateOnboarding(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token required' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'onboarding') return res.status(403).json({ error: 'Invalid token type' });
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Token expired or invalid' });
    }
}

// GET /api/onboarding/me - Get employee profile
router.get('/me', authenticateOnboarding, async (req, res) => {
    try {
        const { data: employee, error } = await supabaseAdmin
            .from('employees')
            .select('id, employee_id, full_name, email, phone, position, division, join_date, status, photo_url, custom_fields')
            .eq('id', req.user.employeeId)
            .single();
        if (error || !employee) return res.status(404).json({ error: 'Employee not found' });
        res.json(employee);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// GET /api/onboarding/accounts - Get assigned accounts
router.get('/accounts', authenticateOnboarding, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('onboarding_accounts')
            .select('id, account_type, username, password, url, notes')
            .eq('employee_id', req.user.employeeId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        res.json(data || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch accounts' });
    }
});

// POST /api/onboarding/exit-form - Submit exit form (by employee)
router.post('/exit-form', authenticateOnboarding, async (req, res) => {
    try {
        const d = req.body;
        const empId = req.user.employeeId;

        const { data: existing } = await supabaseAdmin
            .from('exit_records').select('id').eq('employee_id', empId).single();

        const payload = {
            employee_id: empId,
            exit_date: d.exit_date || new Date().toISOString().split('T')[0],
            exit_type: d.exit_type || 'Resign',
            reason: d.reason,
            feedback_work_environment: d.feedback_work_environment,
            feedback_management: d.feedback_management,
            feedback_career_growth: d.feedback_career_growth,
            feedback_compensation: d.feedback_compensation,
            feedback_overall: d.feedback_overall,
            suggestions: d.suggestions,
            would_rejoin: d.would_rejoin,
            filled_by: 'employee'
        };

        if (existing) {
            await supabaseAdmin.from('exit_records').update(payload).eq('id', existing.id);
        } else {
            await supabaseAdmin.from('exit_records').insert([payload]);
        }

        res.json({ success: true, message: 'Exit form submitted' });
    } catch (error) {
        console.error('Exit form error:', error);
        res.status(500).json({ error: 'Failed to submit exit form' });
    }
});

// POST /api/onboarding/change-password
router.post('/change-password', authenticateOnboarding, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const { data: user } = await supabaseAdmin
            .from('onboarding_users').select('password_hash').eq('id', req.user.id).single();
        if (!user) return res.status(404).json({ error: 'User not found' });
        const valid = await bcrypt.compare(oldPassword, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Password lama salah' });
        const hash = await bcrypt.hash(newPassword, 10);
        await supabaseAdmin.from('onboarding_users').update({ password_hash: hash }).eq('id', req.user.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to change password' });
    }
});
// ═══════════════ E-LEARNING (Onboarding side) ═══════════════

// GET /api/onboarding/courses - Get courses for employee's division
router.get('/courses', authenticateOnboarding, async (req, res) => {
    try {
        const { data: emp } = await supabaseAdmin.from('employees').select('division').eq('id', req.user.employeeId).single();
        const division = emp?.division;
        let q = supabaseAdmin.from('learning_courses').select('*, learning_modules(id, title, duration_days, passing_score, sort_order, is_active)').eq('is_active', true).order('sort_order');
        const { data, error } = await q;
        if (error) throw error;
        // Filter: courses with no division (global) OR matching employee's division
        const filtered = (data || []).filter(c => !c.division || c.division === division);
        // Get progress for each module
        const moduleIds = filtered.flatMap(c => (c.learning_modules || []).map(m => m.id));
        const { data: results } = await supabaseAdmin.from('learning_results').select('module_id, score, passed, attempt_number, retake_approved').eq('employee_id', req.user.employeeId);
        const { data: accesses } = await supabaseAdmin.from('learning_access').select('module_id, first_accessed_at, expires_at, access_count').eq('employee_id', req.user.employeeId);
        const resultMap = {};
        (results || []).forEach(r => { resultMap[r.module_id] = r; });
        const accessMap = {};
        (accesses || []).forEach(a => { accessMap[a.module_id] = a; });
        const coursesWithProgress = filtered.map(c => ({
            ...c,
            learning_modules: (c.learning_modules || []).filter(m => m.is_active).map(m => ({
                ...m,
                result: resultMap[m.id] || null,
                access: accessMap[m.id] || null
            }))
        }));
        res.json(coursesWithProgress);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/onboarding/modules/:id - Read module content (tracks access + time limit)
router.get('/modules/:id', authenticateOnboarding, async (req, res) => {
    try {
        const moduleId = parseInt(req.params.id);
        const empId = req.user.employeeId;
        const { data: mod, error } = await supabaseAdmin.from('learning_modules').select('*').eq('id', moduleId).single();
        if (error || !mod) return res.status(404).json({ error: 'Module not found' });
        // Check/create access record
        const { data: access } = await supabaseAdmin.from('learning_access').select('*').eq('employee_id', empId).eq('module_id', moduleId).single();
        const now = new Date();
        if (access) {
            if (new Date(access.expires_at) < now) {
                return res.status(403).json({ error: 'Waktu akses materi sudah habis', expired: true, expires_at: access.expires_at });
            }
            await supabaseAdmin.from('learning_access').update({ access_count: access.access_count + 1, last_accessed_at: now.toISOString() }).eq('id', access.id);
        } else {
            const expiresAt = new Date(now.getTime() + (mod.duration_days || 7) * 24 * 60 * 60 * 1000);
            await supabaseAdmin.from('learning_access').insert([{ employee_id: empId, module_id: moduleId, expires_at: expiresAt.toISOString() }]);
        }
        res.json(mod);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/onboarding/modules/:id/test - Get test questions (no correct answers!)
router.get('/modules/:id/test', authenticateOnboarding, async (req, res) => {
    try {
        const moduleId = parseInt(req.params.id);
        const empId = req.user.employeeId;
        // Check if already attempted and no retake approved
        const { data: existing } = await supabaseAdmin.from('learning_results').select('id, passed, retake_approved').eq('employee_id', empId).eq('module_id', moduleId).order('completed_at', { ascending: false }).limit(1);
        const latest = existing?.[0];
        if (latest && !latest.retake_approved) {
            return res.status(403).json({ error: 'Anda sudah mengerjakan test ini. Hubungi HR untuk retake.', alreadyAttempted: true, passed: latest.passed });
        }
        const { data, error } = await supabaseAdmin.from('learning_questions').select('id, question, option_a, option_b, option_c, option_d, sort_order').eq('module_id', moduleId).order('sort_order');
        if (error) throw error;
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/onboarding/modules/:id/submit - Submit test answers
router.post('/modules/:id/submit', authenticateOnboarding, async (req, res) => {
    try {
        const moduleId = parseInt(req.params.id);
        const empId = req.user.employeeId;
        const { answers } = req.body; // { "questionId": "a", ... }
        // Check if already attempted
        const { data: prevResults } = await supabaseAdmin.from('learning_results').select('id, retake_approved, attempt_number').eq('employee_id', empId).eq('module_id', moduleId).order('completed_at', { ascending: false });
        const latest = prevResults?.[0];
        if (latest && !latest.retake_approved) {
            return res.status(403).json({ error: 'Test sudah dikerjakan. Retake belum disetujui.' });
        }
        // If retake was approved, reset the flag
        if (latest && latest.retake_approved) {
            await supabaseAdmin.from('learning_results').update({ retake_approved: false }).eq('id', latest.id);
        }
        // Get correct answers
        const { data: questions } = await supabaseAdmin.from('learning_questions').select('id, correct_answer').eq('module_id', moduleId);
        const { data: mod } = await supabaseAdmin.from('learning_modules').select('passing_score').eq('id', moduleId).single();
        const total = questions.length;
        let correct = 0;
        questions.forEach(q => { if (answers[String(q.id)]?.toLowerCase() === q.correct_answer.toLowerCase()) correct++; });
        const score = total > 0 ? Math.round((correct / total) * 100) : 0;
        const passed = score >= (mod?.passing_score || 70);
        const attemptNum = (latest?.attempt_number || 0) + 1;
        const { data: result, error } = await supabaseAdmin.from('learning_results').insert([{ employee_id: empId, module_id: moduleId, score, total_questions: total, correct_answers: correct, passed, answers, attempt_number: attemptNum }]).select().single();
        if (error) throw error;
        res.json({ success: true, score, total, correct, passed, passingScore: mod?.passing_score || 70, result });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/onboarding/progress - Overall learning progress
router.get('/progress', authenticateOnboarding, async (req, res) => {
    try {
        const empId = req.user.employeeId;
        const { data: emp } = await supabaseAdmin.from('employees').select('division').eq('id', empId).single();
        const { data: courses } = await supabaseAdmin.from('learning_courses').select('id, division').eq('is_active', true);
        const myCourses = (courses || []).filter(c => !c.division || c.division === emp?.division);
        const courseIds = myCourses.map(c => c.id);
        let totalModules = 0, completedModules = 0, passedModules = 0;
        if (courseIds.length > 0) {
            const { data: modules } = await supabaseAdmin.from('learning_modules').select('id').eq('is_active', true).in('course_id', courseIds);
            totalModules = modules?.length || 0;
            const { data: results } = await supabaseAdmin.from('learning_results').select('module_id, passed').eq('employee_id', empId);
            const attempted = new Set((results || []).map(r => r.module_id));
            const passedSet = new Set((results || []).filter(r => r.passed).map(r => r.module_id));
            completedModules = attempted.size;
            passedModules = passedSet.size;
        }
        res.json({ totalModules, completedModules, passedModules, progressPercent: totalModules > 0 ? Math.round((passedModules / totalModules) * 100) : 0 });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
