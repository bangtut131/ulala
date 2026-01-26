import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PortalLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/portal/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('portalToken', data.token);
                localStorage.setItem('portalUser', JSON.stringify(data.user));
                // alert("Login Successful! Redirecting..."); // Optional: for debugging
                navigate('/portal');
            } else {
                setError(data.error || 'Login failed');
                alert("Login Failed: " + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error(err);
            setError('Connection failed. Check console.');
            alert("Connection Error. Please check your internet or server status.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0f172a] to-[#1e1b4b] flex items-center justify-center p-4">
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl">
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
                    Portal Login
                </h2>
                <p className="text-gray-400 mb-8">Access your specific division dashboard</p>

                {error && <div className="bg-red-500/10 border border-red-500/50 text-red-300 p-3 rounded-lg mb-4 text-sm">{error}</div>}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Username</label>
                        <input
                            type="text"
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-all"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-all"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3 rounded-xl font-bold text-white transition-all transform hover:scale-105 shadow-lg shadow-blue-500/20 ${isLoading ? 'bg-slate-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'}`}
                    >
                        {isLoading ? 'Processing...' : 'Enter Portal'}
                    </button>
                    <div className="text-center mt-4">
                        <a href="/portal/register" className="text-blue-400 hover:text-blue-300 text-sm">
                            Need an account? Sign up
                        </a>
                    </div>
                </form>

                <div className="mt-6 text-center text-xs text-gray-500">
                    Restricted Access • Division Leads Only
                </div>
            </div>
        </div>
    );
};

export default PortalLogin;
