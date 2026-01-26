import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function DiscInstruction() {
    const navigate = useNavigate();
    const location = useLocation();
    const candidateId = location.state?.candidateId;

    const handleStart = () => {
        if (candidateId) {
            navigate('/test', { state: { candidateId } });
        } else {
            alert("Error: Data kandidat tidak ditemukan. Silakan ulangi pengisian form.");
            navigate('/apply');
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-slate-900">
            {/* Dynamic Backgrounds */}
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
                            Tes Kepribadian (DISC) ini dirancang untuk memahami gaya perilaku Anda dalam lingkungan kerja.
                            Tidak ada jawaban <strong>benar</strong> atau <strong>salah</strong>.
                        </p>

                        <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5 space-y-4">
                            <h3 className="text-white font-bold text-lg mb-2">Petunjuk Pengisian:</h3>
                            <ul className="list-disc pl-5 space-y-2 marker:text-gama-500">
                                <li>Tes ini terdiri dari <strong className="text-white">24 nomor</strong>.</li>
                                <li>Setiap nomor memiliki 4 pilihan kata sifat.</li>
                                <li>Pilih <strong className="text-gama-400">SATU</strong> kata yang <strong className="text-gama-400">PALING</strong> menggambarkan diri Anda (Kolom Most/Paling).</li>
                                <li>Pilih <strong className="text-red-400">SATU</strong> kata yang <strong className="text-red-400">PALING TIDAK</strong> menggambarkan diri Anda (Kolom Least/Kurang).</li>
                                <li>Jawablah dengan <strong>jujur</strong> dan <strong>spontan</strong>. Jangan terlalu lama berpikir untuk setiap jawaban.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            onClick={handleStart}
                            className="w-full py-4 rounded-xl font-bold text-lg tracking-wide bg-gradient-to-r from-gama-600 to-gama-500 text-white shadow-lg shadow-gama-500/30 hover:shadow-gama-500/50 hover:scale-[1.02] transition-all duration-300"
                        >
                            Mulai Tes Sekarang
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
