import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminSettings() {
    const navigate = useNavigate();
    const [settings, setSettings] = useState({
        geminiApiKey: '',
        systemPrompt: '',
        googleDriveId: '',
        googleSheetId: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                setSettings(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const handleChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                geminiApiKey: settings.geminiApiKey,
                systemPrompt: settings.systemPrompt,
                googleDriveId: settings.googleDriveId,
                googleSheetId: settings.googleSheetId,
                aiProvider: settings.aiProvider,
                aiBaseUrl: settings.aiBaseUrl,
                aiModel: settings.aiModel,
                googleClientId: settings.googleClientId,
                googleClientSecret: settings.googleClientSecret,
                wahaBaseUrl: settings.wahaBaseUrl,
                wahaSessionId: settings.wahaSessionId,
                wahaApiKey: settings.wahaApiKey,
                hrPhoneNumber: settings.hrPhoneNumber,
                divisions: settings.divisions
            };

            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            alert("Pengaturan berhasil disimpan!");
        } catch (error) {
            alert("Gagal menyimpan pengaturan.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;

    return (
        <div className="min-h-screen relative p-4 md:p-8">
            {/* Background */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-20 left-10 w-[600px] h-[600px] bg-cyber-teal/5 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-10 right-10 w-[600px] h-[600px] bg-gama-600/10 rounded-full blur-[100px] pointer-events-none"></div>
            </div>

            <div className="relative z-10 max-w-3xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <button onClick={() => navigate('/admin')} className="text-slate-400 hover:text-white flex items-center transition-colors">
                        &larr; Kembali ke Dashboard
                    </button>
                    <h1 className="text-2xl font-bold font-display text-white">Pengaturan Admin</h1>
                </div>

                <form onSubmit={handleSave} className="glass-dark rounded-2xl p-8 space-y-8 border border-white/10 shadow-2xl">

                    {/* AI Configuration */}
                    <div>
                        <h2 className="text-lg font-semibold text-gama-400 border-b border-white/5 pb-2 mb-6">Konfigurasi AI</h2>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">AI Provider</label>
                                <select
                                    name="aiProvider"
                                    className="input-field bg-slate-800 text-white"
                                    value={settings.aiProvider || 'gemini'}
                                    onChange={handleChange}
                                >
                                    <option value="gemini" className="text-slate-900">Google Gemini</option>
                                    <option value="custom" className="text-slate-900">Custom (OpenAI Compatible)</option>
                                </select>
                            </div>

                            {settings.aiProvider === 'custom' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Base URL</label>
                                        <input
                                            type="text"
                                            name="aiBaseUrl"
                                            className="input-field"
                                            placeholder="https://api.openai.com/v1"
                                            value={settings.aiBaseUrl || ''}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Model Name</label>
                                        <input
                                            type="text"
                                            name="aiModel"
                                            className="input-field"
                                            placeholder="gpt-3.5-turbo"
                                            value={settings.aiModel || ''}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    {settings.aiProvider === 'custom' ? 'API Key' : 'Gemini API Key'}
                                </label>
                                <input
                                    type="password"
                                    name="geminiApiKey"
                                    className="input-field"
                                    placeholder="sk-..."
                                    value={settings.geminiApiKey}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">System Prompt</label>
                                <p className="text-xs text-slate-500 mb-2">Instruksi untuk AI dalam menganalisa kandidat.</p>
                                <textarea
                                    name="systemPrompt"
                                    rows="4"
                                    className="input-field"
                                    value={settings.systemPrompt}
                                    onChange={handleChange}
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Google Services */}
                    <div>
                        <h2 className="text-lg font-semibold text-gama-400 border-b border-white/5 pb-2 mb-6">Google Services</h2>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Google Drive Folder ID</label>
                                <input
                                    type="text"
                                    name="googleDriveId"
                                    className="input-field"
                                    placeholder="1abc..."
                                    value={settings.googleDriveId}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Google Sheet ID</label>
                                <input
                                    type="text"
                                    name="googleSheetId"
                                    className="input-field"
                                    placeholder="1xyz..."
                                    value={settings.googleSheetId}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Google OAuth Credentials */}
                    <div>
                        <h2 className="text-lg font-semibold text-gama-400 border-b border-white/5 pb-2 mb-6">Google Integration (OAuth 2.0)</h2>
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Google Client ID</label>
                                    <input
                                        type="text"
                                        name="googleClientId"
                                        className="input-field font-mono text-xs"
                                        placeholder="xxx.apps.googleusercontent.com"
                                        value={settings.googleClientId || ''}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Google Client Secret</label>
                                    <input
                                        type="password"
                                        name="googleClientSecret"
                                        className="input-field font-mono text-xs"
                                        placeholder="Client Secret"
                                        value={settings.googleClientSecret || ''}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                {settings.googleRefreshToken ? (
                                    <div className="flex items-center gap-2 text-gama-400 font-medium">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Connected to Google Account
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                                        <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                                        Not Connected
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={async () => {
                                        setSaving(true);
                                        try {
                                            await fetch('/api/settings', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify(settings)
                                            });
                                            window.location.href = '/api/auth/google';
                                        } catch (error) {
                                            alert("Gagal menyimpan setting sebelum koneksi. Coba klik Simpan manual dulu.");
                                            setSaving(false);
                                        }
                                    }}
                                    disabled={!settings.googleClientId || !settings.googleClientSecret}
                                    className="ml-auto px-4 py-2 bg-white text-slate-900 font-medium rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition"
                                >
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" className="w-4 h-4" alt="Google" />
                                    {settings.googleRefreshToken ? 'Reconnect' : 'Connect'}
                                </button>
                            </div>
                        </div>
                    </div>


                    {/* WhatsApp Configuration (WAHA) */}
                    <div>
                        <h2 className="text-lg font-semibold text-gama-400 border-b border-white/5 pb-2 mb-6">WhatsApp Notification (WAHA)</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">WAHA Base URL</label>
                                <input
                                    type="text"
                                    name="wahaBaseUrl"
                                    value={settings.wahaBaseUrl || 'http://localhost:3000'}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="e.g. http://localhost:3000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Session ID</label>
                                <input
                                    type="text"
                                    name="wahaSessionId"
                                    value={settings.wahaSessionId || 'default'}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="e.g. default"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-300 mb-1">WAHA API Key (Optional)</label>
                                <input
                                    type="password"
                                    name="wahaApiKey"
                                    value={settings.wahaApiKey || ''}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="If your WAHA is secured with an API Key"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-300 mb-1">HR Phone Number (Receiver)</label>
                                <input
                                    type="text"
                                    name="hrPhoneNumber"
                                    value={settings.hrPhoneNumber || ''}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="e.g. 6281234567890 (International Format with Country Code)"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary"
                        >
                            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                        </button>
                    </div>
                </form >

                {/* Division Management */}
                <div className="glass-dark rounded-2xl p-8 mt-8 border border-white/10">
                    <h2 className="text-lg font-semibold text-gama-400 border-b border-white/5 pb-2 mb-6">Manajemen Divisi</h2>
                    <DivisionManager settings={settings} setSettings={setSettings} />
                </div>

                {/* Pending Users Approval */}
                <div className="glass-dark rounded-2xl p-8 mt-8 border border-white/10">
                    <h2 className="text-lg font-semibold text-gama-400 border-b border-white/5 pb-2 mb-6">Persetujuan User Portal</h2>
                    <PendingUsersList />
                </div>

                {/* Change Password Section */}
                <div className="glass-dark rounded-2xl p-8 mt-8 border border-white/10">
                    <h2 className="text-lg font-semibold text-gama-400 border-b border-white/5 pb-2 mb-6">Keamanan Admin</h2>
                    <ChangePasswordForm />
                </div>
            </div>
        </div>
    );
}

function PendingUsersList() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/portal/auth/users');
            const data = await res.json();
            // Filter pending only
            if (Array.isArray(data)) {
                setUsers(data.filter(u => u.status === 'pending'));
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        if (!window.confirm("Setujui user ini?")) return;
        try {
            const res = await fetch(`/api/portal/auth/users/${id}/approve`, {
                method: 'PATCH'
            });
            if (res.ok) {
                alert("User disetujui.");
                fetchUsers();
            } else {
                alert("Gagal.");
            }
        } catch (error) {
            alert("Error connecting.");
        }
    };

    if (loading) return <p className="text-slate-400">Loading users...</p>;
    if (users.length === 0) return <p className="text-slate-500 italic">Tidak ada user yang menunggu persetujuan.</p>;

    return (
        <div className="space-y-4">
            {users.map(u => (
                <div key={u.id} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                    <div>
                        <p className="font-bold text-white">{u.username}</p>
                        <p className="text-sm text-gama-300">Divisi: {u.division}</p>
                        <p className="text-xs text-slate-500">Registered: {new Date(u.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button
                        onClick={() => handleApprove(u.id)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-lg transition"
                    >
                        Approve
                    </button>
                </div>
            ))}
        </div>
    );
}

function ChangePasswordForm() {
    const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e) => setPasswords({ ...passwords, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (passwords.newPassword !== passwords.confirmPassword) {
            setError('Konfirmasi password baru tidak cocok.');
            return;
        }

        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    oldPassword: passwords.oldPassword,
                    newPassword: passwords.newPassword
                })
            });

            const data = await res.json();
            if (data.success) {
                setMessage('Password berhasil diubah.');
                setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                setError(data.message || 'Gagal mengubah password.');
            }
        } catch (err) {
            setError('Terjadi kesalahan server.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
            {message && <div className="p-3 bg-gama-500/10 text-gama-400 border border-gama-500/20 rounded-xl text-sm">{message}</div>}
            {error && <div className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm">{error}</div>}

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Password Lama</label>
                <input type="password" name="oldPassword" required className="input-field" value={passwords.oldPassword} onChange={handleChange} />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Password Baru</label>
                <input type="password" name="newPassword" required className="input-field" value={passwords.newPassword} onChange={handleChange} />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Konfirmasi Password Baru</label>
                <input type="password" name="confirmPassword" required className="input-field" value={passwords.confirmPassword} onChange={handleChange} />
            </div>
            <button type="submit" className="btn-outline px-6 py-2 text-sm">Update Password</button>
        </form>
    );
}

function DivisionManager({ settings, setSettings }) {
    const [newDivision, setNewDivision] = useState('');

    const divisions = settings.divisions || [];

    const handleAdd = (e) => {
        e.preventDefault();
        if (!newDivision.trim()) return;
        if (divisions.includes(newDivision.trim())) {
            alert('Divisi sudah ada');
            return;
        }
        const updatedDivisions = [...divisions, newDivision.trim()];
        setSettings({ ...settings, divisions: updatedDivisions });
        setNewDivision('');
    };

    const handleDelete = (divToDelete) => {
        if (!window.confirm(`Hapus divisi ${divToDelete}?`)) return;
        const updatedDivisions = divisions.filter(d => d !== divToDelete);
        setSettings({ ...settings, divisions: updatedDivisions });
    };

    const sortedDivisions = [...divisions].sort();

    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Tambah Divisi Baru</label>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="text"
                        className="input-field flex-1"
                        placeholder="Nama Divisi (e.g. Sales)"
                        value={newDivision}
                        onChange={(e) => setNewDivision(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={handleAdd}
                        disabled={!newDivision.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg disabled:opacity-50 transition sm:w-auto w-full"
                    >
                        Tambah
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Daftar Divisi</label>
                {sortedDivisions.length === 0 ? (
                    <p className="text-slate-500 italic text-sm">Belum ada divisi yang diatur.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {sortedDivisions.map((div, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10 group hover:border-white/20 transition">
                                <span className="text-white font-medium">{div}</span>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(div)}
                                    className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition"
                                    title="Hapus Divisi"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex gap-3 text-sm text-yellow-200/80">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p>Klik "Simpan Pengaturan" di bagian paling atas untuk menyimpan perubahan divisi ini secara permanen.</p>
            </div>
        </div>
    );
}
