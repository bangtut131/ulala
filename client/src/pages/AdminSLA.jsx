import React, { useState, useEffect } from 'react';

// Helper Cards
const StatCard = ({ title, value, subtext, color }) => (
    <div className={`p-6 rounded-2xl border ${color} bg-white/5 backdrop-blur-sm`}>
        <h3 className="text-gray-400 text-sm uppercase tracking-wider font-semibold">{title}</h3>
        <div className="text-3xl font-bold text-white mt-2">{value}</div>
        {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
    </div>
);

const AdminSLA = () => {
    const [stats, setStats] = useState({
        avgApprovalTime: 0,
        avgHiringTime: 0,
        requestsOnTrack: 0,
        requestsOverdue: 0
    });
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedRequest, setSelectedRequest] = useState(null);

    useEffect(() => {
        const fetchSLAData = async () => {
            try {
                const token = localStorage.getItem('adminToken');
                const res = await fetch('/api/manpower', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error("Failed to fetch");

                const data = await res.json();
                processSLA(data);
            } catch (error) {
                console.error("SLA Fetch Error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSLAData();
    }, []);

    const processSLA = (data) => {
        let totalApprovalTime = 0;
        let totalHiringTime = 0;
        let approvedCount = 0;
        let finalizedCount = 0;
        let onTrack = 0;
        let overdue = 0;

        const processedRequests = data.map(req => {
            const created = new Date(req.createdAt);
            // Fix: Use camelCase mapped from db.js
            const approved = req.approvedAt ? new Date(req.approvedAt) : null;
            const finalized = req.finalizedAt ? new Date(req.finalizedAt) : null;
            const now = new Date();

            // Calculate Durations (in Days)
            let approvalDays = approved ? (approved - created) / (1000 * 60 * 60 * 24) : null;
            let hiringDays = finalized && approved ? (finalized - approved) / (1000 * 60 * 60 * 24) : null;

            // Total Cycle Time
            let cycleDays = finalized ? (finalized - created) / (1000 * 60 * 60 * 24) : (now - created) / (1000 * 60 * 60 * 24);

            const targetDays = req.priority === 'Urgent' ? 14 : 30;
            const isOverdue = cycleDays > targetDays;

            if (approvalDays !== null) {
                totalApprovalTime += approvalDays;
                approvedCount++;
            }
            if (hiringDays !== null) {
                totalHiringTime += hiringDays;
                finalizedCount++;
            }

            if (req.status !== 'Rejected') {
                if (isOverdue) overdue++; else onTrack++;
            }

            return {
                ...req,
                approvalTime: approvalDays !== null ? approvalDays.toFixed(1) + 'd' : '-',
                hiringTime: hiringDays !== null ? hiringDays.toFixed(1) + 'd' : '-',
                cycleTime: cycleDays.toFixed(1) + 'd',
                targetSLA: targetDays + 'd',
                slaStatus: isOverdue ? 'Overdue' : 'On Track'
            };
        });

        setStats({
            avgApprovalTime: approvedCount ? (totalApprovalTime / approvedCount).toFixed(1) : 0,
            avgHiringTime: finalizedCount ? (totalHiringTime / finalizedCount).toFixed(1) : 0,
            requestsOnTrack: onTrack,
            requestsOverdue: overdue
        });
        setRequests(processedRequests);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
                        Manpower SLA Report
                    </h1>
                    <p className="text-gray-400 mt-2">Performance metrics for recruitment timeline and efficiency.</p>
                </header>

                {/* Scorecards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 bg-slate-800/20 p-4 rounded-3xl border border-white/5">
                    <StatCard
                        title="Avg Approval Time"
                        value={`${stats.avgApprovalTime} Days`}
                        subtext="Target: < 3 Days"
                        color="border-blue-500/30 text-blue-400"
                    />
                    <StatCard
                        title="Avg Hiring Time"
                        value={`${stats.avgHiringTime} Days`}
                        subtext="Target: < 30 Days"
                        color="border-purple-500/30 text-purple-400"
                    />
                    <StatCard
                        title="On Track"
                        value={stats.requestsOnTrack}
                        subtext="Within SLA"
                        color="border-green-500/30 text-green-400"
                    />
                    <StatCard
                        title="Overdue"
                        value={stats.requestsOverdue}
                        subtext="Exceeded SLA"
                        color="border-red-500/30 text-red-400"
                    />
                </div>

                {/* Detailed Table */}
                <div className="bg-slate-800/50 rounded-2xl border border-white/10 overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                        <h3 className="font-bold text-lg">Request Performance Details</h3>
                        <span className="text-xs text-gray-500 uppercase tracking-widest">{requests.length} Requests</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-slate-900/50 text-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Position</th>
                                    <th className="px-6 py-4">Division</th>
                                    <th className="px-6 py-4">Priority</th>
                                    <th className="px-6 py-4">Approval Time</th>
                                    <th className="px-6 py-4">Hiring Time</th>
                                    <th className="px-6 py-4">Current Age</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan="8" className="px-6 py-8 text-center animate-pulse">Calculating Metrics...</td></tr>
                                ) : requests.length > 0 ? (
                                    requests.map(req => (
                                        <tr key={req.id} className="hover:bg-white/5 transition group">
                                            <td className="px-6 py-4 font-medium text-white">{req.position}</td>
                                            <td className="px-6 py-4">{req.division}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${req.priority === 'Urgent' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                    {req.priority}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`${req.approvalTime !== '-' && parseFloat(req.approvalTime) > 3 ? 'text-red-400' : ''}`}>
                                                    {req.approvalTime}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">{req.hiringTime}</td>
                                            <td className="px-6 py-4 font-mono text-white">
                                                {req.cycleTime}
                                                <span className={`ml-2 text-xs ${req.slaStatus === 'Overdue' ? 'text-red-500' : 'text-green-500'}`}>
                                                    ({req.slaStatus})
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-white/10 rounded text-xs text-white border border-white/10">{req.status}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => setSelectedRequest(req)}
                                                    className="text-blue-400 hover:text-blue-300 hover:underline text-xs uppercase tracking-wider font-bold"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="8" className="px-6 py-8 text-center italic">No data available</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Details Modal */}
                {selectedRequest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                        <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">{selectedRequest.position}</h2>
                                    <div className='flex gap-2 text-sm'>
                                        <span className="text-gray-400">{selectedRequest.division}</span>
                                        <span className="text-gray-600">•</span>
                                        <span className={selectedRequest.priority === 'Urgent' ? 'text-red-400' : 'text-blue-400'}>{selectedRequest.priority} Priority</span>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-white/10 rounded-full transition">
                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Metrics Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                        <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Approval Time</div>
                                        <div className="text-xl font-bold text-white">{selectedRequest.approvalTime}</div>
                                    </div>
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                        <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Time to Hire</div>
                                        <div className="text-xl font-bold text-white">{selectedRequest.hiringTime}</div>
                                    </div>
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                        <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Age</div>
                                        <div className={`text-xl font-bold ${selectedRequest.slaStatus === 'Overdue' ? 'text-red-400' : 'text-green-400'}`}>
                                            {selectedRequest.cycleTime}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-2">Job Description</h4>
                                    <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5 text-gray-300 whitespace-pre-line leading-relaxed">
                                        {selectedRequest.jobDescription || 'No description provided.'}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-2">Requirements</h4>
                                    <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5 text-gray-300 whitespace-pre-line leading-relaxed">
                                        {selectedRequest.requirements || 'No requirements provided.'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-2">Requester</h4>
                                        <p className="text-white">{selectedRequest.requesterName || 'Unknown'}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-2">Requested On</h4>
                                        <p className="text-white">{new Date(selectedRequest.createdAt).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-white/10 bg-slate-900/50 sticky bottom-0 text-right">
                                <button onClick={() => setSelectedRequest(null)} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition font-medium">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminSLA;
