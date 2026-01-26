import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { evaluateJobFit } from '../utils/discLogic';

export default function DiscResultReport({ result, candidate }) {
    // Graceful fallback if fullResult is missing (legacy data)
    if (!result || !result.fullResult || !result.fullResult.graph1) {
        return (
            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg">
                <p>Detailed Report not available for this candidate (Legacy Data).</p>
                <p>Profile: {result?.profile || 'N/A'}</p>
            </div>
        );
    }

    const { graph1, graph2, profile1, profile2, consistency, jobMatch, conclusion, validity } = result.fullResult;

    // Use current position if available, or fallback
    const position = candidate?.position || 'Candidate';
    const jobEvaluation = evaluateJobFit(profile1.pattern, position);

    // Defensive date parsing
    let dateStr = candidate?.date;
    if (!dateStr || dateStr === 'Invalid Date') {
        dateStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    const data1 = [
        { name: 'D', value: graph1.D },
        { name: 'I', value: graph1.I },
        { name: 'S', value: graph1.S },
        { name: 'C', value: graph1.C },
    ];

    const data2 = [
        { name: 'D', value: graph2.D },
        { name: 'I', value: graph2.I },
        { name: 'S', value: graph2.S },
        { name: 'C', value: graph2.C },
    ];

    const CustomDot = (props) => {
        const { cx, cy, payload } = props;
        return (
            <circle cx={cx} cy={cy} r={5} fill="#0ea5e9" stroke="white" strokeWidth={2} />
        );
    };

    const getPrimaryTrait = (graph) => {
        const scores = Object.entries(graph).sort((a, b) => b[1] - a[1]);
        return `${scores[0][0]} Tinggi`;
    };

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 bg-white text-slate-900 font-sans" id="printable-area">
            {/* Validity Warning Banner */}
            {validity && !validity.isValid && (
                <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="text-red-600 font-bold text-lg uppercase tracking-wide">
                            ⚠️ Peringatan Validitas: {validity.title}
                        </div>
                    </div>
                    <p className="mt-2 text-red-800 text-sm">
                        {validity.description}
                    </p>
                </div>
            )}

            {/* Header */}
            <div className="border-b-2 border-black pb-4 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end font-bold text-lg gap-2">
                <div>Nama: <span className="font-normal">{candidate.name}</span></div>
                <div>Posisi: <span className="font-normal">{candidate.position}</span></div>
                <div>Tanggal: <span className="font-normal">{dateStr}</span></div>
            </div>

            {/* 1. GRAPHS ROW (Side-by-Side) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-8">
                {/* Graph 1 */}
                <div>
                    <h3 className="font-bold mb-1 text-sm">Grafik 1: Adaptasi (Pekerjaan/Kantor)</h3>
                    <p className="text-sm font-semibold mb-4 text-gray-600">Respons Terhadap Lingkungan</p>
                    <div className="h-64 w-full border border-gray-400 p-2">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                            <LineChart data={data1} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} padding={{ left: 20, right: 20 }} />
                                <YAxis domain={[0, 100]} hide={false} axisLine={false} tickLine={false} ticks={[0, 50, 100]} />
                                <ReferenceLine y={50} stroke="#9ca3af" strokeDasharray="3 3" />
                                <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={3} dot={<CustomDot />} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Graph 2 */}
                <div>
                    <h3 className="font-bold mb-1 text-sm">Grafik 2: Alami (Sehari-hari/Rumah)</h3>
                    <p className="text-sm font-semibold mb-4 text-gray-600">Perilaku Dasar</p>
                    <div className="h-64 w-full border border-gray-400 p-2">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                            <LineChart data={data2} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} padding={{ left: 20, right: 20 }} />
                                <YAxis domain={[0, 100]} hide={false} axisLine={false} tickLine={false} ticks={[0, 50, 100]} />
                                <ReferenceLine y={50} stroke="#9ca3af" strokeDasharray="3 3" />
                                <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={3} dot={<CustomDot />} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 2. HIGHEST POINT (PROFILE) ROW (Side-by-Side, below graphs) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-8">
                {/* Profile Box 1 */}
                <div>
                    <h4 className="text-sm font-bold text-gray-700">Titik Paling Tinggi pada Grafik 1</h4>
                    <p className="text-sm text-gray-600 mb-2">Perilaku "Adaptasi" Anda adalah</p>
                    <div className="border border-gray-400">
                        <div className="bg-gray-50 p-2 font-bold text-center border-b border-gray-300">
                            {profile1.pattern}
                        </div>
                        <div className="p-2 font-bold text-center text-blue-800">
                            {getPrimaryTrait(graph1)}
                        </div>
                    </div>
                </div>

                {/* Profile Box 2 */}
                <div>
                    <h4 className="text-sm font-bold text-gray-700">Titik Paling Tinggi pada Grafik 2</h4>
                    <p className="text-sm text-gray-600 mb-2">Perilaku "Alami" Anda adalah</p>
                    <div className="border border-gray-400">
                        <div className="bg-gray-50 p-2 font-bold text-center border-b border-gray-300">
                            {profile2.pattern}
                        </div>
                        <div className="p-2 font-bold text-center text-blue-800">
                            {getPrimaryTrait(graph2)}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. DETAILED ANALYSIS ROW (Side-by-Side, below points) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-10">
                {/* Graph 1 Analysis */}
                <div className="border border-gray-300 p-6 shadow-sm h-full bg-white">
                    <h3 className="text-blue-700 font-bold text-lg mb-2">Grafik 1: {profile1.pattern}</h3>
                    <p className="text-blue-800 font-medium mb-4">Perilaku Adaptasi: {getPrimaryTrait(graph1)}</p>

                    <h4 className="font-bold text-sm uppercase mb-2 text-gray-700">KEKUATAN UTAMA:</h4>
                    <ul className="list-disc pl-5 text-sm mb-4 space-y-1 text-gray-700">
                        {profile1.analysis.strength.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>

                    <h4 className="font-bold text-sm uppercase mb-2 text-gray-700">MEMPERBAIKI EFEKTIVITAS DENGAN:</h4>
                    <ul className="list-disc pl-5 text-sm mb-4 space-y-1 text-gray-700">
                        {profile1.analysis.improve.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>

                    <h4 className="font-bold text-sm uppercase mb-2 text-gray-700">KECENDERUNGAN:</h4>
                    <ul className="list-disc pl-5 text-sm mb-4 space-y-1 text-gray-700">
                        <li><span className="font-semibold">TUJUAN:</span> {profile1.analysis.tendencies.goal}</li>
                        <li><span className="font-semibold">MENILAI ORANG LAIN DENGAN:</span> {profile1.analysis.tendencies.judgeOthers}</li>
                        <li><span className="font-semibold">MEMPENGARUHI ORANG LAIN DENGAN:</span> {profile1.analysis.tendencies.influenceOthers}</li>
                        <li><span className="font-semibold">NILAI TERHADAP ORGANISASI:</span> {profile1.analysis.tendencies.valueToOrg}</li>
                        <li><span className="font-semibold">BERLEBIHAN MENGGUNAKAN:</span> {profile1.analysis.tendencies.overUse}</li>
                        <li><span className="font-semibold">KETIKA DI BAWAH TEKANAN:</span> {profile1.analysis.tendencies.underPressure}</li>
                        <li><span className="font-semibold">KETAKUTAN:</span> {profile1.analysis.tendencies.fears}</li>
                    </ul>
                </div>

                {/* Graph 2 Analysis */}
                <div className="border border-gray-300 p-6 shadow-sm h-full bg-white">
                    <h3 className="text-blue-700 font-bold text-lg mb-2">Grafik 2: {profile2.pattern}</h3>
                    <p className="text-blue-800 font-medium mb-4">Perilaku Alami: {getPrimaryTrait(graph2)}</p>

                    <h4 className="font-bold text-sm uppercase mb-2 text-gray-700">KEKUATAN UTAMA:</h4>
                    <ul className="list-disc pl-5 text-sm mb-4 space-y-1 text-gray-700">
                        {profile2.analysis.strength.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>

                    <h4 className="font-bold text-sm uppercase mb-2 text-gray-700">MEMPERBAIKI EFEKTIVITAS DENGAN:</h4>
                    <ul className="list-disc pl-5 text-sm mb-4 space-y-1 text-gray-700">
                        {profile2.analysis.improve.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>

                    <h4 className="font-bold text-sm uppercase mb-2 text-gray-700">KECENDERUNGAN:</h4>
                    <ul className="list-disc pl-5 text-sm mb-4 space-y-1 text-gray-700">
                        <li><span className="font-semibold">TUJUAN:</span> {profile2.analysis.tendencies.goal}</li>
                        <li><span className="font-semibold">MENILAI ORANG LAIN DENGAN:</span> {profile2.analysis.tendencies.judgeOthers}</li>
                        <li><span className="font-semibold">MEMPENGARUHI ORANG LAIN DENGAN:</span> {profile2.analysis.tendencies.influenceOthers}</li>
                        <li><span className="font-semibold">NILAI TERHADAP ORGANISASI:</span> {profile2.analysis.tendencies.valueToOrg}</li>
                        <li><span className="font-semibold">BERLEBIHAN MENGGUNAKAN:</span> {profile2.analysis.tendencies.overUse}</li>
                        <li><span className="font-semibold">KETIKA DI BAWAH TEKANAN:</span> {profile2.analysis.tendencies.underPressure}</li>
                        <li><span className="font-semibold">KETAKUTAN:</span> {profile2.analysis.tendencies.fears}</li>
                    </ul>
                </div>
            </div>

            {/* Executive Summary */}
            {consistency && (
                <div className="mt-12 border-t-4 border-slate-700 pt-8">
                    <h2 className="text-2xl font-bold mb-6 text-slate-800">EXECUTIVE SUMMARY (KESIMPULAN)</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* 1. Consistency */}
                        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                            <h3 className="font-bold text-lg text-slate-700 mb-3 flex items-center gap-2">
                                📊 Tingkat Konsistensi: <span className={`${consistency.level === 'Tinggi' ? 'text-green-600' : consistency.level === 'Sedang' ? 'text-yellow-600' : 'text-red-600'}`}>{consistency.level}</span>
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed text-justify">
                                {consistency.description}
                            </p>
                        </div>

                        {/* 2. Candidate Description */}
                        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                            <h3 className="font-bold text-lg text-blue-800 mb-3">👤 Profil Awal</h3>
                            <p className="text-sm text-slate-700 leading-relaxed text-left">
                                {conclusion}
                            </p>
                        </div>

                        {/* 3. Job Recommendation */}
                        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                            <h3 className="font-bold text-lg text-green-800 mb-3">💼 Rekomendasi Posisi</h3>

                            {jobEvaluation && (
                                <div className="mb-4 pb-4 border-b border-green-200">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">POSISI YANG DILAMAR:</p>
                                    <p className="font-bold text-green-900 text-lg">{jobEvaluation.position}</p>
                                    <div className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold ${jobEvaluation.isMatch ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                                        {jobEvaluation.message}
                                    </div>
                                    <p className="text-sm mt-2 text-slate-700 italic">
                                        "{jobEvaluation.analysis}"
                                    </p>
                                </div>
                            )}

                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">ALTERNATIF PROFESI LAIN:</p>
                            <ul className="text-sm text-slate-700 space-y-2">
                                {jobMatch && jobMatch.map((job, idx) => (
                                    <li key={idx} className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                        {job}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
