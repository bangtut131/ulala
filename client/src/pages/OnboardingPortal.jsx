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
