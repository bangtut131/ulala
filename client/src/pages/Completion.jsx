import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Completion() {
    const navigate = useNavigate();
    const location = useLocation();
    const candidateId = location.state?.candidateId;

    useEffect(() => {
        if (candidateId) {
            // FIRE AND FORGET (SILENT)
            // We initiate the analysis but don't force the user to wait for it visually.
            // If they stay on the page for ~5-10s, it completes reliably.
            // If they close immediately, the "Regenerate" button in Admin is the fallback.
            console.log("Triggering silent analysis...");
            fetch(`/api/candidates/${candidateId}/analyze`, {
                method: 'POST'
            }).catch(err => console.error("Silent analysis failed (tab closed?):", err));
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
                    <div className="absolute inset-0 bg-gama-500 rounded-full blur-xl animate-pulse-slow opacity-50"></div>
                    <div className="relative h-full w-full bg-slate-900 rounded-full border-2 border-gama-500 flex items-center justify-center shadow-lg">
                        <svg className="h-10 w-10 text-gama-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>

                <h1 className="text-4xl font-display font-bold text-white mb-2">Success!</h1>
                <p className="text-gama-400 font-medium tracking-wide uppercase text-sm mb-6">Assessment Completed</p>

                <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto mb-6"></div>

                <p className="text-slate-300 mb-10 leading-relaxed font-light">
                    Terima kasih telah melengkapi data dan mengikuti tes assessment.
                    <br /><br />
                    Tim HRD <strong className="text-white font-semibold">PT. Gama Agro Sejati</strong> akan segera mereview profil Anda dengan bantuan AI Engine kami.
                </p>

                <button
                    onClick={() => navigate('/')}
                    className="btn-primary w-full shadow-xl shadow-gama-500/20"
                >
                    Kembali ke Beranda
                </button>
            </div>
        </div>
    );
}
