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

module.exports = router;
