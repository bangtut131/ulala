import React, { useState, useEffect } from 'react';
import { discQuestions } from '../data/discQuestions';
import { calculateScores, convertToGraphScale, determinePattern, getAnalysisText, calculateConsistency, getJobRecommendations, generateConclusion, checkValidity } from '../utils/discLogic';
import { useNavigate, useLocation } from 'react-router-dom';
import ProctorCamera from '../components/ProctorCamera';

export default function DiscTest() {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
    const navigate = useNavigate();

    const { state } = useLocation();
    const candidateId = state?.candidateId;

    // Timer Logic
    useEffect(() => {
        const STORAGE_KEY = 'disc_start_time';
        const DURATION = 15 * 60 * 1000; // 15 minutes in ms

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
                clearInterval(interval);
                handleAutoSubmit();
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

    const handleSelect = (questionId, category, value) => {
        setAnswers(prev => {
            const currentQuestionAnswers = prev[questionId] || {};
            const updates = { [category]: value };

            if (category === 'most' && currentQuestionAnswers.least === value) {
                updates.least = null;
            }
            if (category === 'least' && currentQuestionAnswers.most === value) {
                updates.most = null;
            }

            return {
                ...prev,
                [questionId]: { ...currentQuestionAnswers, ...updates }
            };
        });
    };



    const submitTest = async () => {
        if (submitting) return;
        setSubmitting(true);
        localStorage.removeItem('disc_start_time'); // Clear timer storage

        // 1. Calculate Results using new Logic
        const rawScores = calculateScores(answers);
        const graph1 = convertToGraphScale(rawScores.M, 'graph1');
        const graph2 = convertToGraphScale(rawScores.L, 'graph2');

        const pattern1 = determinePattern(graph1);
        const analysis1 = getAnalysisText(pattern1);

        const pattern2 = determinePattern(graph2);
        const analysis2 = getAnalysisText(pattern2);

        const consistency = calculateConsistency(graph1, graph2);
        const jobMatch = getJobRecommendations(pattern1);

        const conclusion = generateConclusion(
            { pattern: pattern1, analysis: analysis1 },
            { pattern: pattern2, analysis: analysis2 },
            consistency
        );

        const validity = checkValidity(graph2);

        const fullResult = {
            raw: rawScores,
            graph1,
            graph2,
            profile1: { pattern: pattern1, analysis: analysis1 },
            profile2: { pattern: pattern2, analysis: analysis2 },
            consistency,
            jobMatch,
            conclusion,
            validity
        };

        console.log("Full DISC Result:", fullResult);

        // Simple Mapping for Legacy Columns (dScore, etc uses Graph 1 or 2? Usually Graph 2 is Natural / "Real You", but companies often look at Graph 1 for "Work Mask". 
        // Let's use Graph 2 (Natural) for the main score columns as it represents the person, but maybe Graph 1 is better for "Current State".
        // The original tes-disc ResultReport uses Profile 1 "Adaptasi" and Profile 2 "Alami".
        // Let's store Graph 2 (Natural) in the main dScore/iScore columns for simple indexing, or Graph 1?
        // Let's stick to Natural (Graph 2) as the "True Profile" for the summary columns.
        const dScore = graph2.D;
        const iScore = graph2.I;
        const sScore = graph2.S;
        const cScore = graph2.C;
        const profile = pattern2.split(' #')[0]; // e.g. "Relater" (Natural)

        if (candidateId) {
            try {
                await fetch(`/api/candidates/${candidateId}/disc`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        candidateId,
                        dScore,
                        iScore,
                        sScore,
                        cScore,
                        profile,
                        answers,
                        fullResult // Send the detailed object
                    })
                });
            } catch (error) {
                console.error("Failed to submit DISC:", error);
            } finally {
                setSubmitting(false);
            }
        } else {
            console.warn("No Candidate ID found, skipping API save.");
        }

        navigate('/test-aptitude-disclaimer', { state: { candidateId } });
    };

    const handleAutoSubmit = () => {
        console.log("Time expired! Auto submitting...");
        submitTest();
    };

    const handleNext = async () => {
        if (currentQuestion < discQuestions.length - 1) {
            setCurrentQuestion(curr => curr + 1);
        } else {
            await submitTest();
        }
    };

    const question = discQuestions[currentQuestion];
    const currentAnswer = answers[question.id] || {};

    return (
        <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4 bg-slate-900">
            {candidateId && <ProctorCamera candidateId={candidateId} phase="disc_test" intervalMs={60000} />}

            {/* Dynamic Backgrounds */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gama-600/10 rounded-full blur-[120px] animate-pulse-slow"></div>
            </div>

            <div className="relative z-10 max-w-3xl w-full glass-dark rounded-3xl p-8 md:p-12 border border-white/5 animate-fade-in-up">

                {/* Header */}
                <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/5 pb-6">
                    <div>
                        <div className="text-sm font-bold text-gama-400 uppercase tracking-widest mb-2">Psychometric Assessment</div>
                        <h1 className="text-3xl font-display font-bold text-white">DISC Analysis</h1>
                        <p className="text-slate-400 mt-2 max-w-md">
                            Pilih satu kata yang <span className="text-gama-400">Paling (Most)</span> dan satu yang <span className="text-red-400">Kurang (Least)</span> menggambarkan diri Anda.
                        </p>
                    </div>

                    <div className="flex flex-col items-end">
                        {/* Timer Display */}
                        <div className={`text-2xl font-mono font-bold mb-2 ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                            {formatTime(timeLeft)}
                        </div>
                        <span className="text-5xl font-display font-bold text-white/10">{currentQuestion + 1}</span>
                        <span className="text-xs text-gama-500 uppercase tracking-wider">Question / {discQuestions.length}</span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
                    <div
                        className="h-full bg-gradient-to-r from-gama-500 to-cyber-lime transition-all duration-300 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                        style={{ width: `${((currentQuestion + 1) / discQuestions.length) * 100}%` }}
                    ></div>
                </div>

                <div className="grid grid-cols-1 gap-4 mb-10">
                    {question.options.map((opt, idx) => (
                        <div key={idx} className={`group relative flex flex-col md:flex-row items-start md:items-center justify-between p-5 rounded-2xl border transition-all duration-300 gap-4 md:gap-0 ${currentAnswer.most === opt.type || currentAnswer.least === opt.type
                            ? 'bg-slate-800/60 border-gama-500/30'
                            : 'bg-slate-800/30 border-white/5 hover:border-white/10 hover:bg-slate-800/50'
                            }`}>

                            <span className={`text-lg font-medium transition-colors w-full md:w-auto ${currentAnswer.most === opt.type ? 'text-gama-400' :
                                currentAnswer.least === opt.type ? 'text-red-400' : 'text-slate-300'
                                }`}>
                                {opt.word}
                            </span>

                            <div className="flex gap-8 relative z-10">
                                {/* MOST Option */}
                                <label className="flex flex-col items-center cursor-pointer group/most">
                                    <input
                                        type="radio"
                                        name={`most-${question.id}`}
                                        checked={currentAnswer.most === opt.type}
                                        onChange={() => handleSelect(question.id, 'most', opt.type)}
                                        className="hidden"
                                    />
                                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${currentAnswer.most === opt.type
                                        ? 'border-gama-500 bg-gama-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                                        : 'border-slate-600 bg-slate-900 group-hover/most:border-gama-400'
                                        }`}>
                                        {currentAnswer.most === opt.type && (
                                            <svg className="w-4 h-4 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                        )}
                                    </div>
                                    <span className={`text-[10px] uppercase font-bold mt-2 tracking-wider transition-colors ${currentAnswer.most === opt.type ? 'text-gama-400' : 'text-slate-600 group-hover/most:text-gama-400'
                                        }`}>Most</span>
                                </label>

                                {/* LEAST Option */}
                                <label className="flex flex-col items-center cursor-pointer group/least">
                                    <input
                                        type="radio"
                                        name={`least-${question.id}`}
                                        checked={currentAnswer.least === opt.type}
                                        onChange={() => handleSelect(question.id, 'least', opt.type)}
                                        className="hidden"
                                    />
                                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${currentAnswer.least === opt.type
                                        ? 'border-red-500 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                                        : 'border-slate-600 bg-slate-900 group-hover/least:border-red-400'
                                        }`}>
                                        {currentAnswer.least === opt.type && (
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        )}
                                    </div>
                                    <span className={`text-[10px] uppercase font-bold mt-2 tracking-wider transition-colors ${currentAnswer.least === opt.type ? 'text-red-500' : 'text-slate-600 group-hover/least:text-red-400'
                                        }`}>Least</span>
                                </label>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gama-500 animate-pulse"></div>
                        <span className="text-xs text-slate-400 uppercase tracking-widest">
                            AI Analysis Ready
                        </span>
                    </div>
                    <button
                        onClick={handleNext}
                        disabled={!currentAnswer.most || !currentAnswer.least || submitting}
                        className="btn-primary flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Processing...' : (currentQuestion === discQuestions.length - 1 ? 'Finish Assessment' : 'Next Question')}
                        {!submitting && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>}
                    </button>
                </div>
            </div>
        </div>
    );
}
