import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function OnboardingTest() {
    const { id } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem('onboardingToken');
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [alreadyDone, setAlreadyDone] = useState(false);
    const [prevPassed, setPrevPassed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (!token) { navigate('/onboarding/login'); return; }
        fetchTest();
    }, [id]);

    const fetchTest = async () => {
        try {
            const res = await fetch(`/api/onboarding/modules/${id}/test`, { headers });
            if (res.status === 403) {
                const data = await res.json();
                setAlreadyDone(true);
                setPrevPassed(data.passed);
                setError(data.error);
            } else if (res.ok) {
                const data = await res.json();
                setQuestions(data);
            } else {
                setError('Gagal mengambil soal');
            }
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    const handleAnswer = (qId, answer) => {
        setAnswers(prev => ({ ...prev, [String(qId)]: answer }));
    };

    const handleSubmit = async () => {
        if (Object.keys(answers).length < questions.length) {
            if (!confirm(`Anda baru menjawab ${Object.keys(answers).length} dari ${questions.length} soal. Yakin submit?`)) return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`/api/onboarding/modules/${id}/submit`, {
                method: 'POST', headers, body: JSON.stringify({ answers })
            });
            const data = await res.json();
            if (res.ok) { setResult(data); }
            else { alert(data.error || 'Gagal submit'); }
        } catch (e) { alert('Error: ' + e.message); }
        finally { setSubmitting(false); }
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Loading soal...</div>;

    // Already attempted
    if (alreadyDone) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${prevPassed ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                    <span className="text-4xl">{prevPassed ? '✅' : '⏳'}</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{prevPassed ? 'Sudah Lulus!' : 'Test Sudah Dikerjakan'}</h2>
                <p className="text-slate-400 text-sm">{prevPassed ? 'Anda sudah lulus post-test ini.' : 'Hubungi HR untuk mengajukan retake test.'}</p>
                <button onClick={() => navigate('/onboarding')} className="mt-6 px-6 py-2 bg-cyan-600 text-white rounded-xl">Kembali</button>
            </div>
        </div>
    );

    // Result screen
    if (result) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${result.passed ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                    <span className="text-5xl">{result.passed ? '🎉' : '😔'}</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">{result.passed ? 'Selamat, Lulus!' : 'Belum Lulus'}</h2>
                <div className="bg-slate-800 rounded-2xl p-6 border border-white/10 mt-4 space-y-3">
                    <div className="text-4xl font-bold text-white">{result.score}%</div>
                    <p className="text-slate-400 text-sm">Benar: {result.correct} dari {result.total} soal</p>
                    <p className="text-slate-500 text-xs">Passing Score: {result.passingScore}%</p>
                    {!result.passed && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mt-4">
                            <p className="text-amber-300 text-sm">Hubungi HR untuk mengajukan retake test.</p>
                        </div>
                    )}
                </div>
                <button onClick={() => navigate('/onboarding')} className="mt-6 px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition">Kembali ke Portal</button>
            </div>
        </div>
    );

    // Test form
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => { if (confirm('Yakin keluar? Jawaban tidak akan disimpan.')) navigate('/onboarding'); }} className="text-slate-400 hover:text-white text-sm">&larr; Batal</button>
                    <span className="text-slate-400 text-sm">{Object.keys(answers).length}/{questions.length} terjawab</span>
                </div>

                <div className="bg-slate-800/80 backdrop-blur rounded-2xl p-6 border border-white/10 mb-6">
                    <h1 className="text-xl font-bold text-white mb-1">📝 Post-Test</h1>
                    <p className="text-slate-400 text-sm mb-6">Jawab semua pertanyaan. Test hanya bisa dikerjakan 1x.</p>

                    <div className="space-y-6">
                        {questions.map((q, i) => (
                            <div key={q.id} className="border-b border-white/5 pb-6">
                                <p className="text-white font-medium mb-3">{i + 1}. {q.question}</p>
                                <div className="space-y-2">
                                    {['a', 'b', 'c', 'd'].filter(k => q[`option_${k}`]).map(k => (
                                        <label key={k} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition border ${answers[String(q.id)] === k ? 'bg-violet-600/20 border-violet-500/40 text-white' : 'bg-slate-900 border-white/5 text-slate-300 hover:border-white/20'}`}>
                                            <input type="radio" name={`q-${q.id}`} value={k} checked={answers[String(q.id)] === k} onChange={() => handleAnswer(q.id, k)} className="sr-only" />
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${answers[String(q.id)] === k ? 'border-violet-500 bg-violet-500' : 'border-slate-600'}`}>
                                                {answers[String(q.id)] === k && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                            </div>
                                            <span className="text-sm"><span className="font-bold uppercase mr-1">{k}.</span> {q[`option_${k}`]}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <button onClick={handleSubmit} disabled={submitting} className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-xl transition shadow-lg shadow-violet-500/20 disabled:opacity-50">
                    {submitting ? 'Mengirim...' : `Submit Jawaban (${Object.keys(answers).length}/${questions.length})`}
                </button>
            </div>
        </div>
    );
}
