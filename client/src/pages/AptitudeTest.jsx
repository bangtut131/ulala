import React, { useState, useEffect } from 'react';
import aptitudeQuestions from '../data/aptitudeQuestions.json';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AptitudeTest() {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // { questionId: "A" }
    const [submitting, setSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes in seconds

    const navigate = useNavigate();
    const location = useLocation();
    const candidateId = location.state?.candidateId;

    const question = aptitudeQuestions.questions[currentQuestionIndex];
    const totalQuestions = aptitudeQuestions.questions.length;

    // Timer Logic
    useEffect(() => {
        const STORAGE_KEY = 'aptitude_start_time';
        const DURATION = 30 * 60 * 1000; // 30 minutes in ms

        // Initialize or get start time
        let startTime = localStorage.getItem(STORAGE_KEY);
        if (!startTime) {
            startTime = Date.now().toString();
            localStorage.setItem(STORAGE_KEY, startTime);
        }

        const interval = setInterval(() => {
            const elapsed = Date.now() - parseInt(startTime, 10);
            const remaining = Math.max(0, Math.ceil((DURATION - elapsed) / 1000));

            setTimeLeft(remaining);

            if (remaining <= 0) {
                // Time up!
                clearInterval(interval);
                // We use a ref or just call a function that doesn't rely on stale closures
                // But simplified here since we can likely trigger simple auto submit
                document.getElementById('auto-submit-trigger')?.click();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Format time for display
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Optional: Auto-scroll to top when question changes
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [currentQuestionIndex]);

    const handleOptionSelect = (option) => {
        // Extract just the letter or value?
        // The data options formats vary: "Beruang" or "(a)".
        // The correct answer in JSON is usually the full string value like "Ular" or "(d)".
        // So we store the full option string.
        setAnswers(prev => ({
            ...prev,
            [question.id]: option
        }));
    };

    const handleNext = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(curr => curr + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(curr => curr - 1);
        }
    };

    const submitTestLogic = async (isAuto = false) => {
        if (submitting) return; // Prevent double submit
        setSubmitting(true);
        localStorage.removeItem('aptitude_start_time'); // Clear timer

        // Scoring Logic
        let correctCount = 0;
        aptitudeQuestions.questions.forEach(q => {
            if (answers[q.id] === q.correct) {
                correctCount++;
            }
        });

        // Scoring Logic: +3 for correct, 0 for incorrect/unanswered
        // Request: setiap jawaban benar = +3, setiap jawaban salah = 0
        let score = correctCount * 3;

        console.log(`Scoring: ${correctCount}/${totalQuestions} -> Score ${score} (Logic: Correct * 3)`);

        if (candidateId) {
            try {
                await fetch(`/api/candidates/${candidateId}/aptitude`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        score,
                        correctCount,
                        totalCount: totalQuestions,
                        answers
                    })
                });
            } catch (error) {
                console.error("Failed to submit Aptitude Result:", error);
                if (!isAuto) alert("Terjadi kesalahan koneksi. Hasil akan dicoba dikirim ulang.");
            }
        }

        navigate('/complete');
    }

    const handleSubmit = async () => {
        if (!window.confirm('Apakah anda yakin ingin menyelesaikan tes? Pastikan semua soal yang bisa anda kerjakan telah terjawab.')) return;
        submitTestLogic();
    };

    const handleAutoSubmit = () => {
        console.log("Time expired! Auto submitting...");
        submitTestLogic(true);
    };

    const isAnswered = (index) => {
        const qId = aptitudeQuestions.questions[index].id;
        return !!answers[qId];
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col font-sans text-slate-200">
            {/* Hidden Button for Auto Trigger to avoid closure issues in setInterval */}
            <button id="auto-submit-trigger" onClick={handleAutoSubmit} className="hidden"></button>

            {/* Header / Progress */}
            <div className="bg-slate-800/80 backdrop-blur-md sticky top-0 z-20 border-b border-white/5 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-white">Tes Potensi Akademik</h2>
                        <div className="text-xs text-blue-400 font-mono tracking-wider">SOAL {currentQuestionIndex + 1} DARI {totalQuestions}</div>
                    </div>

                    {/* Timer Display */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block">
                        <div className={`text-2xl font-mono font-bold ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                            {formatTime(timeLeft)}
                        </div>
                    </div>

                    <div className="text-right flex items-center gap-4">
                        {/* Mobile Timer */}
                        <div className={`md:hidden font-mono font-bold ${timeLeft < 300 ? 'text-red-500' : 'text-white'}`}>
                            {formatTime(timeLeft)}
                        </div>

                        <div className="text-sm font-medium text-slate-400 hidden sm:block">
                            Terjawab: <span className="text-white font-bold">{Object.keys(answers).length}</span>
                        </div>
                    </div>
                </div>
                {/* Progress Bar */}
                <div className="h-1 bg-slate-700 w-full relative">
                    <div
                        className="h-full bg-blue-500 transition-all duration-300 absolute left-0 top-0"
                        style={{ width: `${((Object.keys(answers).length) / totalQuestions) * 100}%` }}
                    ></div>
                    <div
                        className="h-full bg-white/20 transition-all duration-300 absolute left-0 top-0"
                        style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                    ></div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 container mx-auto p-4 md:p-8 max-w-6xl flex gap-8 flex-col lg:flex-row items-start">

                {/* Question Area */}
                <div className="flex-1 w-full bg-slate-800/50 rounded-2xl border border-white/10 p-6 md:p-10 shadow-2xl relative min-h-[500px] flex flex-col">

                    <div className="flex-1 mb-8">
                        <div className="prose prose-invert prose-lg max-w-none">
                            <h3 className="text-xl md:text-2xl font-medium text-white mb-8 whitespace-pre-wrap leading-relaxed">
                                {question.text}
                            </h3>
                        </div>

                        {question.sheetImage && (
                            <div className="mb-8 p-4 bg-white rounded-xl border-4 border-slate-700 text-center relative group">
                                <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">Gambar Soal (Lihat Referensi)</div>
                                <img
                                    src={question.sheetImage}
                                    alt="Reference Problem"
                                    className="max-w-full max-h-[400px] mx-auto object-contain"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.style.display = 'none';
                                        e.target.parentNode.innerHTML += '<p class="text-red-400 py-10">Gambar tidak ditemukan. Lewati jika perlu.</p>';
                                    }}
                                />
                            </div>
                        )}

                        <div className="grid gap-3">
                            {question.options.map((option, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleOptionSelect(option)}
                                    className={`relative flex items-center px-6 py-5 rounded-xl border transition-all duration-200 group text-left
                                        ${answers[question.id] === option
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/50 transform scale-[1.01]'
                                            : 'bg-slate-900 border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-slate-300'
                                        }`}
                                >
                                    <span className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center mr-4 text-sm font-bold border transition-colors
                                        ${answers[question.id] === option
                                            ? 'bg-white text-blue-600 border-white'
                                            : 'bg-transparent text-slate-500 border-slate-600 group-hover:border-slate-400 group-hover:text-slate-300'
                                        }`}>
                                        {String.fromCharCode(65 + idx)}
                                    </span>
                                    <span className="text-lg font-medium">{option}</span>

                                    {answers[question.id] === option && (
                                        <div className="absolute right-4 text-white">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-8 border-t border-white/5 mt-auto">
                        <button
                            onClick={handlePrev}
                            disabled={currentQuestionIndex === 0}
                            className={`px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 ${currentQuestionIndex === 0
                                ? 'text-slate-600 cursor-not-allowed'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            &larr; Sebelumnya
                        </button>

                        {currentQuestionIndex === totalQuestions - 1 ? (
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg hover:shadow-green-500/20 transition transform hover:-translate-y-0.5 flex items-center gap-2"
                            >
                                {submitting ? 'Mengirim...' : 'Selesaikan Tes'}
                                {!submitting && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>}
                            </button>
                        ) : (
                            <button
                                onClick={handleNext}
                                className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg hover:shadow-blue-500/20 transition transform hover:-translate-y-0.5 flex items-center gap-2"
                            >
                                Selanjutnya &rarr;
                            </button>
                        )}
                    </div>
                </div>

                {/* Sidebar Navigation */}
                <div className="w-full lg:w-80 shrink-0">
                    <div className="bg-slate-800/80 backdrop-blur rounded-xl border border-white/10 p-5 sticky top-24 shadow-xl">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex justify-between items-center">
                            Navigasi
                            <span className="bg-slate-700 text-white px-2 py-0.5 rounded text-[10px]">{Math.round((Object.keys(answers).length / totalQuestions) * 100)}% Done</span>
                        </h4>
                        <div className="grid grid-cols-5 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                            {aptitudeQuestions.questions.map((q, idx) => (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentQuestionIndex(idx)}
                                    className={`aspect-square rounded-lg text-xs font-bold transition-all relative
                                        ${currentQuestionIndex === idx
                                            ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-800 bg-slate-700 text-white z-10'
                                            : isAnswered(idx)
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                                                : 'bg-slate-900/50 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                                        }`}
                                >
                                    {idx + 1}
                                    {isAnswered(idx) && (
                                        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/5 space-y-2">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <div className="w-3 h-3 bg-blue-600 rounded"></div> Terjawab
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <div className="w-3 h-3 bg-slate-900/50 border border-slate-700 rounded"></div> Belum Dijawab
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <div className="w-3 h-3 bg-slate-700 ring-1 ring-blue-500 rounded"></div> Sedang Dikerjakan
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
