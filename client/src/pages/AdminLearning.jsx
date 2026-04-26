import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminLearning() {
    const navigate = useNavigate();
    const token = localStorage.getItem('adminToken');
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    const [tab, setTab] = useState('courses');
    const [courses, setCourses] = useState([]);
    const [divisions, setDivisions] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [modules, setModules] = useState([]);
    const [selectedModule, setSelectedModule] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchCourses = useCallback(async () => {
        setLoading(true);
        const [cRes, sRes] = await Promise.all([fetch('/api/learning/courses', { headers }), fetch('/api/settings')]);
        if (cRes.status === 401) { navigate('/admin/login'); return; }
        setCourses(await cRes.json());
        const s = await sRes.json();
        setDivisions(s.divisions || []);
        setLoading(false);
    }, [token]);

    useEffect(() => { fetchCourses(); }, [fetchCourses]);

    const fetchModules = async (courseId) => {
        const res = await fetch(`/api/learning/courses/${courseId}/modules`, { headers });
        setModules(await res.json());
    };

    const fetchQuestions = async (moduleId) => {
        const res = await fetch(`/api/learning/modules/${moduleId}/questions`, { headers });
        setQuestions(await res.json());
    };

    const fetchResults = async () => {
        const res = await fetch('/api/learning/results', { headers });
        setResults(await res.json());
    };

    useEffect(() => { if (tab === 'results') fetchResults(); }, [tab]);

    return (
        <div className="min-h-screen relative p-4 md:p-8">
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-cyan-600/5 rounded-full blur-[100px]"></div>
            </div>
            <div className="relative z-10 max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <button onClick={() => navigate('/admin')} className="text-slate-400 hover:text-white text-sm mb-2 flex items-center gap-1">&larr; Dashboard</button>
                        <h1 className="text-2xl md:text-3xl font-bold font-display text-white">📚 E-Learning Management</h1>
                        <p className="text-slate-400 text-sm mt-1">Kelola materi dan post-test onboarding</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-slate-800/50 rounded-xl p-1 border border-white/5">
                    {['courses', 'results'].map(t => (
                        <button key={t} onClick={() => setTab(t)} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${tab === t ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                            {t === 'courses' ? '📖 Courses & Materi' : '📊 Hasil Test'}
                        </button>
                    ))}
                </div>

                {tab === 'courses' && <CoursesTab courses={courses} divisions={divisions} headers={headers} onRefresh={fetchCourses} selectedCourse={selectedCourse} setSelectedCourse={(c) => { setSelectedCourse(c); if (c) fetchModules(c.id); }} modules={modules} fetchModules={fetchModules} selectedModule={selectedModule} setSelectedModule={(m) => { setSelectedModule(m); if (m) fetchQuestions(m.id); }} questions={questions} fetchQuestions={fetchQuestions} loading={loading} />}
                {tab === 'results' && <ResultsTab results={results} headers={headers} onRefresh={fetchResults} />}
            </div>
        </div>
    );
}

function CoursesTab({ courses, divisions, headers, onRefresh, selectedCourse, setSelectedCourse, modules, fetchModules, selectedModule, setSelectedModule, questions, fetchQuestions, loading }) {
    const [showAddCourse, setShowAddCourse] = useState(false);
    const [courseForm, setCourseForm] = useState({ title: '', description: '', division: '' });
    const [showAddModule, setShowAddModule] = useState(false);
    const [moduleForm, setModuleForm] = useState({ title: '', content: '', attachments: [], duration_days: 7, passing_score: 70 });
    const [showAddQuestion, setShowAddQuestion] = useState(false);
    const [qForm, setQForm] = useState({ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'a' });
    const [uploading, setUploading] = useState(false);

    const saveCourse = async () => {
        await fetch('/api/learning/courses', { method: 'POST', headers, body: JSON.stringify(courseForm) });
        setCourseForm({ title: '', description: '', division: '' }); setShowAddCourse(false); onRefresh();
    };
    const deleteCourse = async (id) => {
        if (!confirm('Hapus course beserta semua materi dan soal?')) return;
        await fetch(`/api/learning/courses/${id}`, { method: 'DELETE', headers }); setSelectedCourse(null); onRefresh();
    };
    const saveModule = async () => {
        await fetch('/api/learning/modules', { method: 'POST', headers, body: JSON.stringify({ ...moduleForm, course_id: selectedCourse.id }) });
        setModuleForm({ title: '', content: '', attachments: [], duration_days: 7, passing_score: 70 }); setShowAddModule(false); fetchModules(selectedCourse.id);
    };
    const deleteModule = async (id) => {
        if (!confirm('Hapus module ini?')) return;
        await fetch(`/api/learning/modules/${id}`, { method: 'DELETE', headers }); setSelectedModule(null); fetchModules(selectedCourse.id);
    };
    const handleFileUpload = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        setUploading(true);
        const fd = new FormData(); fd.append('file', file);
        const res = await fetch('/api/learning/modules/upload', { method: 'POST', headers: { 'Authorization': headers.Authorization }, body: fd });
        const data = await res.json();
        if (data.url) setModuleForm(prev => ({ ...prev, attachments: [...prev.attachments, { name: data.name, url: data.url, type: data.type, size: data.size }] }));
        setUploading(false);
    };
    const removeAttachment = (idx) => setModuleForm(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }));
    const saveQuestion = async () => {
        await fetch('/api/learning/questions', { method: 'POST', headers, body: JSON.stringify({ ...qForm, module_id: selectedModule.id }) });
        setQForm({ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'a' }); setShowAddQuestion(false); fetchQuestions(selectedModule.id);
    };
    const deleteQuestion = async (id) => {
        if (!confirm('Hapus soal?')) return;
        await fetch(`/api/learning/questions/${id}`, { method: 'DELETE', headers }); fetchQuestions(selectedModule.id);
    };

    // Breadcrumb view
    if (selectedModule) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <button onClick={() => { setSelectedModule(null); setSelectedCourse(selectedCourse); }} className="hover:text-white transition">{selectedCourse?.title}</button>
                    <span>/</span><span className="text-white">{selectedModule.title}</span>
                </div>
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white">Soal Post-Test</h2>
                    <button onClick={() => setShowAddQuestion(true)} className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-sm font-medium">+ Tambah Soal</button>
                </div>
                <p className="text-slate-400 text-sm">Passing Score: <span className="text-violet-400 font-bold">{selectedModule.passing_score}%</span> | Durasi Akses: <span className="text-cyan-400">{selectedModule.duration_days} hari</span></p>
                {questions.length === 0 ? <p className="text-slate-500 italic text-sm">Belum ada soal</p> : questions.map((q, i) => (
                    <div key={q.id} className="glass-dark rounded-xl p-4 border border-white/10 space-y-2">
                        <div className="flex justify-between"><p className="text-white font-medium text-sm">{i+1}. {q.question}</p><button onClick={() => deleteQuestion(q.id)} className="text-slate-500 hover:text-red-400 text-xs">Hapus</button></div>
                        <div className="grid grid-cols-2 gap-2">{['a','b','c','d'].filter(k => q[`option_${k}`]).map(k => (
                            <div key={k} className={`px-3 py-1.5 rounded-lg text-xs ${q.correct_answer === k ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-white/5'}`}>
                                <span className="font-bold uppercase mr-1">{k}.</span> {q[`option_${k}`]}
                            </div>
                        ))}</div>
                    </div>
                ))}
                {showAddQuestion && (
                    <div className="glass-dark rounded-xl p-4 border border-violet-500/20 space-y-3">
                        <input placeholder="Pertanyaan" value={qForm.question} onChange={e => setQForm({...qForm, question: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                        <div className="grid grid-cols-2 gap-2">
                            {['a','b','c','d'].map(k => <input key={k} placeholder={`Opsi ${k.toUpperCase()}`} value={qForm[`option_${k}`]} onChange={e => setQForm({...qForm, [`option_${k}`]: e.target.value})} className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />)}
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="text-xs text-slate-400">Jawaban Benar:</label>
                            <select value={qForm.correct_answer} onChange={e => setQForm({...qForm, correct_answer: e.target.value})} className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm">
                                {['a','b','c','d'].map(k => <option key={k} value={k}>{k.toUpperCase()}</option>)}
                            </select>
                            <button onClick={saveQuestion} className="px-4 py-1.5 bg-violet-600 text-white rounded-lg text-sm ml-auto">Simpan</button>
                            <button onClick={() => setShowAddQuestion(false)} className="px-4 py-1.5 bg-slate-700 text-white rounded-lg text-sm">Batal</button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (selectedCourse) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <button onClick={() => setSelectedCourse(null)} className="hover:text-white transition">Semua Course</button>
                    <span>/</span><span className="text-white">{selectedCourse.title}</span>
                </div>
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white">Modules / Materi</h2>
                    <button onClick={() => setShowAddModule(true)} className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-sm font-medium">+ Tambah Materi</button>
                </div>
                {modules.length === 0 ? <p className="text-slate-500 italic text-sm">Belum ada materi</p> : modules.map(m => (
                    <div key={m.id} className="glass-dark rounded-xl p-4 border border-white/10 flex items-center gap-4 hover:border-violet-500/30 transition cursor-pointer" onClick={() => setSelectedModule(m)}>
                        <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold">{m.sort_order + 1}</div>
                        <div className="flex-1">
                            <p className="text-white font-medium text-sm">{m.title}</p>
                            <p className="text-slate-500 text-xs">{m.questionCount || 0} soal | Pass: {m.passing_score}% | Akses: {m.duration_days} hari</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteModule(m.id); }} className="text-slate-500 hover:text-red-400 text-xs">Hapus</button>
                    </div>
                ))}
                {showAddModule && (
                    <div className="glass-dark rounded-xl p-6 border border-violet-500/20 space-y-4">
                        <h3 className="text-white font-bold">Tambah Materi Baru</h3>
                        <input placeholder="Judul Materi" value={moduleForm.title} onChange={e => setModuleForm({...moduleForm, title: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                        <textarea placeholder="Konten materi (teks/instruksi)" value={moduleForm.content} onChange={e => setModuleForm({...moduleForm, content: e.target.value})} rows="4" className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                        {/* Attachments */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-2">File & Link (PDF, Video GDrive, dll)</label>
                            {moduleForm.attachments.map((a, i) => (
                                <div key={i} className="flex items-center gap-2 bg-slate-900 rounded-lg p-2 mb-2 border border-white/5">
                                    <span className="text-white text-xs flex-1 truncate">{a.name || a.url}</span>
                                    <button onClick={() => removeAttachment(i)} className="text-red-400 text-xs">✕</button>
                                </div>
                            ))}
                            <div className="flex gap-2">
                                <label className="px-3 py-1.5 bg-slate-700 text-white rounded-lg text-xs cursor-pointer hover:bg-slate-600 transition">
                                    {uploading ? 'Uploading...' : '📎 Upload File'}
                                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                                </label>
                                <button onClick={() => {
                                    const url = prompt('Masukkan URL (Video GDrive, YouTube, dll):');
                                    if (url) setModuleForm(prev => ({ ...prev, attachments: [...prev.attachments, { name: url.substring(0, 50), url, type: 'link' }] }));
                                }} className="px-3 py-1.5 bg-slate-700 text-white rounded-lg text-xs hover:bg-slate-600">🔗 Tambah Link</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-xs text-slate-400 mb-1">Durasi Akses (hari)</label><input type="number" value={moduleForm.duration_days} onChange={e => setModuleForm({...moduleForm, duration_days: parseInt(e.target.value) || 7})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></div>
                            <div><label className="block text-xs text-slate-400 mb-1">Passing Score (%)</label><input type="number" value={moduleForm.passing_score} onChange={e => setModuleForm({...moduleForm, passing_score: parseInt(e.target.value) || 70})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={saveModule} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium">Simpan</button>
                            <button onClick={() => setShowAddModule(false)} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm">Batal</button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Courses List
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">Daftar Course</h2>
                <button onClick={() => setShowAddCourse(true)} className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-sm font-medium">+ Tambah Course</button>
            </div>
            {loading ? <p className="text-slate-400">Loading...</p> : courses.length === 0 ? <p className="text-slate-500 italic text-sm">Belum ada course</p> : courses.map(c => (
                <div key={c.id} className="glass-dark rounded-xl p-4 border border-white/10 flex items-center gap-4 hover:border-violet-500/30 transition cursor-pointer" onClick={() => { setSelectedCourse(c); fetchModules(c.id); }}>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-lg">📖</div>
                    <div className="flex-1">
                        <p className="text-white font-medium">{c.title}</p>
                        <p className="text-slate-400 text-xs">{c.division || 'Semua Divisi'} • {c.moduleCount} module</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs ${c.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-600/20 text-slate-400'}`}>{c.is_active ? 'Aktif' : 'Nonaktif'}</span>
                    <button onClick={(e) => { e.stopPropagation(); deleteCourse(c.id); }} className="text-slate-500 hover:text-red-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
            ))}
            {showAddCourse && (
                <div className="glass-dark rounded-xl p-4 border border-violet-500/20 space-y-3">
                    <input placeholder="Judul Course" value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                    <textarea placeholder="Deskripsi (opsional)" value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} rows="2" className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                    <select value={courseForm.division} onChange={e => setCourseForm({...courseForm, division: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
                        <option value="">Semua Divisi</option>
                        {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <div className="flex gap-2">
                        <button onClick={saveCourse} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium">Simpan</button>
                        <button onClick={() => setShowAddCourse(false)} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm">Batal</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function ResultsTab({ results, headers, onRefresh }) {
    const approveRetake = async (id) => {
        if (!confirm('Izinkan karyawan ini mengulang test?')) return;
        await fetch(`/api/learning/results/${id}/approve-retake`, { method: 'POST', headers });
        onRefresh();
    };
    return (
        <div className="glass-dark rounded-2xl border border-white/10 overflow-hidden">
            {results.length === 0 ? <div className="p-8 text-center text-slate-400">Belum ada hasil test</div> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-white/10 text-slate-400 text-xs uppercase">
                            <th className="px-4 py-3 text-left">Karyawan</th><th className="px-4 py-3 text-left">Module</th><th className="px-4 py-3 text-center">Score</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3 text-center">Attempt</th><th className="px-4 py-3 text-center">Aksi</th>
                        </tr></thead>
                        <tbody>{results.map(r => (
                            <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                                <td className="px-4 py-3 text-white">{r.employees?.full_name || '-'}<br/><span className="text-xs text-slate-500">{r.employees?.division}</span></td>
                                <td className="px-4 py-3 text-slate-300">{r.learning_modules?.title || '-'}</td>
                                <td className="px-4 py-3 text-center font-bold text-white">{r.score}%</td>
                                <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded text-xs font-medium ${r.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>{r.passed ? 'LULUS' : 'GAGAL'}</span></td>
                                <td className="px-4 py-3 text-center text-slate-400">#{r.attempt_number}</td>
                                <td className="px-4 py-3 text-center">
                                    {!r.passed && !r.retake_approved && <button onClick={() => approveRetake(r.id)} className="px-2 py-1 bg-amber-500/20 text-amber-300 rounded text-xs hover:bg-amber-500/30 transition">Izinkan Retake</button>}
                                    {r.retake_approved && <span className="text-xs text-amber-400">Retake Approved</span>}
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
