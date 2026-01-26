import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Simple Icons
const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const PortalDashboard = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('portalUser') || '{}'));
    const navigate = useNavigate();

    // Form State
    const [formData, setFormData] = useState({
        division: user.division || '',
        position: '',
        quantity: 1,
        priority: 'Normal',
        requesterName: '',
        jobDescription: '',
        requirements: '',
        // New Fields
        hirePurpose: 'Replacement',
        positionLevel: 'Staff',
        customPositionLevel: '',
        educationLevel: 'S1', // Default
        educationMajor: '',
        educationQualification: '', // Legacy/Composite, we might not need to bind this to an input anymore
        yearsOfExperience: '1 Tahun', // Default
        otherQualifications: ''
    });
    const [divisions, setDivisions] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem('portalToken');
        if (!token) {
            navigate('/portal/login');
            return;
        }
        fetchRequests();
        fetchDivisions();
    }, [navigate]);

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

    const handleLogout = () => {
        localStorage.removeItem('portalToken');
        localStorage.removeItem('portalUser');
        navigate('/portal/login');
    };

    const fetchRequests = async () => {
        try {
            const token = localStorage.getItem('portalToken');
            const res = await fetch('/api/manpower', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401 || res.status === 403) {
                handleLogout();
                return;
            }

            const data = await res.json();
            setRequests(data);
        } catch (error) {
            console.error("Failed to fetch requests", error);
        } finally {
            setLoading(false);
        }
    };

    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('portalToken');
            // Prepare payload
            const payload = {
                ...formData,
                // Combine detailed requirements for backward compatibility if needed, or rely on DB saving individual fields
                // Formatting Education Qualification
                educationQualification: formData.educationLevel === 'SMP' ? 'SMP' : `${formData.educationLevel} ${formData.educationMajor ? '- ' + formData.educationMajor : ''}`,
                // For 'requirements' field (legacy), we can compose a string just in case
                requirements: `Education: ${formData.educationLevel} ${formData.educationMajor}\nExperience: ${formData.yearsOfExperience}\nOther: ${formData.otherQualifications}`,
                // If custom level is selected, use that
                positionLevel: formData.positionLevel === 'Other' ? formData.customPositionLevel : formData.positionLevel
            };

            const res = await fetch('/api/manpower', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setShowModal(false);
                fetchRequests();
                setFormData({
                    division: user.division || '',
                    position: '',
                    quantity: 1,
                    priority: 'Normal',
                    requesterName: '',
                    jobDescription: '',
                    requirements: '',
                    hirePurpose: 'Replacement',
                    positionLevel: 'Staff',
                    customPositionLevel: '',
                    educationLevel: 'S1',
                    educationMajor: '',
                    educationQualification: '',
                    yearsOfExperience: '1 Tahun',
                    otherQualifications: ''
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this pending request?")) return;
        try {
            const token = localStorage.getItem('portalToken');
            const res = await fetch(`/api/manpower/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                fetchRequests();
                alert("Request deleted successfully");
            } else {
                const data = await res.json();
                alert(`Failed to delete: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Delete failed", error);
            alert("Delete failed due to network error");
        }
    };

    const handleFinalize = async (id) => {
        if (!window.confirm("Approve and Finalize this recruitment? This will close the request.")) return;
        try {
            const token = localStorage.getItem('portalToken');
            const res = await fetch(`/api/manpower/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'Finalized' })
            });
            if (res.ok) {
                fetchRequests();
                alert("Request finalized successfully!");
            } else {
                const err = await res.json();
                alert(`Failed to finalize: ${err.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Finalize failed", error);
            alert("Network error or server unreachable.");
        }
    };


    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
            case 'Approved': return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
            case 'In Progress': return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
            case 'Fulfilled': return 'bg-green-500/20 text-green-300 border-green-500/50';
            case 'Finalized': return 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]'; // Distinct glowing style
            case 'Rejected': return 'bg-red-500/20 text-red-300 border-red-500/50';
            default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0f172a] to-[#1e1b4b] text-white p-8">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        Manpower Portal
                    </h1>
                    <p className="text-gray-400 mt-2">Division Request Tracking System</p>
                </div>

                <div className="flex flex-wrap gap-4 items-center justify-end">
                    <div className="flex flex-col items-end mr-2 hidden md:flex">
                        <span className="text-sm font-bold text-white">{user.username}</span>
                        <span className="text-xs text-gray-400">{user.division}</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-xl transition-all text-sm font-semibold"
                    >
                        Logout
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
                    >
                        <PlusIcon /> <span className="hidden sm:inline">New Request</span><span className="sm:hidden">New</span>
                    </button>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                {[
                    { label: 'Total Requests', value: requests.length, color: 'from-blue-500 to-cyan-500' },
                    { label: 'Pending', value: requests.filter(r => r.status === 'Pending').length, color: 'from-yellow-500 to-orange-500' },
                    { label: 'In Progress', value: requests.filter(r => r.status === 'In Progress' || r.status === 'Approved').length, color: 'from-purple-500 to-pink-500' },
                    { label: 'Fulfilled', value: requests.filter(r => r.status === 'Fulfilled' || r.status === 'Finalized').length, color: 'from-green-500 to-emerald-500' }
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-white/20 transition-all">
                        <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${stat.color} rounded-full opacity-20 blur-xl group-hover:opacity-30 transition-all`}></div>
                        <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">{stat.label}</h3>
                        <p className="text-4xl font-bold mt-2">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Request List */}
            <div className="grid grid-cols-1 gap-6">
                {loading ? <p>Loading...</p> : requests.map((req) => (
                    <div key={req.id} className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all flex flex-col justify-between">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                            <div>
                                <div className="flex items-center gap-4 mb-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(req.status)}`}>
                                        {req.status === 'Finalized' ? 'FINALIZED' : req.status.toUpperCase()}
                                    </span>
                                    <span className="text-sm text-gray-400">{req.division}</span>
                                    <span className="text-xs text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</span>
                                </div>
                                <h3 className="text-xl font-bold">{req.position} <span className="text-lg text-gray-400 font-normal">x {req.quantity}</span></h3>
                                {/* Simple Progress Bar for List View */}
                                <div className="mt-2 w-full md:w-64 bg-gray-800 rounded-full h-2 overflow-hidden">
                                    <div className="bg-blue-500 h-full" style={{ width: `${Math.min((req.hiredCount / req.quantity) * 100, 100)}%` }}></div>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">{req.hiredCount} / {req.quantity} Hired</p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedRequest(req)}
                                    className="px-4 py-2 bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 rounded-lg text-sm font-semibold transition-all"
                                >
                                    View Details
                                </button>
                                {req.status === 'Pending' && (
                                    <button
                                        onClick={() => handleDelete(req.id)}
                                        className="px-4 py-2 bg-red-600/20 text-red-300 hover:bg-red-600/40 rounded-lg text-sm font-semibold transition-all"
                                    >
                                        Delete
                                    </button>
                                )}
                                {((req.hiredCount >= req.quantity) && req.status !== 'Finalized' && req.status !== 'Rejected') && (
                                    <button
                                        onClick={() => handleFinalize(req.id)}
                                        className="px-4 py-2 bg-green-600 text-white hover:bg-green-500 rounded-lg text-sm font-bold shadow-lg shadow-green-500/20 transition-all border border-green-400"
                                    >
                                        Finalize / Approve
                                    </button>
                                )}
                            </div>
                        </div>

                        {req.rejectionReason && req.status === 'Rejected' && (
                            <div className="mt-2 bg-red-900/20 border border-red-500/30 p-3 rounded-lg text-red-300 text-sm">
                                <strong>Rejection Reason:</strong> {req.rejectionReason}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#1e1e2e] w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold">New Manpower Request</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* ... form content same as before ... */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Division</label>
                                    <select
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                        value={formData.division}
                                        onChange={e => setFormData({ ...formData, division: e.target.value })}
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
                                    <label className="block text-sm text-gray-400 mb-1">Requester Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                        value={formData.requesterName}
                                        onChange={e => setFormData({ ...formData, requesterName: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm text-gray-400 mb-1">Position / Job Title</label>
                                    <input
                                        type="text"
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                        value={formData.position}
                                        onChange={e => setFormData({ ...formData, position: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Quantity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                        value={formData.quantity}
                                        onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Priority</label>
                                <div className="flex gap-4">
                                    {['Low', 'Normal', 'High'].map(p => (
                                        <label key={p} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="priority"
                                                value={p}
                                                checked={formData.priority === p}
                                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                                className="accent-blue-500"
                                            />
                                            <span className="text-sm">{p}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Job Description</label>
                                <textarea
                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none h-24"
                                    value={formData.jobDescription}
                                    onChange={e => setFormData({ ...formData, jobDescription: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Keperluan Hire</label>
                                    <select
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                        value={formData.hirePurpose}
                                        onChange={e => setFormData({ ...formData, hirePurpose: e.target.value })}
                                    >
                                        <option value="Replacement">Replacement</option>
                                        <option value="Penambahan Karyawan">Penambahan Karyawan</option>
                                        <option value="Posisi baru">Posisi baru</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Level Posisi</label>
                                    <div className="flex gap-2">
                                        <select
                                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                            value={formData.positionLevel}
                                            onChange={e => setFormData({ ...formData, positionLevel: e.target.value })}
                                        >
                                            <option value="Staff">Staff</option>
                                            <option value="Senior Staff">Senior Staff</option>
                                            <option value="Head">Head</option>
                                            <option value="Supervisor">Supervisor</option>
                                            <option value="Manager">Manager</option>
                                            <option value="General Manager">General Manager</option>
                                            <option value="Direksi">Direksi</option>
                                            <option value="Other">Other (Specify)</option>
                                        </select>
                                    </div>
                                    {formData.positionLevel === 'Other' && (
                                        <input
                                            type="text"
                                            placeholder="Specify Level"
                                            className="w-full mt-2 bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                            value={formData.customPositionLevel}
                                            onChange={e => setFormData({ ...formData, customPositionLevel: e.target.value })}
                                            required
                                        />
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Requirements</label>
                                <div className="space-y-4">
                                    {/* Education Dropdown & Major */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Pendidikan</label>
                                            <select
                                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                                value={formData.educationLevel}
                                                onChange={e => setFormData({ ...formData, educationLevel: e.target.value })}
                                            >
                                                <option value="SMP">SMP</option>
                                                <option value="SMA">SMA / SMK</option>
                                                <option value="D3">D3</option>
                                                <option value="S1">S1</option>
                                                <option value="S2">S2</option>
                                            </select>
                                        </div>
                                        {formData.educationLevel !== 'SMP' && (
                                            <div className="animate-fade-in">
                                                <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Jurusan</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Teknik Informatika"
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                                    value={formData.educationMajor}
                                                    onChange={e => setFormData({ ...formData, educationMajor: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Experience Dropdown */}
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Pengalaman Kerja</label>
                                        <select
                                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                            value={formData.yearsOfExperience}
                                            onChange={e => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                                        >
                                            <option value="Fresh Graduate">Fresh Graduate</option>
                                            <option value="< 1 Tahun">&lt; 1 Tahun</option>
                                            {Array.from({ length: 15 }, (_, i) => i + 1).map(year => (
                                                <option key={year} value={`${year} Tahun`}>{year} Tahun</option>
                                            ))}
                                            <option value="> 15 Tahun">&gt; 15 Tahun</option>
                                        </select>
                                    </div>

                                    <textarea
                                        placeholder="Detail Kualifikasi Lainnya..."
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none h-24"
                                        value={formData.otherQualifications}
                                        onChange={e => setFormData({ ...formData, otherQualifications: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full py-3 rounded-xl font-bold transition-all ${isSubmitting ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'}`}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-[#1e1e2e] w-full max-w-3xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-white/10 flex justify-between items-start bg-white/5">
                            <div>
                                <h2 className="text-2xl font-bold text-white">{selectedRequest.position}</h2>
                                <p className="text-gray-400 text-sm">{selectedRequest.division} • {new Date(selectedRequest.createdAt).toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-8">

                            {/* Candidate Funnel Visualization */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Hiring Progress</h3>
                                {selectedRequest.candidateStats ? (
                                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center">
                                        {[
                                            { label: 'Applied', key: 'Applied', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
                                            { label: 'Screening', key: 'Screening', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' },
                                            { label: 'Interview', key: 'Interview', color: 'bg-purple-500/20 text-purple-400 border-purple-500/50' },
                                            { label: 'Offered', key: 'Offered', color: 'bg-pink-500/20 text-pink-400 border-pink-500/50' },
                                            { label: 'Hired', key: 'Hired', color: 'bg-green-500/20 text-green-400 border-green-500/50' },
                                            { label: 'Rejected', key: 'Rejected', color: 'bg-red-500/20 text-red-400 border-red-500/50' }
                                        ].map(step => (
                                            <div key={step.key} className={`p-3 rounded-xl border ${step.color} flex flex-col items-center justify-center`}>
                                                <span className="text-2xl font-bold">{selectedRequest.candidateStats[step.key] || 0}</span>
                                                <span className="text-xs uppercase mt-1 opacity-70">{step.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 italic text-sm">No candidate data available yet.</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                    <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Target Quantity</label>
                                    <p className="text-xl font-bold text-white">{selectedRequest.quantity} Person(s)</p>
                                </div>
                                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                    <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Current Status</label>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border inline-block mt-1 ${getStatusColor(selectedRequest.status)}`}>
                                        {selectedRequest.status}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h4 className="text-lg font-bold text-white mb-2">Job Description</h4>
                                    <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">
                                        {selectedRequest.jobDescription || 'No description provided.'}
                                    </p>
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-white mb-2">Requirements</h4>
                                    <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                                        <div>
                                            <span className="text-xs text-gray-400 uppercase font-bold block">Qualifications</span>
                                            <p className="text-gray-300 text-sm">{selectedRequest.educationQualification || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-400 uppercase font-bold block">Experience</span>
                                            <p className="text-gray-300 text-sm">{selectedRequest.yearsOfExperience || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-400 uppercase font-bold block">Other</span>
                                            <p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedRequest.otherQualifications || '-'}</p>
                                        </div>
                                        {/* Legacy fallback */}
                                        {(!selectedRequest.educationQualification && selectedRequest.requirements) && (
                                            <p className="text-gray-500 text-xs mt-2 border-t border-white/10 pt-2">{selectedRequest.requirements}</p>
                                        )}
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                            <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Hire Purpose</label>
                                            <p className="text-white text-sm font-medium">{selectedRequest.hirePurpose || '-'}</p>
                                        </div>
                                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                            <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Level</label>
                                            <p className="text-white text-sm font-medium">{selectedRequest.positionLevel || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end">
                            <button
                                onClick={() => setSelectedRequest(null)}
                                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-all"
                            >
                                Close View
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortalDashboard;
