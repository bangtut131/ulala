const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middleware/authMiddleware');
const { supabaseAdmin } = require('../services/supabaseClient');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ═══════════════ COURSES ═══════════════

router.get('/courses', authenticateToken, async (req, res) => {
    try {
        const { division } = req.query;
        let q = supabaseAdmin.from('learning_courses').select('*, learning_modules(id)').order('sort_order');
        if (division && division !== 'all') q = q.eq('division', division);
        const { data, error } = await q;
        if (error) throw error;
        res.json((data || []).map(c => ({ ...c, moduleCount: c.learning_modules?.length || 0, learning_modules: undefined })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/courses', authenticateToken, async (req, res) => {
    try {
        const { title, description, division, is_active } = req.body;
        const { data, error } = await supabaseAdmin.from('learning_courses').insert([{ title, description, division: division || null, is_active: is_active !== false }]).select().single();
        if (error) throw error;
        res.json({ success: true, course: data });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/courses/:id', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin.from('learning_courses').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', parseInt(req.params.id)).select().single();
        if (error) throw error;
        res.json({ success: true, course: data });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/courses/:id', authenticateToken, async (req, res) => {
    try {
        await supabaseAdmin.from('learning_courses').delete().eq('id', parseInt(req.params.id));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════ MODULES ═══════════════

router.get('/courses/:courseId/modules', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin.from('learning_modules').select('*, learning_questions(id)').eq('course_id', parseInt(req.params.courseId)).order('sort_order');
        if (error) throw error;
        res.json((data || []).map(m => ({ ...m, questionCount: m.learning_questions?.length || 0, learning_questions: undefined })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/modules', authenticateToken, async (req, res) => {
    try {
        const { course_id, title, content, attachments, duration_days, passing_score, sort_order } = req.body;
        const { data, error } = await supabaseAdmin.from('learning_modules').insert([{ course_id, title, content, attachments: attachments || [], duration_days: duration_days || 7, passing_score: passing_score || 70, sort_order: sort_order || 0 }]).select().single();
        if (error) throw error;
        res.json({ success: true, module: data });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/modules/:id', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin.from('learning_modules').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', parseInt(req.params.id)).select().single();
        if (error) throw error;
        res.json({ success: true, module: data });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/modules/:id', authenticateToken, async (req, res) => {
    try {
        await supabaseAdmin.from('learning_modules').delete().eq('id', parseInt(req.params.id));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Upload file attachment for module
router.post('/modules/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file' });
        const fileName = `learning/${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
        const { error } = await supabaseAdmin.storage.from('vacancy-images').upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
        if (error) throw error;
        const { data: urlData } = supabaseAdmin.storage.from('vacancy-images').getPublicUrl(fileName);
        res.json({ success: true, url: urlData.publicUrl, name: req.file.originalname, type: req.file.mimetype, size: req.file.size });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════ QUESTIONS ═══════════════

router.get('/modules/:moduleId/questions', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin.from('learning_questions').select('*').eq('module_id', parseInt(req.params.moduleId)).order('sort_order');
        if (error) throw error;
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/questions', authenticateToken, async (req, res) => {
    try {
        const { module_id, question, option_a, option_b, option_c, option_d, correct_answer, sort_order } = req.body;
        const { data, error } = await supabaseAdmin.from('learning_questions').insert([{ module_id, question, option_a, option_b, option_c, option_d, correct_answer, sort_order: sort_order || 0 }]).select().single();
        if (error) throw error;
        res.json({ success: true, question: data });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/questions/:id', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin.from('learning_questions').update(req.body).eq('id', parseInt(req.params.id)).select().single();
        if (error) throw error;
        res.json({ success: true, question: data });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/questions/:id', authenticateToken, async (req, res) => {
    try {
        await supabaseAdmin.from('learning_questions').delete().eq('id', parseInt(req.params.id));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════ RESULTS (Admin view) ═══════════════

router.get('/results', authenticateToken, async (req, res) => {
    try {
        const { employee_id, module_id } = req.query;
        let q = supabaseAdmin.from('learning_results').select('*, employees(full_name, division), learning_modules(title)').order('completed_at', { ascending: false });
        if (employee_id) q = q.eq('employee_id', parseInt(employee_id));
        if (module_id) q = q.eq('module_id', parseInt(module_id));
        const { data, error } = await q;
        if (error) throw error;
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Approve retake
router.post('/results/:id/approve-retake', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin.from('learning_results').update({ retake_approved: true, retake_approved_by: 'admin' }).eq('id', parseInt(req.params.id)).select().single();
        if (error) throw error;
        res.json({ success: true, result: data });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
