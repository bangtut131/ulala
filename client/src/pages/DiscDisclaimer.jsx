import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function DiscDisclaimer() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isChecked, setIsChecked] = useState(false);
    const candidateId = location.state?.candidateId;

    const handleStart = () => {
        if (isChecked && candidateId) {
            navigate('/test-instruction', { state: { candidateId } });
        } else if (!candidateId) {
            alert("Error: Data kandidat tidak ditemukan. Silakan ulangi pengisian form.");
            navigate('/apply');
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-slate-900">
            {/* Dynamic Backgrounds (Consistent with other pages) */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-10 right-10 w-96 h-96 bg-gama-600/10 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div className="absolute bottom-10 left-10 w-80 h-80 bg-cyber-teal/10 rounded-full blur-[80px]"></div>
            </div>

            <div className="relative z-10 max-w-2xl w-full glass-dark rounded-3xl overflow-hidden border border-white/10 animate-fade-in-up shadow-2xl">

                {/* Header */}
                <div className="relative p-8 pb-6 overflow-hidden border-b border-white/5">
                    <div className="absolute inset-0 bg-gradient-to-r from-gama-900 to-slate-900 opacity-90"></div>
                    <div className="relative z-10 text-center">
                        <h2 className="text-sm md:text-base font-bold text-gama-400 tracking-[0.2em] uppercase mb-1">
                            Tes Kepribadian
                        </h2>
                        <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-wide">
                            Pernyataan Integritas
                        </h1>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5 text-slate-300 leading-relaxed text-justify">
                        <p>
                            "Saya menyatakan bahwa tes ini saya kerjakan secara pribadi dan mandiri tanpa bantuan orang lain dan alat apapun.
                            Jika kemudian saya diterima bekerja di perusahaan dan ditemukan ketidaksesuaian dengan pernyataan tersebut,
                            saya bersedia untuk mengundurkan diri dari perusahaan atau perusahaan berhak memutus hubungan kerja terhadap
                            saya tanpa kompensasi apapun."
                        </p>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-gama-500/10 rounded-xl border border-gama-500/20 hover:bg-gama-500/20 transition-colors cursor-pointer" onClick={() => setIsChecked(!isChecked)}>
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                className="peer h-6 w-6 cursor-pointer appearance-none rounded-md border-2 border-slate-500 transition-all checked:border-gama-500 checked:bg-gama-500 hover:border-gama-400"
                                checked={isChecked}
                                onChange={(e) => setIsChecked(e.target.checked)}
                            />
                            <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <label className="text-sm text-slate-200 cursor-pointer select-none pt-0.5">
                            Saya telah membaca, memahami, dan menyetujui pernyataan di atas dengan penuh kesadaran.
                        </label>
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={handleStart}
                            disabled={!isChecked}
                            className={`w-full py-4 rounded-xl font-bold text-lg tracking-wide transition-all duration-300 transform
                                ${isChecked
                                    ? 'bg-gradient-to-r from-gama-600 to-gama-500 text-white shadow-lg shadow-gama-500/30 hover:shadow-gama-500/50 hover:scale-[1.02]'
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                                }
                            `}
                        >
                            {isChecked ? 'Mulai Tes Kepribadian' : 'Setujui Pernyataan Untuk Melanjutkan'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
