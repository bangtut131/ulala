import React, { useEffect, useState, useRef } from 'react';

export default function AdminDashboard() {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        fullName: '',
        position: '',
        phone: '',
        verdict: '',
        discProfile: '',
        matchScore: ''
    });

    const tableContainerRef = useRef(null);
    const topScrollRef = useRef(null);
    const [scrollWidth, setScrollWidth] = useState(0);

    useEffect(() => {
        const fetchCandidates = async () => {
            try {
                const res = await fetch('/api/candidates');
                const data = await res.json();
                setCandidates(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchCandidates();
    }, []);

    // Sync scrollbars and width
    useEffect(() => {
        const syncScrollWidth = () => {
            if (tableContainerRef.current) {
                setScrollWidth(tableContainerRef.current.scrollWidth);
            }
        };

        // Initial sync
        syncScrollWidth();

        // Sync on resize
        window.addEventListener('resize', syncScrollWidth);
        return () => window.removeEventListener('resize', syncScrollWidth);
    }, [candidates, loading]); // Update when data changes

    const handleTopScroll = (e) => {
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollLeft = e.target.scrollLeft;
        }
    };

    const handleTableScroll = (e) => {
        if (topScrollRef.current) {
            topScrollRef.current.scrollLeft = e.target.scrollLeft;
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const filteredCandidates = candidates.filter(c => {
        const matchName = c.fullName?.toLowerCase().includes(filters.fullName.toLowerCase());
        const matchPos = c.position?.toLowerCase().includes(filters.position.toLowerCase());
        const matchPhone = c.phone?.toLowerCase().includes(filters.phone.toLowerCase());
        const matchVerdict = (c.analysis?.verdict || '-')?.toLowerCase().includes(filters.verdict.toLowerCase());
        const matchDisc = (c.discResult?.profile || '-')?.toLowerCase().includes(filters.discProfile.toLowerCase());

        // Advanced Score Filtering
        const checkScoreFilter = (score, filterStr) => {
            if (!filterStr) return true;
            const cleanFilter = filterStr.trim();

            // Range: "50-70"
            if (cleanFilter.includes('-')) {
                const [min, max] = cleanFilter.split('-').map(Number);
                if (!isNaN(min) && !isNaN(max)) {
                    return score >= min && score <= max;
                }
            }
            // Less than: "<50"
            if (cleanFilter.startsWith('<')) {
                const val = Number(cleanFilter.slice(1));
                if (!isNaN(val)) return score < val;
            }
            // Greater than: ">50"
            if (cleanFilter.startsWith('>')) {
                const val = Number(cleanFilter.slice(1));
                if (!isNaN(val)) return score > val;
            }
            // Exact match: "=50"
            if (cleanFilter.startsWith('=')) {
                const val = Number(cleanFilter.slice(1));
                if (!isNaN(val)) return score === val;
            }

            // Fallback: Partial Text Match
            return score.toString().includes(cleanFilter);
        };

        const matchScore = checkScoreFilter(c.analysis?.matchScore || 0, filters.matchScore);

        return matchName && matchPos && matchPhone && matchVerdict && matchDisc && matchScore;
    });

    const downloadCSV = () => {
        if (filteredCandidates.length === 0) return;

        const headers = ["ID", "Full Name", "Email", "Phone", "Position", "DISC Profile", "Match Score", "Verdict", "Status"];
        const csvContent = [
            headers.join(','),
            ...filteredCandidates.map(c => [
                c.id,
                `"${c.fullName}"`,
                c.email,
                `"${c.phone || ''}"`,
                `"${c.position || ''}"`,
                `"${c.discResult?.profile || '-'}"`,
                `"${c.analysis?.matchScore || 0}%"`,
                `"${c.analysis?.verdict || '-'}"`,
                c.status || 'New'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'candidates_export.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this candidate? This action cannot be undone.')) return;

        try {
            const res = await fetch(`/api/candidates/${id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                setCandidates(candidates.filter(c => c.id !== id));
            } else {
                alert('Failed to delete candidate');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting candidate');
        }
    };

    return (
        <div className="min-h-screen relative p-4 md:p-8">
            {/* Dynamic Backgrounds */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gama-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyber-teal/5 rounded-full blur-[100px] pointer-events-none"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-white tracking-wide">HR Admin Dashboard</h1>
                        <p className="text-slate-400">Overview of recent applications</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <a href="/admin/manpower" target="_blank" className="btn-outline px-4 py-2 flex items-center gap-2 text-sm bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20">
                            📄 Manpower
                        </a>
                        <a href="/admin/kanban" target="_blank" className="btn-outline px-4 py-2 flex items-center gap-2 text-sm bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20">
                            📋 Kanban
                        </a>
                        <a href="/admin/vacancies" target="_blank" className="btn-outline px-4 py-2 flex items-center gap-2 text-sm bg-pink-500/10 text-pink-400 border-pink-500/20 hover:bg-pink-500/20">
                            📢 Vacancies
                        </a>
                        <a href="/admin/sla" target="_blank" className="btn-outline px-4 py-2 flex items-center gap-2 text-sm bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20">
                            📊 SLA Report
                        </a>
                        <a href="/admin/employees" target="_blank" className="btn-outline px-4 py-2 flex items-center gap-2 text-sm bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20">
                            👥 Employees
                        </a>
                        <a href="/admin/settings" target="_blank" className="btn-outline px-4 py-2 flex items-center gap-2 text-sm bg-slate-800/50">
                            ⚙ Settings
                        </a>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-500/20 transition flex items-center gap-2"
                        >
                            Log Out
                        </button>
                        <button
                            onClick={downloadCSV}
                            className="btn-primary px-4 py-2 flex items-center gap-2 text-sm shadow-gama-500/20"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            Export CSV
                        </button>
                    </div>
                </header>

                {loading ? (
                    <div className="text-center py-20 text-slate-400 animate-pulse">Loading data...</div>
                ) : (
                    <div className="glass-dark rounded-2xl overflow-hidden border border-white/10 shadow-2xl">

                        {/* Top Scrollbar */}
                        <div
                            ref={topScrollRef}
                            className="overflow-x-auto border-b border-white/5 bg-slate-900/20 custom-scrollbar"
                            onScroll={handleTopScroll}
                        >
                            <div style={{ width: scrollWidth, height: '1px' }}></div>
                        </div>

                        <div
                            className="overflow-x-auto custom-scrollbar"
                            ref={tableContainerRef}
                            onScroll={handleTableScroll}
                        >
                            <table className="min-w-full divide-y divide-white/5">
                                <thead className="bg-slate-900/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Candidate</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Applied For</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">DISC Profile</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Match</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Verdict</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                    {/* Filter Row */}
                                    <tr className="bg-slate-900/30 border-t border-white/5">
                                        <th className="px-6 py-2">
                                            <input
                                                name="fullName" value={filters.fullName} onChange={handleFilterChange}
                                                className="w-full text-xs p-2 bg-slate-800 border border-slate-700 rounded text-slate-300 focus:border-gama-500 outline-none"
                                                placeholder="Filter Name..."
                                            />
                                        </th>
                                        <th className="px-6 py-2">
                                            <input
                                                name="phone" value={filters.phone} onChange={handleFilterChange}
                                                className="w-full text-xs p-2 bg-slate-800 border border-slate-700 rounded text-slate-300 focus:border-gama-500 outline-none"
                                                placeholder="Filter Phone..."
                                            />
                                        </th>
                                        <th className="px-6 py-2">
                                            <input
                                                name="position" value={filters.position} onChange={handleFilterChange}
                                                className="w-full text-xs p-2 bg-slate-800 border border-slate-700 rounded text-slate-300 focus:border-gama-500 outline-none"
                                                placeholder="Filter Role..."
                                            />
                                        </th>
                                        <th className="px-6 py-2">
                                            <input
                                                name="discProfile" value={filters.discProfile} onChange={handleFilterChange}
                                                className="w-full text-xs p-2 bg-slate-800 border border-slate-700 rounded text-slate-300 focus:border-gama-500 outline-none"
                                                placeholder="Filter DISC..."
                                            />
                                        </th>
                                        <th className="px-6 py-2">
                                            <input
                                                name="matchScore" value={filters.matchScore} onChange={handleFilterChange}
                                                className="w-16 text-xs p-2 bg-slate-800 border border-slate-700 rounded text-slate-300 focus:border-gama-500 outline-none"
                                                placeholder="Score..."
                                            />
                                        </th>
                                        <th className="px-6 py-2">
                                            <input
                                                name="verdict" value={filters.verdict} onChange={handleFilterChange}
                                                className="w-full text-xs p-2 bg-slate-800 border border-slate-700 rounded text-slate-300 focus:border-gama-500 outline-none"
                                                placeholder="Filter Verdict..."
                                            />
                                        </th>
                                        <th className="px-6 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-transparent divide-y divide-white/5">
                                    {filteredCandidates.length > 0 ? (
                                        filteredCandidates.map((candidate) => (
                                            <tr key={candidate.id} className="hover:bg-white/5 transition group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-white group-hover:text-gama-300 transition-colors">{candidate.fullName}</div>
                                                        <div className="text-sm text-slate-500">{candidate.email}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                                    {candidate.phone || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                                    {candidate.position}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                        {candidate.discResult?.profile || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-1 w-24 bg-slate-800 rounded-full h-1.5 mr-2">
                                                            <div
                                                                className={`h-1.5 rounded-full ${(candidate.analysis?.matchScore || 0) >= 80 ? 'bg-gama-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-yellow-500'}`}
                                                                style={{ width: `${candidate.analysis?.matchScore || 0}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className={`text-xs font-bold ${(candidate.analysis?.matchScore || 0) >= 80 ? 'text-gama-400' : 'text-slate-400'}`}>
                                                            {candidate.analysis?.matchScore || 0}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`px-2 py-1 rounded-md text-xs font-medium border ${(candidate.analysis?.verdict || '').toLowerCase().includes('tidak') || (candidate.analysis?.verdict || '').toLowerCase().includes('not')
                                                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                        : (candidate.analysis?.verdict || '').toLowerCase().includes('bisa') || (candidate.analysis?.verdict || '').toLowerCase().includes('consider')
                                                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                            : 'bg-gama-500/10 text-gama-400 border-gama-500/20'
                                                        }`}>
                                                        {candidate.analysis?.verdict || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex gap-2 justify-end">
                                                    <a href={`/admin/candidate/${candidate.id}`} className="text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition">View</a>
                                                    <button
                                                        onClick={() => handleDelete(candidate.id)}
                                                        className="text-red-400 hover:text-red-300 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition"
                                                        title="Delete Candidate"
                                                    >
                                                        🗑
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                                                No candidates found matching your filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
