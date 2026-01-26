import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AptitudeInstruction() {
    const navigate = useNavigate();
    const location = useLocation();
    const candidateId = location.state?.candidateId;

    const handleStart = () => {
        if (candidateId) {
            navigate('/test-aptitude', { state: { candidateId } });
        } else {
            alert("Error: Data kandidat tidak ditemukan. Silakan ulangi pengisian form.");
            navigate('/apply');
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-slate-900">
            {/* Dynamic Backgrounds */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-10 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div className="absolute bottom-10 left-10 w-80 h-80 bg-purple-500/10 rounded-full blur-[80px]"></div>
            </div>

            <div className="relative z-10 max-w-2xl w-full glass-dark rounded-3xl overflow-hidden border border-white/10 animate-fade-in-up shadow-2xl">

                {/* Header */}
                <div className="relative p-8 pb-6 overflow-hidden border-b border-white/5">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-slate-900 opacity-90"></div>
                    <div className="relative z-10 text-center">
                        <h2 className="text-sm md:text-base font-bold text-blue-400 tracking-[0.2em] uppercase mb-1">
                            Persiapan Tes
                        </h2>
                        <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-wide">
                            Instruksi Pengerjaan
                        </h1>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    <div className="text-slate-300 space-y-6 leading-relaxed">
                        <p className="text-lg">
                            Tes ini bertujuan untuk mengukur kemampuan logika, verbal, dan pemecahan masalah Anda.
                            Pastikan Anda berada di tempat yang tenang dan nyaman.
                        </p>

                        <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5 space-y-4">
                            <h3 className="text-white font-bold text-lg mb-2">Penting untuk diperhatikan:</h3>
                            <ul className="list-disc pl-5 space-y-3 marker:text-blue-500">
                                <li>Tes terdiri dari <strong className="text-white">60 Soal</strong>.</li>
                                <li>Setiap soal memiliki tingkat kesulitan yang bervariasi (Verbal, Logika Gambar, Matematika Dasar).</li>
                                <li>Waktu pengerjaan tes adalah <strong className="text-white">30 Menit</strong>. Timer akan berjalan otomatis saat Anda memulai.</li>
                                <li>Anda <strong className="text-gama-400">DIPERBOLEHKAN</strong> menggunakan kertas dan alat tulis untuk mencoret-coret/menghitung.</li>
                                <li>Anda <strong className="text-red-400">DILARANG</strong> menggunakan kalkulator atau bantuan orang lain.</li>
                                <li>Tidak ada batas waktu ketat per soal, namun disarankan untuk bekerja seefisien mungkin.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            onClick={handleStart}
                            className="w-full py-4 rounded-xl font-bold text-lg tracking-wide bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3 group"
                        >
                            <span>Mulai Tes Sekarang</span>
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
