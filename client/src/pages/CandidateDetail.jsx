import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import DiscResultReport from '../components/DiscResultReport';
import AptitudeResultReport from '../components/AptitudeResultReport';

export default function CandidateDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [candidate, setCandidate] = useState(null);
    const [loading, setLoading] = useState(true);

    const [requests, setRequests] = useState([]);
    const [linking, setLinking] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('adminToken');
                const [candRes, reqRes] = await Promise.all([
                    fetch(`/api/candidates/${id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch('/api/manpower', { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                if (!candRes.ok) throw new Error('Candidate fetch failed');

                const candData = await candRes.json();
                const reqData = await reqRes.json();

                setCandidate(candData);

                // Filter requests that are active
                setRequests(reqData.filter(r => r.status === 'Approved' || r.status === 'In Progress'));

            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleLinkRequest = async (requestId) => {
        if (!window.confirm("Assign this candidate to the selected request? This will update their statistics.")) return;
        setLinking(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`/api/candidates/${id}/link-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ requestId })
            });
            if (res.ok) {
                alert("Candidate successfully linked!");
                // Refresh data or update state
                setCandidate(prev => ({ ...prev, request_id: requestId })); // Optimistic update
            }
        } catch (error) {
            console.error(error);
            alert("Failed to link candidate.");
        } finally {
            setLinking(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-white">Loading...</div>;
    if (!candidate) return <div className="p-8 text-center text-white">Candidate not found</div>;

    return (
        <div className="min-h-screen relative p-4 md:p-8">
            {/* Dynamic Backgrounds */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gama-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyber-teal/5 rounded-full blur-[100px] pointer-events-none"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                <button onClick={() => navigate('/admin')} className="mb-6 text-slate-400 hover:text-white transition flex items-center gap-2">
                    &larr; Kembali ke Dashboard
                </button>

                <div className="glass-dark rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <div className="p-8 border-b border-white/5 bg-slate-900/50">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                            <div className="w-full">
                                <h1 className="text-3xl font-display font-bold text-white tracking-wide">{candidate.fullName}</h1>
                                <p className="text-slate-400 mt-1">{candidate.position}  •  {candidate.email}</p>

                                {/* Manual Linking Section */}
                                <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
                                    <div className="text-sm text-slate-500 whitespace-nowrap">Assign to Request:</div>
                                    <select
                                        className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto"
                                        onChange={(e) => handleLinkRequest(e.target.value)}
                                        value={candidate.request_id || ""}
                                        disabled={linking}
                                    >
                                        <option value="">-- Select Active Request --</option>
                                        {requests.map(req => (
                                            <option key={req.id} value={req.id}>
                                                {req.position} ({req.division}) - {req.hiredCount}/{req.quantity}
                                            </option>
                                        ))}
                                    </select>
                                    {linking && <span className="text-xs text-blue-400 animate-pulse">Saving...</span>}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className={`px-4 py-2 rounded-xl text-sm font-bold border ${(candidate.analysis?.matchScore || 0) >= 80
                                    ? 'bg-gama-500/20 text-gama-400 border-gama-500/30 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                                    : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                    }`}>
                                    Match Score: {candidate.analysis?.matchScore || 0}%
                                </span>
                                <span className={`px-4 py-2 rounded-xl text-sm font-bold border ${(candidate.analysis?.verdict || '').toLowerCase().includes('tidak') || (candidate.analysis?.verdict || '').toLowerCase().includes('not')
                                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                    : (candidate.analysis?.verdict || '').toLowerCase().includes('bisa') || (candidate.analysis?.verdict || '').toLowerCase().includes('consider')
                                        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                        : 'bg-gama-500/20 text-gama-400 border-gama-500/30'
                                    }`}>
                                    Verdict: {candidate.analysis?.verdict || 'Pending'}
                                </span>
                                {candidate.cvUrl && (
                                    <a href={candidate.cvUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline">
                                        View Original CV
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                        {/* Left Column: Personal Info */}
                        <div className="p-8 border-r border-white/5 col-span-1 bg-slate-800/30">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">Data Pribadi</h3>
                            <div className="space-y-6 text-sm">
                                <div>
                                    <label className="block text-slate-500 text-xs mb-1">No HP</label>
                                    <div className="font-medium text-slate-200">{candidate.phone}</div>
                                </div>
                                <div>
                                    <label className="block text-slate-500 text-xs mb-1">Agama</label>
                                    <div className="font-medium text-slate-200">{candidate.religion || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-slate-500 text-xs mb-1">Gol. Darah</label>
                                    <div className="font-medium text-slate-200">{candidate.bloodType || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-slate-500 text-xs mb-1">Alamat</label>
                                    <div className="font-medium text-slate-200 leading-relaxed">{candidate.address || '-'}</div>
                                </div>
                            </div>

                            <div className="mt-10 pt-8 border-t border-white/5">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Hasil DISC</h3>
                                <div className="bg-slate-900/80 p-5 rounded-xl border border-white/10">
                                    <div className="text-center mb-4">
                                        <div className="text-2xl font-bold text-blue-400 tracking-tight">
                                            {candidate.discResult?.profile || 'N/A'}
                                        </div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Profile Type</div>
                                    </div>

                                    {/* DISC Chart */}
                                    <div className="h-48 w-full mb-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={[
                                                    { name: 'D', value: candidate.discResult?.dScore || 0, color: '#ef4444' }, // Red
                                                    { name: 'I', value: candidate.discResult?.iScore || 0, color: '#eab308' }, // Yellow
                                                    { name: 'S', value: candidate.discResult?.sScore || 0, color: '#22c55e' }, // Green
                                                    { name: 'C', value: candidate.discResult?.cScore || 0, color: '#3b82f6' }  // Blue
                                                ]}
                                                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                                    itemStyle={{ color: '#f8fafc' }}
                                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                />
                                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                    {
                                                        [
                                                            { name: 'D', value: candidate.discResult?.dScore || 0, color: '#ef4444' },
                                                            { name: 'I', value: candidate.discResult?.iScore || 0, color: '#eab308' },
                                                            { name: 'S', value: candidate.discResult?.sScore || 0, color: '#22c55e' },
                                                            { name: 'C', value: candidate.discResult?.cScore || 0, color: '#3b82f6' }
                                                        ].map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))
                                                    }
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                        <div className="bg-white/5 rounded p-1 border-t-2 border-red-500">
                                            <div className="text-slate-400 text-[10px]">D</div>
                                            <div className="font-bold text-white">{candidate.discResult?.dScore || 0}</div>
                                        </div>
                                        <div className="bg-white/5 rounded p-1 border-t-2 border-yellow-500">
                                            <div className="text-slate-400 text-[10px]">I</div>
                                            <div className="font-bold text-white">{candidate.discResult?.iScore || 0}</div>
                                        </div>
                                        <div className="bg-white/5 rounded p-1 border-t-2 border-green-500">
                                            <div className="text-slate-400 text-[10px]">S</div>
                                            <div className="font-bold text-white">{candidate.discResult?.sScore || 0}</div>
                                        </div>
                                        <div className="bg-white/5 rounded p-1 border-t-2 border-blue-500">
                                            <div className="text-slate-400 text-[10px]">C</div>
                                            <div className="font-bold text-white">{candidate.discResult?.cScore || 0}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Aptitude Result Section */}
                                {candidate.aptitudeResult && (
                                    <div className="mt-6 pt-6 border-t border-white/5">
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Hasil Aptitude (IQ)</h3>
                                        <div className="bg-slate-900/80 p-5 rounded-xl border border-white/10 flex justify-between items-center">
                                            <div>
                                                <div className="text-3xl font-bold text-white tracking-tight">
                                                    {candidate.aptitudeResult.score}
                                                </div>
                                                <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">IQ Score</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-blue-400">
                                                    {candidate.aptitudeResult.correctCount} / {candidate.aptitudeResult.totalCount}
                                                </div>
                                                <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Benar</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column: AI Analysis & OCR */}
                        <div className="p-8 col-span-2 bg-slate-900/20">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <span className="text-xl">✨</span> Analisa AI
                                </h3>
                                <button
                                    onClick={async () => {
                                        if (!window.confirm("Regenerate AI Analysis? This will overwrite existing results.")) return;
                                        setLoading(true); // Re-use loading or create local one? Local is better for UX but global is safer.
                                        // Let's use a local loading state or toast, but for simplicity, re-fetch data behaves like reloading
                                        try {
                                            const token = localStorage.getItem('adminToken');
                                            const res = await fetch(`/api/candidates/${candidate.id}/analysis/trigger`, {
                                                method: 'POST',
                                                headers: { 'Authorization': `Bearer ${token}` }
                                            });
                                            if (res.ok) {
                                                alert("Analysis Regenerated Successfully!");
                                                window.location.reload(); // Quick refresh
                                            } else {
                                                const err = await res.json();
                                                alert("Failed: " + err.error);
                                            }
                                        } catch (e) {
                                            alert("Error: " + e.message);
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded shadow transition"
                                >
                                    ↻ Regenerate
                                </button>
                            </div>

                            {/* Weighted Score Breakdown */}
                            <div className="bg-slate-800/80 rounded-xl border border-white/10 mb-8 overflow-hidden">
                                <div className="px-6 py-4 border-b border-white/5 bg-slate-800">
                                    <h4 className="text-sm font-semibold text-slate-300">Rincian Penilaian (Weighted Scoring)</h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
                                    <div className="p-4 text-center">
                                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">CV & Exp (40%)</div>
                                        <div className={`text-2xl font-bold ${candidate.analysis?.cvScore >= 75 ? 'text-green-400' : 'text-white'}`}>
                                            {candidate.analysis?.cvScore || 0}
                                        </div>
                                    </div>
                                    <div className="p-4 text-center">
                                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">DISC (25%)</div>
                                        <div className={`text-2xl font-bold ${candidate.analysis?.discScore >= 75 ? 'text-green-400' : 'text-white'}`}>
                                            {candidate.analysis?.discScore || 0}
                                        </div>
                                    </div>
                                    <div className="p-4 text-center">
                                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Aptitude (20%)</div>
                                        <div className={`text-2xl font-bold ${candidate.analysis?.aptitudeScore >= 75 ? 'text-green-400' : 'text-white'}`}>
                                            {candidate.analysis?.aptitudeScore || 0}
                                        </div>
                                    </div>
                                    <div className="p-4 text-center">
                                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Personal (15%)</div>
                                        <div className={`text-2xl font-bold ${candidate.analysis?.personalDataScore >= 75 ? 'text-green-400' : 'text-white'}`}>
                                            {candidate.analysis?.personalDataScore || 0}
                                        </div>
                                    </div>
                                </div>
                                <div className="px-6 py-3 bg-slate-900/50 border-t border-white/5 flex justify-between items-center">
                                    <span className="text-xs text-slate-400">Total Match Score</span>
                                    <span className={`text-lg font-bold ${candidate.analysis?.matchScore >= 80 ? 'text-green-400' : candidate.analysis?.matchScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {candidate.analysis?.matchScore || 0}/100
                                    </span>
                                </div>
                            </div>

                            <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5 mb-8 hover:border-white/10 transition-colors">
                                <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed text-justify">
                                    <ReactMarkdown
                                        components={{
                                            p: ({ node, ...props }) => <p className="indent-8 mb-4" {...props} />,
                                            h3: ({ node, ...props }) => <h3 className="text-xl font-bold text-white mt-6 mb-3 border-b border-white/10 pb-2" {...props} />,
                                            strong: ({ node, ...props }) => <strong className="font-bold italic text-white" {...props} />,
                                            em: ({ node, ...props }) => <em className="font-bold italic text-white" {...props} />
                                        }}
                                    >
                                        {candidate.analysis?.content || "Analisa belum tersedia."}
                                    </ReactMarkdown>
                                </div>
                            </div>

                            {candidate.snapshots && candidate.snapshots.length > 0 && (
                                <>
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                                        Proctoring Snapshots
                                    </h3>
                                    <div className="bg-slate-800/50 p-5 rounded-xl border border-white/5 mb-8 shadow-inner">
                                        <div className="flex flex-wrap gap-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                            {candidate.snapshots.map((snap, idx) => (
                                                <div key={idx} className="shrink-0 w-32 md:w-40 relative rounded-xl overflow-hidden border border-white/10 group cursor-pointer shadow-lg">
                                                    <img src={snap} alt={`Snapshot ${idx+1}`} className="w-full h-32 object-cover transition-transform duration-500 group-hover:scale-110" />
                                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent p-3 pt-6 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-white text-[10px] uppercase font-bold tracking-wider">#{idx+1}</span>
                                                        <a href={snap} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 font-bold uppercase transition-colors hover:text-blue-300">Lihat Penuh &rarr;</a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Data CV (OCR)</h3>
                            <div className="bg-black/40 text-slate-400 p-6 rounded-xl border border-white/5 font-mono text-xs overflow-auto max-h-60 shadow-inner mb-8">
                                <pre className="whitespace-pre-wrap">
                                    {candidate.analysis?.ocrText || candidate.cvText || "[OCR Data Not Available]"}
                                </pre>
                            </div>

                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Info Lain (System Logs & Debug)</h3>
                            <div className="bg-black/40 text-green-400 p-6 rounded-xl border border-white/5 font-mono text-xs overflow-auto max-h-60 shadow-inner">
                                <pre className="whitespace-pre-wrap">
                                    {candidate.otherInfo || "[No System Logs Available]"}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Full DISC Report Section */}
                {candidate.discResult && candidate.discResult.fullResult && (
                    <div className="mt-8 border-t border-white/10 pt-8">
                        <h2 className="text-2xl font-display font-bold text-white mb-6 px-8 flex items-center gap-2">
                            <span className="text-blue-400">#</span> Full Psychometric Report (DISC)
                        </h2>
                        <div className="bg-white rounded-2xl overflow-hidden text-slate-900 mx-8 shadow-xl">
                            <DiscResultReport result={candidate.discResult} candidate={{
                                name: candidate.fullName,
                                position: candidate.position,
                                date: candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Tanggal tidak tersedia'
                            }} />
                        </div>
                    </div>
                )}

                {/* Full Aptitude Report Section */}
                {candidate.aptitudeResult && (
                    <div className="mt-12 border-t border-white/10 pt-8 pb-12">
                        <h2 className="text-2xl font-display font-bold text-white mb-6 px-8 flex items-center gap-2">
                            <span className="text-blue-400">#</span> Aptitude Test Report (IQ)
                        </h2>
                        <div className="bg-white rounded-2xl overflow-hidden text-slate-900 mx-8 shadow-xl">
                            <AptitudeResultReport result={candidate.aptitudeResult} candidate={{
                                name: candidate.fullName,
                                position: candidate.position
                            }} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
