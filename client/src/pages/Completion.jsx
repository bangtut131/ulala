import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Completion() {
    const navigate = useNavigate();
    const location = useLocation();
    const [status, setStatus] = useState('idle'); // idle, analyzing, done, error
    const candidateId = location.state?.candidateId;

    useEffect(() => {
        if (candidateId) {
            setStatus('analyzing');
            // Trigger Synchronous Analysis
            fetch(`/api/candidates/${candidateId}/analyze`, {
                method: 'POST'
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setStatus('done');
                    } else {
                        console.error("Analysis Error:", data.error);
                        setStatus('error'); // Soft error, still show success message but maybe log it
                    }
                })
                .catch(err => {
                    console.error("Analysis Network Error:", err);
                    setStatus('error');
                });
        } else {
            // No ID passed, maybe direct access? Just show done.
            setStatus('done');
        }
    }, [candidateId]);

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
            {/* Dynamic Backgrounds */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gama-600/20 rounded-full blur-[100px] animate-pulse-slow"></div>
            </div>

            <div className="relative z-10 max-w-md w-full glass-dark rounded-3xl p-10 text-center animate-fade-in-up border border-white/10 shadow-2xl">

                <div className="relative mx-auto h-24 w-24 mb-8">
                    {/* Status Icons */}
                    {status === 'analyzing' && (
                        <>
                            <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl animate-pulse opacity-50"></div>
                            <div className="relative h-full w-full bg-slate-900 rounded-full border-2 border-blue-500 flex items-center justify-center shadow-lg">
                                <addClass className="animate-spin text-blue-400 h-10 w-10" viewBox="0 0 24 24">
                                    {/* Simple spinner svg */}
                                    <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </addClass>
                            </div>
                        </>
                    )}

                    {(status === 'done' || status === 'error' || status === 'idle') && (
                        <>
                            <div className="absolute inset-0 bg-gama-500 rounded-full blur-xl animate-pulse-slow opacity-50"></div>
                            <div className="relative h-full w-full bg-slate-900 rounded-full border-2 border-gama-500 flex items-center justify-center shadow-lg">
                                <svg className="h-10 w-10 text-gama-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </>
                    )}
                </div>

                {status === 'analyzing' ? (
                    <>
                        <h1 className="text-2xl font-display font-bold text-white mb-2">Memproses Hasil...</h1>
                        <p className="text-slate-400 font-medium text-sm mb-6 animate-pulse">Mohon jangan tutup halaman ini.</p>
                        <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden mb-6">
                            <div className="h-full bg-blue-500 animate-progress"></div>
                        </div>
                    </>
                ) : (
                    <>
                        <h1 className="text-4xl font-display font-bold text-white mb-2">Success!</h1>
                        <p className="text-gama-400 font-medium tracking-wide uppercase text-sm mb-6">Assessment Completed</p>
                    </>
                )}

                <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto mb-6"></div>

                <p className="text-slate-300 mb-10 leading-relaxed font-light">
                    {status === 'analyzing'
                        ? "AI sedang menganalisa profil dan hasil tes Anda untuk membuat laporan komprehensif."
                        : "Terima kasih telah melengkapi data dan mengikuti tes assessment. Tim HRD PT. Gama Agro Sejati akan segera mereview profil Anda."
                    }
                </p>

                {status !== 'analyzing' && (
                    <button
                        onClick={() => navigate('/')}
                        className="btn-primary w-full shadow-xl shadow-gama-500/20"
                    >
                        Kembali ke Beranda
                    </button>
                )}
            </div>
        </div>
    );
}
