import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const STATUS_OPTIONS = ['all', 'Probation', 'Permanent', 'Contract', 'Resigned', 'Terminated'];
const STATUS_COLORS = {
    Probation: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    Permanent: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    Contract: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    Resigned: 'bg-red-500/20 text-red-300 border-red-500/30',
    Terminated: 'bg-red-700/20 text-red-400 border-red-700/30',
    Retired: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
};

export default function AdminEmployees() {
    const navigate = useNavigate();
    const token = localStorage.getItem('adminToken');
    const [employees, setEmployees] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [divisionFilter, setDivisionFilter] = useState('all');
    const [divisions, setDivisions] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const fetchData = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (divisionFilter !== 'all') params.append('division', divisionFilter);

            const [empRes, statsRes, settingsRes] = await Promise.all([
                fetch(`/api/employees?${params}`, { headers }),
                fetch('/api/employees/stats', { headers }),
                fetch('/api/settings')
            ]);

            if (empRes.status === 401 || empRes.status === 403) { navigate('/admin/login'); return; }

            const empData = await empRes.json();
            const statsData = await statsRes.json();
            const settingsData = await settingsRes.json();

            setEmployees(empData.employees || []);
            setStats(statsData);
            setDivisions(settingsData.divisions || []);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, divisionFilter, token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Hapus data karyawan ${name}? Aksi ini tidak bisa dikembalikan.`)) return;
        await fetch(`/api/employees/${id}`, { method: 'DELETE', headers });
        fetchData();
    };

    return (
        <div className="min-h-screen relative p-4 md:p-8">
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-20 left-10 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <button onClick={() => navigate('/admin')} className="text-slate-400 hover:text-white text-sm mb-2 flex items-center gap-1 transition">
                            &larr; Dashboard
                        </button>
                        <h1 className="text-2xl md:text-3xl font-bold font-display text-white">Database Karyawan</h1>
                        <p className="text-slate-400 text-sm mt-1">Kelola seluruh data karyawan perusahaan</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowImportModal(true)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                            Import Excel
                        </button>
                        <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-lg shadow-cyan-500/20">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                            Tambah Karyawan
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
                        {[
                            { label: 'Total', value: stats.total, color: 'from-slate-600 to-slate-700' },
                            { label: 'Aktif', value: stats.active, color: 'from-emerald-600 to-green-700' },
                            { label: 'Probation', value: stats.probation, color: 'from-amber-600 to-yellow-700' },
                            { label: 'Permanent', value: stats.permanent, color: 'from-cyan-600 to-blue-700' },
                            { label: 'Kontrak', value: stats.contract, color: 'from-indigo-600 to-violet-700' },
                            { label: 'Resign', value: stats.resigned, color: 'from-red-600 to-rose-700' },
                            { label: 'Terminated', value: stats.terminated, color: 'from-red-800 to-red-900' }
                        ].map(s => (
                            <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-xl p-3 text-center border border-white/10`}>
                                <p className="text-2xl font-bold text-white">{s.value}</p>
                                <p className="text-xs text-white/70 mt-1">{s.label}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filters */}
                <div className="glass-dark rounded-xl p-4 mb-6 border border-white/10 flex flex-col md:flex-row gap-3">
                    <input type="text" placeholder="Cari nama, email, posisi..." value={search} onChange={e => setSearch(e.target.value)}
                        className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition" />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                        className="bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white text-sm">
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'all' ? 'Semua Status' : s}</option>)}
                    </select>
                    <select value={divisionFilter} onChange={e => setDivisionFilter(e.target.value)}
                        className="bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white text-sm">
                        <option value="all">Semua Divisi</option>
                        {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>

                {/* Table */}
                <div className="glass-dark rounded-2xl border border-white/10 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-slate-400">Loading...</div>
                    ) : employees.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-slate-400 text-lg">Belum ada data karyawan</p>
                            <p className="text-slate-500 text-sm mt-2">Tambah manual, import Excel, atau hire dari kandidat</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10 text-slate-400 text-xs uppercase">
                                        <th className="px-4 py-3 text-left">Karyawan</th>
                                        <th className="px-4 py-3 text-left hidden md:table-cell">Divisi</th>
                                        <th className="px-4 py-3 text-left hidden md:table-cell">Posisi</th>
                                        <th className="px-4 py-3 text-left hidden lg:table-cell">Join Date</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map(emp => (
                                        <tr key={emp.id} className="border-b border-white/5 hover:bg-white/5 transition cursor-pointer" onClick={() => navigate(`/admin/employees/${emp.id}`)}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                                        {emp.full_name?.charAt(0)?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-white">{emp.full_name}</p>
                                                        <p className="text-xs text-slate-500">{emp.employee_id || emp.email || '-'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-300 hidden md:table-cell">{emp.division || '-'}</td>
                                            <td className="px-4 py-3 text-slate-300 hidden md:table-cell">{emp.position || '-'}</td>
                                            <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">{emp.join_date ? new Date(emp.join_date).toLocaleDateString('id-ID') : '-'}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${STATUS_COLORS[emp.status] || 'bg-slate-500/20 text-slate-300'}`}>
                                                    {emp.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => handleDelete(emp.id, emp.full_name)} className="text-slate-500 hover:text-red-400 transition p-1" title="Hapus">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Employee Modal */}
            {showAddModal && <AddEmployeeModal divisions={divisions} onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); fetchData(); }} token={token} />}
            {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} onDone={() => { setShowImportModal(false); fetchData(); }} token={token} />}
        </div>
    );
}

