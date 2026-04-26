import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function OnboardingModule() {
    const { id } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem('onboardingToken');
    const headers = { 'Authorization': `Bearer ${token}` };
    const [mod, setMod] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expired, setExpired] = useState(false);

    useEffect(() => {
        if (!token) { navigate('/onboarding/login'); return; }
        fetchModule();
    }, [id]);

    const fetchModule = async () => {
        try {
            const res = await fetch(`/api/onboarding/modules/${id}`, { headers });
            if (res.status === 403) {
                const data = await res.json();
                if (data.expired) { setExpired(true); setError(data.error); }
                else setError(data.error);
            } else if (res.ok) {
                setMod(await res.json());
            } else {
                setError('Module tidak ditemukan');
            }
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Loading...</div>;

    if (error) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    {expired ? <span className="text-3xl">⏰</span> : <span className="text-3xl">❌</span>}
                </div>
                <h2 className="text-xl font-bold text-white mb-2">{expired ? 'Waktu Akses Habis' : 'Error'}</h2>
                <p className="text-slate-400 text-sm">{error}</p>
                <button onClick={() => navigate('/onboarding')} className="mt-4 px-6 py-2 bg-cyan-600 text-white rounded-xl">Kembali</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
                <button onClick={() => navigate('/onboarding')} className="text-slate-400 hover:text-white text-sm mb-4">&larr; Kembali</button>

                <div className="bg-slate-800/80 backdrop-blur rounded-2xl p-6 md:p-8 border border-white/10 mb-6">
                    <h1 className="text-2xl font-bold text-white mb-4">{mod.title}</h1>

                    {/* Text Content */}
                    {mod.content && (
                        <div className="prose prose-invert max-w-none mb-6">
                            <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{mod.content}</div>
                        </div>
                    )}

                    {/* Attachments */}
                    {mod.attachments && mod.attachments.length > 0 && (
                        <div className="space-y-3 mb-6">
                            <h3 className="text-sm font-semibold text-slate-400">📎 File & Link</h3>
                            {mod.attachments.map((a, i) => {
                                const isVideo = a.type === 'link' && (a.url?.includes('youtube') || a.url?.includes('youtu.be') || a.url?.includes('drive.google'));
                                const isPdf = a.type?.includes('pdf') || a.name?.endsWith('.pdf');

                                if (isVideo && a.url?.includes('drive.google')) {
                                    const fileId = a.url.match(/\/d\/([^/]+)/)?.[1] || a.url.match(/id=([^&]+)/)?.[1];
                                    return (
                                        <div key={i} className="bg-slate-900 rounded-xl border border-white/5 overflow-hidden">
                                            <div className="aspect-video">{fileId ? <iframe src={`https://drive.google.com/file/d/${fileId}/preview`} className="w-full h-full" allowFullScreen title={a.name} /> : <a href={a.url} target="_blank" className="p-4 text-cyan-400 hover:underline block">{a.name || a.url}</a>}</div>
                                        </div>
                                    );
                                }
                                if (isVideo && (a.url?.includes('youtube') || a.url?.includes('youtu.be'))) {
                                    const videoId = a.url.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1];
                                    return (
                                        <div key={i} className="bg-slate-900 rounded-xl border border-white/5 overflow-hidden">
                                            <div className="aspect-video">{videoId ? <iframe src={`https://www.youtube.com/embed/${videoId}`} className="w-full h-full" allowFullScreen title={a.name} /> : <a href={a.url} target="_blank" className="p-4 text-cyan-400">{a.url}</a>}</div>
                                        </div>
                                    );
                                }
                                if (isPdf) {
                                    return (
                                        <div key={i} className="bg-slate-900 rounded-xl border border-white/5 overflow-hidden">
                                            <iframe src={a.url} className="w-full h-[600px]" title={a.name} />
                                            <div className="p-3 border-t border-white/5"><a href={a.url} target="_blank" className="text-cyan-400 text-xs hover:underline">📄 {a.name} — Buka di tab baru</a></div>
                                        </div>
                                    );
                                }
                                return (
                                    <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-slate-900 rounded-xl p-3 border border-white/5 hover:border-cyan-500/20 transition">
                                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-sm">{a.type === 'link' ? '🔗' : '📄'}</div>
                                        <span className="text-cyan-400 text-sm">{a.name || a.url}</span>
                                    </a>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Post-Test Button */}
                <div className="text-center">
                    <button onClick={() => navigate(`/onboarding/test/${id}`)} className="px-8 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-xl transition shadow-lg shadow-violet-500/20 text-lg">
                        📝 Mulai Post-Test
                    </button>
                    <p className="text-slate-500 text-xs mt-2">Passing score: {mod.passing_score}%</p>
                </div>
            </div>
        </div>
    );
}
