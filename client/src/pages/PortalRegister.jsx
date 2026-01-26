import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const PortalRegister = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        division: ''
    });
    const [divisions, setDivisions] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    useEffect(() => {
        fetchDivisions();
    }, []);

    const fetchDivisions = async () => {
        try {
            const res = await fetch('/api/settings/divisions');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) setDivisions(data);
            }
        } catch (error) {
            console.error("Failed to fetch divisions", error);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            const res = await fetch('/api/portal/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formData.username,
                    password: formData.password,
                    division: formData.division
                })
            });

            const data = await res.json();
            if (res.ok) {
                setSuccess(true);
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch (err) {
            setError('Connection failed');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0f172a] to-[#1e1b4b] flex items-center justify-center p-4">
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl">
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
                    Request Portal Access
                </h2>
                <p className="text-gray-400 mb-8">Register for a division account. Approval required.</p>

                {error && <div className="bg-red-500/10 border border-red-500/50 text-red-300 p-3 rounded-lg mb-4 text-sm">{error}</div>}

                {success ? (
                    <div className="bg-green-500/10 border border-green-500/50 text-green-300 p-6 rounded-lg text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <h3 className="text-xl font-bold mb-2">Registration Successful</h3>
                        <p className="text-sm text-gray-300 mb-4">Your account is created and waiting for Admin approval. Please contact HR Admin.</p>
                        <Link to="/portal/login" className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-bold transition">
                            Back to Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Username</label>
                            <input
                                type="text"
                                name="username"
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-all"
                                value={formData.username}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Division</label>
                            <select
                                name="division"
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-all"
                                value={formData.division}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Division</option>
                                {divisions.length > 0 ? (
                                    divisions.map((div, idx) => (
                                        <option key={idx} value={div}>{div}</option>
                                    ))
                                ) : (
                                    <>
                                        <option value="IT">IT</option>
                                        <option value="HR">HR</option>
                                        <option value="Marketing">Marketing</option>
                                        <option value="Finance">Finance</option>
                                        <option value="Operations">Operations</option>
                                    </>
                                )}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Password</label>
                            <input
                                type="password"
                                name="password"
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-all"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Confirm Password</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-all"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold text-white transition-all transform hover:scale-105 shadow-lg shadow-blue-500/20">
                            Submit Request
                        </button>

                        <div className="text-center mt-4">
                            <Link to="/portal/login" className="text-blue-400 hover:text-blue-300 text-sm">
                                Already have an account? Login
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default PortalRegister;