function AddEmployeeModal({ divisions, onClose, onSaved, token }) {
    const [form, setForm] = useState({ full_name: '', email: '', phone: '', nik: '', division: '', position: '', join_date: new Date().toISOString().split('T')[0], employment_type: 'Full-time', probation_months: 3, status: 'Probation', notes: '' });
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState(null);
    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async e => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/employees', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            const data = await res.json();
            if (data.success) {
                setResult(data);
            } else {
                alert('Gagal: ' + (data.error || 'Unknown error'));
            }
        } catch (err) { alert('Error: ' + err.message); }
        finally { setSaving(false); }
    };

    if (result) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onSaved}>
                <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-white/10" onClick={e => e.stopPropagation()}>
                    <div className="text-center">
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Karyawan Berhasil Ditambahkan!</h3>
                        {result.credentials && (
                            <div className="bg-slate-900 rounded-xl p-4 mt-4 text-left border border-cyan-500/20">
                                <p className="text-cyan-400 font-semibold text-sm mb-2">🔑 Akun Onboarding Portal</p>
                                <p className="text-slate-300 text-sm">Username: <span className="font-mono text-white">{result.credentials.username}</span></p>
                                <p className="text-slate-300 text-sm">Password: <span className="font-mono text-white">{result.credentials.tempPassword}</span></p>
                                <p className="text-xs text-slate-500 mt-2">⚠️ Catat password ini, tidak bisa dilihat lagi.</p>
                            </div>
                        )}
                        <button onClick={onSaved} className="mt-6 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-medium transition">Tutup</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl p-6 max-w-lg w-full border border-white/10 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white mb-6">Tambah Karyawan Baru</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2"><label className="block text-xs text-slate-400 mb-1">Nama Lengkap *</label><input name="full_name" required value={form.full_name} onChange={handleChange} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></div>
                        <div><label className="block text-xs text-slate-400 mb-1">Email</label><input name="email" type="email" value={form.email} onChange={handleChange} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></div>
                        <div><label className="block text-xs text-slate-400 mb-1">No. HP</label><input name="phone" value={form.phone} onChange={handleChange} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></div>
                        <div><label className="block text-xs text-slate-400 mb-1">NIK</label><input name="nik" value={form.nik} onChange={handleChange} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></div>
                        <div><label className="block text-xs text-slate-400 mb-1">ID Karyawan</label><input name="employee_id" value={form.employee_id || ''} onChange={handleChange} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" placeholder="Opsional" /></div>
                        <div><label className="block text-xs text-slate-400 mb-1">Divisi</label><select name="division" value={form.division} onChange={handleChange} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"><option value="">Pilih Divisi</option>{divisions.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                        <div><label className="block text-xs text-slate-400 mb-1">Posisi</label><input name="position" value={form.position} onChange={handleChange} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></div>
                        <div><label className="block text-xs text-slate-400 mb-1">Tanggal Masuk *</label><input name="join_date" type="date" required value={form.join_date} onChange={handleChange} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></div>
                        <div><label className="block text-xs text-slate-400 mb-1">Tipe</label><select name="employment_type" value={form.employment_type} onChange={handleChange} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"><option>Full-time</option><option>Contract</option><option>Internship</option></select></div>
                        <div><label className="block text-xs text-slate-400 mb-1">Masa Probation</label><select name="probation_months" value={form.probation_months} onChange={handleChange} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"><option value={3}>3 Bulan</option><option value={6}>6 Bulan</option></select></div>
                        <div><label className="block text-xs text-slate-400 mb-1">Status</label><select name="status" value={form.status} onChange={handleChange} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"><option>Probation</option><option>Permanent</option><option>Contract</option></select></div>
                    </div>
                    <div><label className="block text-xs text-slate-400 mb-1">Catatan</label><textarea name="notes" value={form.notes} onChange={handleChange} rows="2" className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm transition">Batal</button>
                        <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ImportModal({ onClose, onDone, token }) {
    const [file, setFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState(null);

    const handleImport = async () => {
        if (!file) return;
        setImporting(true);
        const fd = new FormData();
        fd.append('file', file);
        try {
            const res = await fetch('/api/employees/import', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd });
            const data = await res.json();
            setResult(data);
        } catch (err) { alert('Error: ' + err.message); }
        finally { setImporting(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-white/10" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white mb-4">Import dari Excel</h2>
                {result ? (
                    <div>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-4">
                            <p className="text-emerald-400 font-bold">{result.imported} dari {result.total} berhasil diimport</p>
                        </div>
                        {result.errors?.length > 0 && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4 max-h-32 overflow-y-auto">
                                <p className="text-red-400 font-bold text-sm mb-2">Error:</p>
                                {result.errors.map((e, i) => <p key={i} className="text-red-300 text-xs">Baris {e.row}: {e.error}</p>)}
                            </div>
                        )}
                        <button onClick={onDone} className="w-full px-4 py-2 bg-cyan-600 text-white rounded-xl font-medium">Tutup</button>
                    </div>
                ) : (
                    <div>
                        <div className="bg-slate-900 border-2 border-dashed border-white/20 rounded-xl p-6 text-center mb-4">
                            <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setFile(e.target.files[0])} className="text-sm text-slate-400" />
                            <p className="text-xs text-slate-500 mt-2">Format: Nama Lengkap, Email, No. HP, NIK, Divisi, Posisi, Tanggal Masuk, Status</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={onClose} className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-xl text-sm">Batal</button>
                            <button onClick={handleImport} disabled={!file || importing} className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-xl text-sm font-bold disabled:opacity-50">{importing ? 'Importing...' : 'Import'}</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
