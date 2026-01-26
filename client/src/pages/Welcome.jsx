import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function Welcome() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4 bg-slate-900">

            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gama-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyber-lime/10 rounded-full blur-3xl animate-float"></div>
            </div>

            <div className="relative z-10 max-w-4xl w-full">
                <div className="glass rounded-3xl p-8 md:p-16 text-center animate-fade-in-up border-t border-white/20">

                    <div className="mb-12 relative flex justify-center">
                        {/* Integrated Glow/Nebula effect behind logo */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gama-500/20 rounded-full blur-3xl animate-pulse-slow"></div>

                        {/* Floating Logo */}
                        <img
                            src={logo}
                            alt="Company Logo"
                            className="h-32 md:h-40 object-contain relative z-10 drop-shadow-[0_0_25px_rgba(34,197,94,0.4)] animate-float rounded-3xl"
                        />
                    </div>

                    <div className="space-y-6 mb-12">
                        <div className="mb-6">
                            <h1 className="text-4xl md:text-6xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gama-100 to-gama-400 tracking-tight mb-2">
                                Future of Agro
                            </h1>
                            <p className="text-gama-300 text-sm tracking-[0.2em] uppercase font-bold">
                                Digital Transformation
                            </p>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-6 border border-white/5 backdrop-blur-sm">
                            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
                                Selamat Datang
                            </h2>
                            <p className="text-slate-300 leading-relaxed text-sm md:text-base mb-4">
                                Terima kasih atas ketersediaan waktu Anda untuk mengikuti proses screening awal calon karyawan
                                <span className="text-gama-400 font-semibold"> PT. Gama Agro Sejati</span>.
                            </p>
                            <p className="text-slate-400 text-xs md:text-sm mb-2">
                                Proses ini akan mencakup pengisian data diri, upload CV, dan tes kepribadian singkat, dan psikotest lengkap.
                            </p>
                            <p className="text-gama-400 text-xs md:text-sm italic font-medium">
                                Proses screening awal ini membutuhkan waktu kurang lebih 60 menit. bisa dipersiapkan alat tulis jika nanti diperlukan selama proses screening berjalan
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                        <div className="p-[1px] rounded-xl bg-gradient-to-r from-gama-400 to-cyber-lime">
                            <button
                                onClick={() => navigate('/apply/form', { state: location.state })}
                                className="px-10 py-4 bg-slate-900 rounded-[10px] text-white font-bold text-lg hover:bg-slate-800 transition-all duration-300 flex items-center gap-3 group"
                            >
                                Mulai Screening
                                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform text-gama-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                            </button>
                        </div>
                    </div>

                    <div className="mt-16 grid grid-cols-3 gap-4 text-center border-t border-white/5 pt-8">
                        <div>
                            <div className="text-2xl font-display font-bold text-white">Digital</div>
                            <div className="text-xs text-gama-300 uppercase tracking-widest">Process</div>
                        </div>
                        <div className="border-x border-white/5">
                            <div className="text-2xl font-display font-bold text-white">AI</div>
                            <div className="text-xs text-gama-300 uppercase tracking-widest">Powered</div>
                        </div>
                        <div>
                            <div className="text-2xl font-display font-bold text-white">Fast</div>
                            <div className="text-xs text-gama-300 uppercase tracking-widest">Results</div>
                        </div>
                    </div>

                </div>
            </div>

            <footer className="mt-8 text-slate-500 text-sm font-mono z-10">
                &copy; 2025 PT. Gama Agro Sejati • HR Division
            </footer>
        </div>
    );
}
