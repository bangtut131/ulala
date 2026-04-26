const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middleware/authMiddleware');
const { supabaseAdmin } = require('../services/supabaseClient');
const { generateOnboardingCredentials } = require('../services/employeeService');

const upload = multer({ storage: multer.memoryStorage() });

// GET /api/employees - List with filters
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status, division, search, page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let query = supabaseAdmin.from('employees').select('*', { count: 'exact' })
            .order('created_at', { ascending: false }).range(offset, offset + parseInt(limit) - 1);
        if (status && status !== 'all') query = query.eq('status', status);
        if (division && division !== 'all') query = query.eq('division', division);
        if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,employee_id.ilike.%${search}%,position.ilike.%${search}%`);
        const { data, error, count } = await query;
        if (error) throw error;
        res.json({ employees: data || [], total: count || 0 });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

// GET /api/employees/stats
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const { data: all, error } = await supabaseAdmin.from('employees').select('status, division');
        if (error) throw error;
        const inactive = ['Resigned', 'Terminated', 'Retired'];
        const stats = {
            total: all.length,
            active: all.filter(e => !inactive.includes(e.status)).length,
            probation: all.filter(e => e.status === 'Probation').length,
            permanent: all.filter(e => e.status === 'Permanent').length,
            contract: all.filter(e => e.status === 'Contract').length,
            resigned: all.filter(e => e.status === 'Resigned').length,
            terminated: all.filter(e => e.status === 'Terminated').length,
            byDivision: {}
        };
        all.forEach(e => {
            const div = e.division || 'Unassigned';
            if (!stats.byDivision[div]) stats.byDivision[div] = 0;
            if (!inactive.includes(e.status)) stats.byDivision[div]++;
        });
        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// GET /api/employees/:id - Detail with relations
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { data: employee, error } = await supabaseAdmin.from('employees').select('*').eq('id', id).single();
        if (error || !employee) return res.status(404).json({ error: 'Employee not found' });
        const [historyRes, exitRes, accountsRes, obUserRes] = await Promise.all([
            supabaseAdmin.from('employee_history').select('*').eq('employee_id', id).order('event_date', { ascending: false }),
            supabaseAdmin.from('exit_records').select('*').eq('employee_id', id).limit(1),
            supabaseAdmin.from('onboarding_accounts').select('*').eq('employee_id', id),
            supabaseAdmin.from('onboarding_users').select('id, username, is_active, last_login, created_at').eq('employee_id', id).single()
        ]);
        res.json({ ...employee, history: historyRes.data || [], exitRecord: exitRes.data?.[0] || null, accounts: accountsRes.data || [], onboardingUser: obUserRes.data || null });
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({ error: 'Failed to fetch employee' });
    }
});

// POST /api/employees - Manual add
router.post('/', authenticateToken, async (req, res) => {
    try {
        const d = req.body;
        const joinDate = d.join_date ? new Date(d.join_date) : new Date();
        const pm = parseInt(d.probation_months) || 3;
        const pe = new Date(joinDate); pe.setMonth(pe.getMonth() + pm);
        const payload = {
            employee_id: d.employee_id || null, full_name: d.full_name, email: d.email, phone: d.phone,
            nik: d.nik, dob: d.dob, religion: d.religion, blood_type: d.blood_type, address: d.address,
            photo_url: d.photo_url, division: d.division, position: d.position, position_level: d.position_level,
            join_date: joinDate.toISOString().split('T')[0], employment_type: d.employment_type || 'Full-time',
            status: d.status || 'Probation', probation_months: pm,
            probation_end_date: pe.toISOString().split('T')[0], custom_fields: d.custom_fields || {}, notes: d.notes
        };
        const { data: employee, error } = await supabaseAdmin.from('employees').insert([payload]).select().single();
        if (error) throw error;
        await supabaseAdmin.from('employee_history').insert([{ employee_id: employee.id, event_type: 'joined', new_value: { position: d.position, division: d.division }, notes: 'Manually added by HR', created_by: 'admin' }]);
        const credentials = await generateOnboardingCredentials(employee);
        res.json({ success: true, employee, credentials });
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({ error: 'Failed to create employee: ' + error.message });
    }
});

// POST /api/employees/import - Excel import
router.post('/import', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file provided' });
        const XLSX = require('xlsx');
        const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        if (!rows || rows.length === 0) return res.status(400).json({ error: 'Empty file' });
        const results = { success: 0, errors: [] };
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            try {
                const name = r['Nama Lengkap'] || r['full_name'];
                if (!name) { results.errors.push({ row: i+2, error: 'Nama kosong' }); continue; }
                const jd = r['Tanggal Masuk'] || r['join_date'] ? new Date(r['Tanggal Masuk'] || r['join_date']) : new Date();
                const pm = parseInt(r['Masa Probation'] || r['probation_months']) || 3;
                const pe = new Date(jd); pe.setMonth(pe.getMonth() + pm);
                const { error } = await supabaseAdmin.from('employees').insert([{
                    employee_id: r['ID Karyawan'] || r['employee_id'] || null, full_name: name,
                    email: r['Email'] || r['email'], phone: r['No. HP'] || r['phone'], nik: r['NIK'] || r['nik'],
                    division: r['Divisi'] || r['division'], position: r['Posisi'] || r['position'],
                    join_date: jd.toISOString().split('T')[0], status: r['Status'] || r['status'] || 'Permanent',
                    employment_type: r['Tipe'] || 'Full-time', probation_months: pm,
                    probation_end_date: pe.toISOString().split('T')[0], notes: 'Imported from Excel'
                }]);
                if (error) throw error;
                results.success++;
            } catch (e) { results.errors.push({ row: i+2, error: e.message }); }
        }
        res.json({ success: true, imported: results.success, total: rows.length, errors: results.errors });
    } catch (error) {
        console.error('Error importing:', error);
        res.status(500).json({ error: 'Import failed: ' + error.message });
    }
});

// PATCH /api/employees/:id - Update
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const updates = req.body;
        const { data: old } = await supabaseAdmin.from('employees').select('*').eq('id', id).single();
        if (!old) return res.status(404).json({ error: 'Not found' });
        const payload = { ...updates, updated_at: new Date().toISOString() };
        ['id','created_at','history','exitRecord','accounts','onboardingUser','_historyNote'].forEach(k => delete payload[k]);
        if (updates.join_date || updates.probation_months) {
            const jd = new Date(updates.join_date || old.join_date);
            const pm = parseInt(updates.probation_months || old.probation_months) || 3;
            const pe = new Date(jd); pe.setMonth(pe.getMonth() + pm);
            payload.probation_end_date = pe.toISOString().split('T')[0];
        }
        const { data: updated, error } = await supabaseAdmin.from('employees').update(payload).eq('id', id).select().single();
        if (error) throw error;
        // Log tracked changes
        const changes = {}, oldChanges = {};
        ['status','position','division','position_level','employment_type'].forEach(f => {
            if (updates[f] && updates[f] !== old[f]) { oldChanges[f] = old[f]; changes[f] = updates[f]; }
        });
        if (Object.keys(changes).length > 0) {
            let evt = 'data_updated';
            if (changes.status) evt = 'status_change';
            if (changes.position || changes.position_level) evt = 'promoted';
            if (changes.division) evt = 'division_transfer';
            await supabaseAdmin.from('employee_history').insert([{ employee_id: id, event_type: evt, old_value: oldChanges, new_value: changes, notes: updates._historyNote || null, created_by: 'admin' }]);
        }
        res.json({ success: true, employee: updated });
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: 'Update failed: ' + error.message });
    }
});

// POST /api/employees/:id/exit - Exit record
router.post('/:id/exit', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const d = req.body;
        const newStatus = d.exit_type === 'Terminated' ? 'Terminated' : 'Resigned';
        await supabaseAdmin.from('employees').update({ status: newStatus, end_date: d.exit_date, updated_at: new Date().toISOString() }).eq('id', id);
        const exitPayload = { employee_id: id, exit_date: d.exit_date, exit_type: d.exit_type, reason: d.reason, last_working_day: d.last_working_day, feedback_work_environment: d.feedback_work_environment, feedback_management: d.feedback_management, feedback_career_growth: d.feedback_career_growth, feedback_compensation: d.feedback_compensation, feedback_overall: d.feedback_overall, suggestions: d.suggestions, would_rejoin: d.would_rejoin, exit_interview_notes: d.exit_interview_notes, clearance: d.clearance || {}, filled_by: d.filled_by || 'hr' };
        const { data: existing } = await supabaseAdmin.from('exit_records').select('id').eq('employee_id', id).single();
        let exitRecord;
        if (existing) {
            const { data } = await supabaseAdmin.from('exit_records').update(exitPayload).eq('id', existing.id).select().single();
            exitRecord = data;
        } else {
            const { data } = await supabaseAdmin.from('exit_records').insert([exitPayload]).select().single();
            exitRecord = data;
        }
        await supabaseAdmin.from('employee_history').insert([{ employee_id: id, event_type: newStatus === 'Terminated' ? 'terminated' : 'resigned', new_value: { status: newStatus, exit_type: d.exit_type }, notes: d.reason, created_by: d.filled_by || 'admin' }]);
        await supabaseAdmin.from('onboarding_users').update({ is_active: false }).eq('employee_id', id);
        res.json({ success: true, exitRecord });
    } catch (error) {
        console.error('Error creating exit:', error);
        res.status(500).json({ error: 'Failed: ' + error.message });
    }
});

// Account management
router.post('/:id/accounts', authenticateToken, async (req, res) => {
    try {
        const { account_type, username, password, url, notes } = req.body;
        const { data, error } = await supabaseAdmin.from('onboarding_accounts').insert([{ employee_id: parseInt(req.params.id), account_type, username, password, url, notes }]).select().single();
        if (error) throw error;
        res.json({ success: true, account: data });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/accounts/:aid', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin.from('onboarding_accounts').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', parseInt(req.params.aid)).select().single();
        if (error) throw error;
        res.json({ success: true, account: data });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id/accounts/:aid', authenticateToken, async (req, res) => {
    try {
        await supabaseAdmin.from('onboarding_accounts').delete().eq('id', parseInt(req.params.aid));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/employees/:id
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await supabaseAdmin.from('onboarding_accounts').delete().eq('employee_id', id);
        await supabaseAdmin.from('onboarding_users').delete().eq('employee_id', id);
        await supabaseAdmin.from('exit_records').delete().eq('employee_id', id);
        await supabaseAdmin.from('employee_history').delete().eq('employee_id', id);
        await supabaseAdmin.from('employees').delete().eq('id', id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
