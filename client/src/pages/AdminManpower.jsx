import React, { useState, useEffect } from 'react';

const AdminManpower = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [publishFormData, setPublishFormData] = useState({
        title: '',
        description: '',
        requirements: '',
        expiresAt: ''
    });

    const handlePublish = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const payload = {
                manpowerRequestId: selectedRequest.id,
                title: publishFormData.title,
                description: publishFormData.description,
                requirements: publishFormData.requirements,
                expiresAt: publishFormData.expiresAt ? new Date(publishFormData.expiresAt).toISOString() : null,
                isActive: true
            };

            const res = await fetch('/api/vacancies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                // Status update is handled automatically by backend service when creating vacancy with manpowerRequestId
                fetchRequests();
                closeModals();
                alert("Vacancy Published & Status Updated to 'In Progress'");
            } else {
                alert("Failed to publish vacancy");
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                console.error("No admin token found");
                setLoading(false);
                return;
            }

            const res = await fetch('/api/manpower', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401 || res.status === 403) {
                console.error("Unauthorized access - Redirecting to login");
                localStorage.removeItem('adminToken');
                window.location.href = '/admin/login';
                return;
            }

            const data = await res.json();

            if (Array.isArray(data)) {
                setRequests(data);
            } else {
                setRequests([]);
            }
        } catch (error) {
            console.error("Failed to fetch requests", error);
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, status, reason = null) => {
        try {
            const token = localStorage.getItem('adminToken');
            const payload = { status };
            if (reason) payload.rejectionReason = reason;

            const res = await fetch(`/api/manpower/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                fetchRequests();
                closeModals();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this COMPLETED/REJECTED request? This cannot be undone.")) return;
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`/api/manpower/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                fetchRequests();
                alert("Request deleted successfully");
                closeModals();
            } else {
                const data = await res.json();
                alert(`Failed to delete: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Delete failed", error);
            alert("Delete failed due to network error");
        }
    };

    const handleRejectClick = (req) => {
        setSelectedRequest(req);
        setIsRejectModalOpen(true);
    };

    const confirmReject = () => {
        if (!selectedRequest) return;
        updateStatus(selectedRequest.id, 'Rejected', rejectionReason);
    };

    const closeModals = () => {
        setSelectedRequest(null);
        setIsRejectModalOpen(false);
        setIsPublishModalOpen(false);
        setRejectionReason('');
    };

    return (
        <div className="p-8 relative">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-6">
                Manpower Approvals
            </h1>

            <div className="overflow-x-auto bg-white rounded-xl shadow-lg border border-gray-100">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-xs">
                        <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Division</th>
                            <th className="p-4">Position</th>
                            <th className="p-4">Qty</th>
                            <th className="p-4">Priority</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? <tr><td colSpan="7" className="p-4 text-center">Loading...</td></tr> : requests.map(req => (
                            <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 text-sm text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                                <td className="p-4 font-medium text-gray-800">{req.division}</td>
                                <td className="p-4 font-bold text-gray-900">{req.position}</td>
                                <td className="p-4 text-gray-600">{req.hiredCount} / {req.quantity}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${req.priority === 'High' ? 'bg-red-100 text-red-600' :
                                        req.priority === 'Low' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                        {req.priority}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className={`px-2 py-1 rounded text-xs font-bold w-fit ${req.status === 'Pending' ? 'bg-yellow-100 text-yellow-600' :
                                            req.status === 'Approved' ? 'bg-blue-100 text-blue-600' :
                                                req.status === 'In Progress' ? 'bg-purple-100 text-purple-600' :
                                                    req.status === 'Fulfilled' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                            }`}>
                                            {req.status}
                                        </span>
                                        {req.status === 'Rejected' && req.rejectionReason && (
                                            <span className="text-xs text-red-500 mt-1 max-w-[150px] truncate" title={req.rejectionReason}>
                                                Reason: {req.rejectionReason}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setSelectedRequest(req)}
                                            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs font-bold transition-colors"
                                        >
                                            View
                                        </button>

                                        {req.status === 'Pending' && (
                                            <>
                                                <button
                                                    onClick={() => updateStatus(req.id, 'Approved')}
                                                    className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-bold transition-colors"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleRejectClick(req)}
                                                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-bold transition-colors"
                                                >
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                        {req.status === 'Approved' && (
                                            <button
                                                onClick={() => {
                                                    setSelectedRequest(req);
                                                    setPublishFormData({
                                                        title: req.position,
                                                        description: req.jobDescription || '',
                                                        requirements: `Qualifications:\n${req.educationQualification || '-'}\n\nExperience:\n${req.yearsOfExperience || '-'}\n\nOther:\n${req.otherQualifications || req.requirements || '-'}`,
                                                        expiresAt: ''
                                                    });
                                                    setIsPublishModalOpen(true);
                                                }}
                                                className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-xs font-bold transition-colors"
                                            >
                                                Start Recruiting
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(req.id)}
                                            className="px-3 py-1 bg-red-600/10 hover:bg-red-600/30 text-red-600 rounded text-xs font-bold transition-colors border border-red-200"
                                            title="Delete Request"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* View Details Modal */}
            {selectedRequest && !isRejectModalOpen && !isPublishModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-fade-in-up">
                        <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{selectedRequest.position}</h2>
                                <p className="text-gray-500 text-sm">Requested by {selectedRequest.requesterName} • {selectedRequest.division}</p>
                            </div>
                            <button onClick={closeModals} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Quantity</label>
                                    <p className="font-semibold text-gray-800">{selectedRequest.quantity} Person(s)</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Priority</label>
                                    <p className={`font-bold ${selectedRequest.priority === 'High' ? 'text-red-600' : 'text-blue-600'}`}>{selectedRequest.priority}</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-2 block">Job Description</label>
                                <div className="p-4 bg-gray-50 rounded-xl text-gray-600 text-sm whitespace-pre-wrap">
                                    {selectedRequest.jobDescription || 'No description provided.'}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-2 block">Requirements</label>
                                <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                                    <div>
                                        <span className="text-xs text-gray-400 uppercase font-bold block">Qualifications</span>
                                        <p className="text-gray-800 text-sm">{selectedRequest.educationQualification || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-400 uppercase font-bold block">Experience</span>
                                        <p className="text-gray-800 text-sm">{selectedRequest.yearsOfExperience || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-400 uppercase font-bold block">Other</span>
                                        <p className="text-gray-800 text-sm whitespace-pre-wrap">{selectedRequest.otherQualifications || '-'}</p>
                                    </div>
                                    {(!selectedRequest.educationQualification && selectedRequest.requirements) && (
                                        <p className="text-gray-500 text-xs mt-2 border-t border-gray-200 pt-2">{selectedRequest.requirements}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Hire Purpose</label>
                                    <p className="font-semibold text-gray-800">{selectedRequest.hirePurpose || '-'}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Level</label>
                                    <p className="font-semibold text-gray-800">{selectedRequest.positionLevel || '-'}</p>
                                </div>
                            </div>

                            {selectedRequest.rejectionReason && (
                                <div className="bg-red-50 border border-red-100 p-4 rounded-xl">
                                    <label className="text-sm font-bold text-red-700 mb-1 block">Rejection Reason</label>
                                    <p className="text-red-600 text-sm">{selectedRequest.rejectionReason}</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 flex justify-between">
                            <button
                                onClick={() => handleDelete(selectedRequest.id)}
                                className="px-6 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg transition-colors border border-red-200"
                            >
                                Delete Request
                            </button>
                            <button onClick={closeModals} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Reason Modal */}
            {isRejectModalOpen && selectedRequest && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Reject Request</h3>
                        <p className="text-gray-600 text-sm mb-4">Please provide a reason for rejecting the request for <strong>{selectedRequest.position}</strong>.</p>

                        <textarea
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                            rows="4"
                            placeholder="Reason for rejection..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                        ></textarea>

                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={closeModals} className="px-4 py-2 text-gray-500 hover:text-gray-700 font-bold text-sm">Cancel</button>
                            <button
                                onClick={confirmReject}
                                disabled={!rejectionReason.trim()}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm transition-colors"
                            >
                                Confirm Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Publish Vacancy Modal */}
            {isPublishModalOpen && selectedRequest && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-xl p-8 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-900">Publish Vacancy</h3>
                            <button onClick={closeModals} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Job Title</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg p-2 text-gray-900 bg-white"
                                    value={publishFormData.title}
                                    onChange={e => setPublishFormData({ ...publishFormData, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Public Description</label>
                                <textarea
                                    className="w-full border rounded-lg p-2 h-24 text-gray-900 bg-white"
                                    value={publishFormData.description}
                                    onChange={e => setPublishFormData({ ...publishFormData, description: e.target.value })}
                                ></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Requirements (Public)</label>
                                <textarea
                                    className="w-full border rounded-lg p-2 h-32 text-gray-900 bg-white"
                                    value={publishFormData.requirements}
                                    onChange={e => setPublishFormData({ ...publishFormData, requirements: e.target.value })}
                                ></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Expiry Date</label>
                                <input
                                    type="date"
                                    className="w-full border rounded-lg p-2 text-gray-900 bg-white"
                                    value={publishFormData.expiresAt}
                                    onChange={e => setPublishFormData({ ...publishFormData, expiresAt: e.target.value })}
                                />
                            </div>

                            <div className="mt-8 pt-6 border-t flex justify-end gap-3">
                                <button onClick={closeModals} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button
                                    onClick={handlePublish}
                                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-lg shadow-lg"
                                >
                                    Publish & Start Recruiting
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminManpower;
