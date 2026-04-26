import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const TABS = ['Profil', 'History', 'Onboarding', 'Exit'];
const EVENT_LABELS = { joined: '🎉 Bergabung', status_change: '🔄 Perubahan Status', promoted: '📈 Promosi', division_transfer: '🔀 Pindah Divisi', data_updated: '✏️ Data Diupdate', resigned: '👋 Resign', terminated: '❌ Terminated', imported: '📥 Import' };

export default function EmployeeDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem('adminToken');
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Profil');
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [divisions, setDivisions] = useState([]);

    const fetchEmployee = async () => {
        try {
            const [empRes, settRes] = await Promise.all([
                fetch(`/api/employees/${id}`, { headers }),
                fetch('/api/settings')
            ]);
            if (empRes.status === 401) { navigate('/admin/login'); return; }
            const data = await empRes.json();
            const settings = await settRes.json();
            setEmployee(data);
            setForm(data);
            setDivisions(settings.divisions || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchEmployee(); }, [id]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/employees/${id}`, { method: 'PATCH', headers, body: JSON.stringify(form) });
            const data = await res.json();
            if (data.success) { setEmployee(data.employee); setEditing(false); fetchEmployee(); }
            else alert('Gagal: ' + data.error);
        } catch (err) { alert('Error: ' + err.message); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="p-12 text-center text-slate-400">Loading...</div>;
    if (!employee) return <div className="p-12 text-center text-red-400">Karyawan tidak ditemukan</div>;

    return (
        <div className="min-h-screen relative p-4 md:p-8">
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[100px]"></div>
            </div>
            <div className="relative z-10 max-w-5xl mx-auto">
                <button onClick={() => navigate('/admin/employees')} className="text-slate-400 hover:text-white text-sm mb-4 flex items-center gap-1 transition">&larr; Kembali</button>

                {/* Header */}
                <div className="glass-dark rounded-2xl p-6 border border-white/10 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                            {employee.full_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-white">{employee.full_name}</h1>
                            <p className="text-slate-400">{employee.position || '-'} • {employee.division || 'Unassigned'}</p>
                            <div className="flex gap-2 mt-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${employee.status === 'Permanent' ? 'bg-emerald-500/20 text-emerald-300' : employee.status === 'Probation' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>{employee.status}</span>
                                {employee.employee_id && <span className="px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">{employee.employee_id}</span>}
                            </div>
                        </div>
                        <button onClick={() => setEditing(!editing)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm transition">
                            {editing ? 'Batal' : 'Edit'}
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-slate-800/50 rounded-xl p-1 border border-white/5">
                    {TABS.map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'Profil' && <ProfileTab employee={employee} form={form} setForm={setForm} editing={editing} saving={saving} handleSave={handleSave} divisions={divisions} />}
                {activeTab === 'History' && <HistoryTab history={employee.history || []} />}
                {activeTab === 'Onboarding' && <OnboardingTab employee={employee} token={token} onRefresh={fetchEmployee} />}
                {activeTab === 'Exit' && <ExitTab employee={employee} token={token} onRefresh={fetchEmployee} />}
            </div>
        </div>
    );
}

function ProfileTab({ employee, form, setForm, editing, saving, handleSave, divisions }) {
    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
    const Field = ({ label, name, type = 'text' }) => (
        <div>
            <label className="block text-xs text-slate-500 mb-1">{label}</label>
            {editing ? (
                name === 'division' ? <select name={name} value={form[name] || ''} onChange={handleChange} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"><option value="">-</option>{divisions.map(d => <option key={d} value={d}>{d}</option>)}</select>
                : <input type={type} name={name} value={form[name] || ''} onChange={handleChange} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
            ) : (
                <p className="text-white text-sm">{type === 'date' && employee[name] ? new Date(employee[name]).toLocaleDateString('id-ID') : (employee[name] || '-')}</p>
            )}
        </div>
    );

    return (
        <div className="glass-dark rounded-2xl p-6 border border-white/10 space-y-6">
            <h2 className="text-lg font-semibold text-cyan-400">Data Pribadi</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Nama Lengkap" name="full_name" />
                <Field label="Email" name="email" />
                <Field label="No. HP" name="phone" />
                <Field label="NIK" name="nik" />
                <Field label="Tanggal Lahir" name="dob" type="date" />
                <Field label="Agama" name="religion" />
                <Field label="Gol. Darah" name="blood_type" />
            </div>
            <h2 className="text-lg font-semibold text-cyan-400 pt-4">Data Kepegawaian</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="ID Karyawan" name="employee_id" />
                <Field label="Divisi" name="division" />
                <Field label="Posisi" name="position" />
                <Field label="Level" name="position_level" />
                <Field label="Tanggal Masuk" name="join_date" type="date" />
                <Field label="Tipe" name="employment_type" />
                <div>
                    <label className="block text-xs text-slate-500 mb-1">Status</label>
                    {editing ? <select name="status" value={form.status || ''} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"><option>Probation</option><option>Permanent</option><option>Contract</option><option>Resigned</option><option>Terminated</option></select>
                    : <p className="text-white text-sm">{employee.status}</p>}
                </div>
                <div>
                    <label className="block text-xs text-slate-500 mb-1">Masa Probation</label>
                    {editing ? <select name="probation_months" value={form.probation_months || 3} onChange={e => setForm({...form, probation_months: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"><option value={3}>3 Bulan</option><option value={6}>6 Bulan</option></select>
                    : <p className="text-white text-sm">{employee.probation_months || 3} Bulan (s/d {employee.probation_end_date ? new Date(employee.probation_end_date).toLocaleDateString('id-ID') : '-'})</p>}
                </div>
            </div>
            {employee.disc_profile && (
                <>
                    <h2 className="text-lg font-semibold text-cyan-400 pt-4">Hasil Screening</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs text-slate-500 mb-1">DISC Profile</label><p className="text-white text-sm font-mono">{employee.disc_profile}</p></div>
                        <div><label className="block text-xs text-slate-500 mb-1">Match Score</label><p className="text-white text-sm">{employee.match_score || '-'}%</p></div>
                    </div>
                </>
            )}
            {editing && (
                <div className="pt-4 flex justify-end">
                    <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-medium transition disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
                </div>
            )}
        </div>
    );
}

function HistoryTab({ history }) {
    if (history.length === 0) return <div className="glass-dark rounded-2xl p-8 border border-white/10 text-center text-slate-400">Belum ada riwayat</div>;
    return (
        <div className="glass-dark rounded-2xl p-6 border border-white/10">
            <div className="space-y-4">
                {history.map((h, i) => (
                    <div key={h.id || i} className="flex gap-4 items-start">
                        <div className="w-3 h-3 rounded-full bg-cyan-500 mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1 border-b border-white/5 pb-4">
                            <p className="text-white font-medium text-sm">{EVENT_LABELS[h.event_type] || h.event_type}</p>
                            {h.notes && <p className="text-slate-400 text-xs mt-1">{h.notes}</p>}
                            {h.old_value && <p className="text-xs text-red-400 mt-1">Before: {JSON.stringify(h.old_value)}</p>}
                            {h.new_value && <p className="text-xs text-emerald-400">After: {JSON.stringify(h.new_value)}</p>}
                            <p className="text-xs text-slate-600 mt-1">{new Date(h.event_date || h.created_at).toLocaleString('id-ID')} — {h.created_by || 'system'}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function OnboardingTab({ employee, token, onRefresh }) {
    const [form, setForm] = useState({ account_type: '', username: '', password: '', url: '', notes: '' });
    const [adding, setAdding] = useState(false);
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const handleAdd = async () => {
        if (!form.account_type) return;
        setAdding(true);
        await fetch(`/api/employees/${employee.id}/accounts`, { method: 'POST', headers, body: JSON.stringify(form) });
        setForm({ account_type: '', username: '', password: '', url: '', notes: '' });
        setAdding(false);
        onRefresh();
    };

    const handleDelete = async (aid) => {
        if (!window.confirm('Hapus akun ini?')) return;
        await fetch(`/api/employees/${employee.id}/accounts/${aid}`, { method: 'DELETE', headers });
        onRefresh();
    };

    return (
        <div className="glass-dark rounded-2xl p-6 border border-white/10 space-y-6">
            {employee.onboardingUser && (
                <div className="bg-slate-900 rounded-xl p-4 border border-cyan-500/20">
                    <p className="text-cyan-400 font-semibold text-sm mb-2">🔑 Portal Onboarding</p>
                    <p className="text-slate-300 text-sm">Username: <span className="font-mono text-white">{employee.onboardingUser.username}</span></p>
                    <p className="text-slate-300 text-sm">Status: <span className={employee.onboardingUser.is_active ? 'text-emerald-400' : 'text-red-400'}>{employee.onboardingUser.is_active ? 'Aktif' : 'Nonaktif'}</span></p>
                    {employee.onboardingUser.last_login && <p className="text-xs text-slate-500 mt-1">Last login: {new Date(employee.onboardingUser.last_login).toLocaleString('id-ID')}</p>}
                </div>
            )}
            <h3 className="text-lg font-semibold text-cyan-400">Daftar Akun</h3>
            {(employee.accounts || []).length === 0 ? <p className="text-slate-500 text-sm italic">Belum ada akun yang ditambahkan</p> : (
                <div className="space-y-3">
                    {employee.accounts.map(a => (
                        <div key={a.id} className="flex items-center gap-4 bg-slate-900 rounded-xl p-4 border border-white/5">
                            <div className="flex-1">
                                <p className="text-white font-medium text-sm">{a.account_type}</p>
                                <p className="text-slate-400 text-xs">User: {a.username || '-'} | Pass: {a.password || '-'}</p>
                                {a.url && <p className="text-cyan-400 text-xs truncate">{a.url}</p>}
                            </div>
                            <button onClick={() => handleDelete(a.id)} className="text-slate-500 hover:text-red-400 transition">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <div className="border-t border-white/10 pt-4">
                <p className="text-sm text-slate-400 mb-3">Tambah Akun Baru</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input placeholder="Tipe (e.g. Email, Slack)" value={form.account_type} onChange={e => setForm({...form, account_type: e.target.value})} className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                    <input placeholder="Username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                    <input placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                    <input placeholder="URL" value={form.url} onChange={e => setForm({...form, url: e.target.value})} className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <button onClick={handleAdd} disabled={adding || !form.account_type} className="mt-3 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-medium transition disabled:opacity-50">{adding ? 'Menambahkan...' : 'Tambah Akun'}</button>
            </div>
        </div>
    );
}

function ExitTab({ employee, token, onRefresh }) {
    const [form, setForm] = useState(employee.exitRecord || { exit_date: new Date().toISOString().split('T')[0], exit_type: 'Resign', reason: '', last_working_day: '', feedback_work_environment: 3, feedback_management: 3, feedback_career_growth: 3, feedback_compensation: 3, feedback_overall: 3, suggestions: '', would_rejoin: null, exit_interview_notes: '', clearance: {} });
    const [saving, setSaving] = useState(false);
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/employees/${employee.id}/exit`, { method: 'POST', headers, body: JSON.stringify({ ...form, filled_by: 'hr' }) });
            const data = await res.json();
            if (data.success) { alert('Exit record berhasil disimpan'); onRefresh(); }
            else alert('Gagal: ' + data.error);
        } catch (err) { alert('Error: ' + err.message); }
        finally { setSaving(false); }
    };

    const RatingField = ({ label, name }) => (
        <div>
            <label className="block text-xs text-slate-400 mb-1">{label}</label>
            <div className="flex gap-1">{[1,2,3,4,5].map(v => (
                <button key={v} type="button" onClick={() => setForm({...form, [name]: v})} className={`w-8 h-8 rounded-lg text-sm font-bold transition ${form[name] >= v ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>{v}</button>
            ))}</div>
        </div>
    );

    return (
        <div className="glass-dark rounded-2xl p-6 border border-white/10 space-y-6">
            <h2 className="text-lg font-semibold text-red-400">Exit Form</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-xs text-slate-400 mb-1">Tanggal Keluar</label><input type="date" value={form.exit_date || ''} onChange={e => setForm({...form, exit_date: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Tipe</label><select value={form.exit_type || 'Resign'} onChange={e => setForm({...form, exit_type: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"><option>Resign</option><option>Terminated</option><option>Contract End</option><option>Retired</option></select></div>
                <div className="md:col-span-2"><label className="block text-xs text-slate-400 mb-1">Alasan</label><textarea value={form.reason || ''} onChange={e => setForm({...form, reason: e.target.value})} rows="2" className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Hari Kerja Terakhir</label><input type="date" value={form.last_working_day || ''} onChange={e => setForm({...form, last_working_day: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></div>
            </div>
            <h3 className="text-sm font-semibold text-slate-300 pt-2">Feedback (1-5)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <RatingField label="Lingkungan Kerja" name="feedback_work_environment" />
                <RatingField label="Manajemen" name="feedback_management" />
                <RatingField label="Jenjang Karir" name="feedback_career_growth" />
                <RatingField label="Kompensasi" name="feedback_compensation" />
                <RatingField label="Overall" name="feedback_overall" />
                <div><label className="block text-xs text-slate-400 mb-1">Mau Kembali?</label>
                    <div className="flex gap-2">{[{ v: true, l: 'Ya' }, { v: false, l: 'Tidak' }].map(o => (
                        <button key={String(o.v)} type="button" onClick={() => setForm({...form, would_rejoin: o.v})} className={`px-4 py-2 rounded-lg text-sm transition ${form.would_rejoin === o.v ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{o.l}</button>
                    ))}</div>
                </div>
            </div>
            <div><label className="block text-xs text-slate-400 mb-1">Saran</label><textarea value={form.suggestions || ''} onChange={e => setForm({...form, suggestions: e.target.value})} rows="2" className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Catatan Exit Interview (HR)</label><textarea value={form.exit_interview_notes || ''} onChange={e => setForm({...form, exit_interview_notes: e.target.value})} rows="2" className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></div>
            <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan Exit Record'}</button>
        </div>
    );
}
