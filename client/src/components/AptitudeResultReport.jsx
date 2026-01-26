import React from 'react';
import quizData from '../data/aptitudeQuestions.json';

const AptitudeResultReport = ({ result, candidate }) => {
    const { questions, scoring } = quizData;
    const date = new Date(result.createdAt || new Date()).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Parse answers if stored as string
    let userAnswers = {};
    try {
        if (result.answers) {
            userAnswers = typeof result.answers === 'string' ? JSON.parse(result.answers) : result.answers;
        }
    } catch (e) {
        console.error("Error parsing answers:", e);
    }

    // Split questions into two columns (1-30, 31-60)
    const col1 = questions.slice(0, 30);
    const col2 = questions.slice(30, 60);

    // IQ Category
    // Logic from original: Correct * 3 = Score? Wait, data.json has conversion table but componentResultReport has manual calculation lines 21-23.
    // Line 23 of original: const iqScore = rawScore * 3;
    // BUT our AptitudeTest.jsx uses: const conversionTable = aptitudeQuestions.scoring.conversionTable;
    // Let's use the SCORE passed in the result object since that was calculated at submission time using the conversion table (which is more accurate/intended).

    // Correction: The original code showed `const iqScore = rawScore * 3`.
    // However, our migration used the conversion table from `quizData.json`.
    // We should trust `result.score` which is saved in DB.

    const score = result.score;
    const category = scoring.categories.find(cat =>
        score >= cat.min && (cat.max ? score <= cat.max : true)
    ) || { label: "Unknown" };


    const StatusRow = ({ question }) => {
        const userAnswer = userAnswers[question.id];
        const isCorrect = userAnswer === question.correct;
        return (
            <tr key={question.id} className="border-b border-gray-300 text-sm hover:bg-slate-50">
                <td className="py-2 px-2 text-center border-r border-gray-300 font-mono text-slate-500">{question.id}</td>
                <td className="py-2 px-2 text-center border-r border-gray-300 font-medium text-slate-800">
                    {userAnswer ? (userAnswer.length > 20 ? userAnswer.substring(0, 20) + '...' : userAnswer) : '-'}
                </td>
                <td className={`py-2 px-2 text-center font-bold ${isCorrect ? 'text-green-600' : 'text-slate-300'}`}>
                    {isCorrect ? 'OK' : '-'}
                </td>
            </tr>
        );
    };

    return (
        <div className="bg-white p-8 font-sans text-gray-900 border border-slate-200">

            {/* Header Info */}
            <div className="border-b-2 border-slate-800 pb-4 mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4 text-sm md:text-base">
                <div className="flex flex-col gap-1">
                    <div className="font-bold text-lg text-slate-900">{candidate.name}</div>
                    <div className="text-slate-600 flex gap-4">
                        <span>{candidate.position}</span>
                    </div>
                </div>
                <div className="font-bold text-slate-600">{date}</div>
            </div>

            {/* Score Box */}
            <div className="border border-blue-900 bg-blue-50/50 p-6 mb-8 text-center max-w-4xl mx-auto shadow-sm rounded-lg">
                <div className="text-blue-900 text-sm font-bold uppercase tracking-wider mb-2">Aptitude Score (IQ Estimate)</div>
                <div className="flex items-center justify-center gap-3">
                    <div className="text-blue-800 text-5xl font-extrabold tracking-tight">
                        {score}
                    </div>
                    <div className="text-left border-l border-blue-200 pl-3">
                        <div className="text-blue-900 font-bold text-lg">{category.label} {category.label.includes('Superior') ? '⭐' : ''}</div>
                        <div className="text-blue-600 text-xs">Based on {result.correctCount} correct answers</div>
                    </div>
                </div>
            </div>

            {/* Answer Table */}
            <h3 className="text-center font-bold text-slate-500 uppercase tracking-widest text-xs mb-4">Detailed Answer Sheet</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {/* Column 1 */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                        <thead className="bg-slate-100">
                            <tr className="border-b border-gray-300 text-xs uppercase tracking-wider">
                                <th className="py-2 px-2 border-r border-gray-300 w-10 font-bold text-slate-600">No.</th>
                                <th className="py-2 px-2 border-r border-gray-300 font-bold text-slate-600">Jawaban</th>
                                <th className="py-2 px-2 w-16 font-bold text-slate-600">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {col1.map(q => <StatusRow key={q.id} question={q} />)}
                        </tbody>
                    </table>
                </div>

                {/* Column 2 */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                        <thead className="bg-slate-100">
                            <tr className="border-b border-gray-300 text-xs uppercase tracking-wider">
                                <th className="py-2 px-2 border-r border-gray-300 w-10 font-bold text-slate-600">No.</th>
                                <th className="py-2 px-2 border-r border-gray-300 font-bold text-slate-600">Jawaban</th>
                                <th className="py-2 px-2 w-16 font-bold text-slate-600">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {col2.map(q => <StatusRow key={q.id} question={q} />)}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-center text-slate-500 italic max-w-lg mx-auto">
                *Interpretasi skor IQ bersifat estimasi berdasarkan jumlah jawaban benar dalam tes logika, verbal, dan numerik ini. Nilai &gt;110 dikategorikan di atas rata-rata.
            </div>

        </div>
    );
};

export default AptitudeResultReport;
