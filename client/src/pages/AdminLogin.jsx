import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const AdminLogin = () => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('adminToken', data.token);
                navigate('/admin');
            } else {
                setError(data.message || 'Login gagal.');
            }
        } catch (err) {
            setError('Terjadi kesalahan server.');
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center overflow-hidden p-4">
            {/* Dynamic Backgrounds */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gama-600/10 rounded-full blur-[100px] animate-pulse-slow"></div>
            </div>

            <div className="relative z-10 w-full max-w-md glass-dark p-8 rounded-2xl shadow-2xl border border-white/10 animate-fade-in-up">
                <div className="text-center mb-8">
                    <div className="relative flex justify-center mb-6">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gama-500/20 rounded-full blur-2xl animate-pulse-slow"></div>
                        <img
                            src={logo}
                            alt="Company Logo"
                            className="h-24 object-contain relative z-10 drop-shadow-[0_0_15px_rgba(34,197,94,0.4)] animate-float rounded-3xl"
                        />
                    </div>
                    <h2 className="text-3xl font-bold font-display text-white mb-2">Admin Portal</h2>
                    <p className="text-slate-400 text-sm">Secure Access Required</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-xl mb-6 text-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">Password</label>
                        <input
                            type="password"
                            className="input-field"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter admin password"
                            autoFocus
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn-primary w-full shadow-xl shadow-gama-500/20"
                    >
                        Access Dashboard
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
