import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function OnboardingPortal() {
    const navigate = useNavigate();
    const token = localStorage.getItem('onboardingToken');
    const userStr = localStorage.getItem('onboardingUser');
    const [profile, setProfile] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);

    const headers = { 'Authorization': `Bearer ${token}` };

    useEffect(() => {
        if (!token) { navigate('/onboarding/login'); return; }
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [profileRes, accountsRes] = await Promise.all([
                fetch('/api/onboarding/me', { headers }),
                fetch('/api/onboarding/accounts', { headers })
            ]);
            if (profileRes.status === 401 || profileRes.status === 403) {
                localStorage.removeItem('onboardingToken');
                localStorage.removeItem('onboardingUser');
                navigate('/onboarding/login');
                return;
            }
            setProfile(await profileRes.json());
            setAccounts(await accountsRes.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleLogout = () => {
        localStorage.removeItem('onboardingToken');
        localStorage.removeItem('onboardingUser');
        navigate('/onboarding/login');
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Loading...</div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 right-20 w-[400px] h-[400px] bg-cyan-600/5 rounded-full blur-[100px]"></div>
            </div>
            <div className="relative z-10 max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Portal Onboarding</h1>
                        <p className="text-slate-400 text-sm">Selamat datang di perusahaan!</p>
                    </div>
                    <button onClick={handleLogout} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm transition">Logout</button>
                </div>

                {/* Welcome Card */}
                {profile && (
                    <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-2xl p-6 border border-cyan-500/20 mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
                                {profile.full_name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{profile.full_name}</h2>
                                <p className="text-cyan-300 text-sm">{profile.position} • {profile.division || 'Belum ditentukan'}</p>
                                <p className="text-slate-400 text-xs mt-1">Bergabung: {profile.join_date ? new Date(profile.join_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Accounts Section */}
                <div className="bg-slate-800/80 backdrop-blur rounded-2xl p-6 border border-white/10 mb-8">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                        Informasi Akun
                    </h2>
                    {accounts.length === 0 ? (
                        <p className="text-slate-500 italic text-sm">Belum ada akun yang disiapkan. Hubungi HR untuk informasi lebih lanjut.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {accounts.map(acc => (
                                <div key={acc.id} className="bg-slate-900 rounded-xl p-4 border border-white/5 hover:border-cyan-500/20 transition">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                        </div>
                                        <h3 className="text-white font-semibold text-sm">{acc.account_type}</h3>
                                    </div>
                                    <div className="space-y-1.5">
                                        {acc.username && <p className="text-sm"><span className="text-slate-500">Username:</span> <span className="text-white font-mono">{acc.username}</span></p>}
                                        {acc.password && <p className="text-sm"><span className="text-slate-500">Password:</span> <span className="text-white font-mono">{acc.password}</span></p>}
                                        {acc.url && <a href={acc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline block truncate">{acc.url}</a>}
                                        {acc.notes && <p className="text-xs text-slate-500 mt-1">{acc.notes}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* E-Learning Section */}
                <LearningSection token={token} navigate={navigate} />

                {/* Exit Form Link */}
                <div className="bg-slate-800/50 rounded-2xl p-6 border border-white/5">
                    <h2 className="text-lg font-bold text-white mb-2">Lainnya</h2>
                    <button onClick={() => navigate('/onboarding/exit')} className="text-slate-400 hover:text-white text-sm transition flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                        Exit Form (Keluar Perusahaan)
                    </button>
                </div>
            </div>
        </div>
    );
}

function LearningSection({ token, navigate }) {
    const [courses, setCourses] = useState([]);
    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(true);
    const headers = { 'Authorization': `Bearer ${token}` };

    useEffect(() => {
        fetchLearning();
    }, []);

    const fetchLearning = async () => {
        try {
            const [cRes, pRes] = await Promise.all([
                fetch('/api/onboarding/courses', { headers }),
                fetch('/api/onboarding/progress', { headers })
            ]);
            if (cRes.ok) setCourses(await cRes.json());
            if (pRes.ok) setProgress(await pRes.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    if (loading) return null;
    if (courses.length === 0) return null;

    const getModuleStatus = (m) => {
        if (m.result?.passed) return { label: '✅ Lulus', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
        if (m.result && !m.result.passed) return { label: '❌ Gagal', color: 'bg-red-500/20 text-red-300 border-red-500/30' };
        if (m.access && new Date(m.access.expires_at) < new Date()) return { label: '⏰ Expired', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };
        if (m.access) return { label: '📖 Sedang Belajar', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
        return { label: 'Belum Mulai', color: 'bg-slate-700/20 text-slate-500 border-slate-600/30' };
    };

    return (
        <div className="bg-slate-800/80 backdrop-blur rounded-2xl p-6 border border-white/10 mb-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">📚 Materi Onboarding</h2>
                {progress && (
                    <span className="text-sm text-slate-400">{progress.passedModules}/{progress.totalModules} selesai</span>
                )}
            </div>

            {progress && progress.totalModules > 0 && (
                <div className="mb-6">
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${progress.progressPercent}%` }}></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Progress: {progress.progressPercent}%</p>
                </div>
            )}

            {courses.map(course => (
                <div key={course.id} className="mb-4">
                    <h3 className="text-sm font-semibold text-violet-400 mb-3">{course.title}</h3>
                    <div className="space-y-2">
                        {(course.learning_modules || []).map(m => {
                            const status = getModuleStatus(m);
                            const canAccess = !m.access || new Date(m.access.expires_at) > new Date();
                            return (
                                <div key={m.id} onClick={() => canAccess && navigate(`/onboarding/module/${m.id}`)}
                                    className={`flex items-center gap-3 bg-slate-900 rounded-xl p-3 border border-white/5 transition ${canAccess ? 'hover:border-violet-500/20 cursor-pointer' : 'opacity-60'}`}>
                                    <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-xs">{m.sort_order + 1}</div>
                                    <div className="flex-1">
                                        <p className="text-white text-sm font-medium">{m.title}</p>
                                        {m.access && <p className="text-xs text-slate-500">Akses s/d {new Date(m.access.expires_at).toLocaleDateString('id-ID')} • {m.access.access_count}x dibuka</p>}
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${status.color}`}>{status.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
