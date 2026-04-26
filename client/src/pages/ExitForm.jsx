import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ExitForm() {
    const navigate = useNavigate();
    const token = localStorage.getItem('onboardingToken');
    const [form, setForm] = useState({
        exit_date: new Date().toISOString().split('T')[0], exit_type: 'Resign', reason: '',
        feedback_work_environment: 3, feedback_management: 3, feedback_career_growth: 3,
        feedback_compensation: 3, feedback_overall: 3, suggestions: '', would_rejoin: null
    });
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);

    if (!token) { navigate('/onboarding/login'); return null; }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/onboarding/exit-form', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) setDone(true);
            else { const d = await res.json(); alert(d.error || 'Gagal'); }
        } catch (err) { alert('Error: ' + err.message); }
        finally { setSaving(false); }
    };

    const RatingField = ({ label, name }) => (
        <div>
            <label className="block text-xs text-slate-400 mb-2">{label}</label>
            <div className="flex gap-1">{[1,2,3,4,5].map(v => (
                <button key={v} type="button" onClick={() => setForm({...form, [name]: v})}
                    className={`w-9 h-9 rounded-lg text-sm font-bold transition ${form[name] >= v ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>{v}</button>
            ))}</div>
        </div>
    );

    if (done) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="text-center">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Terima Kasih</h2>
                <p className="text-slate-400">Exit form Anda telah berhasil dikirim.</p>
                <button onClick={() => navigate('/onboarding')} className="mt-6 px-6 py-2 bg-cyan-600 text-white rounded-xl">Kembali</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                <button onClick={() => navigate('/onboarding')} className="text-slate-400 hover:text-white text-sm mb-4">&larr; Kembali</button>
                <div className="bg-slate-800/80 backdrop-blur rounded-2xl p-6 md:p-8 border border-white/10">
                    <h1 className="text-2xl font-bold text-white mb-2">Exit Form</h1>
                    <p className="text-slate-400 text-sm mb-6">Mohon isi form berikut sebelum meninggalkan perusahaan.</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-xs text-slate-400 mb-1">Tanggal Keluar</label><input type="date" value={form.exit_date} onChange={e => setForm({...form, exit_date: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" /></div>
                            <div><label className="block text-xs text-slate-400 mb-1">Tipe</label><select value={form.exit_type} onChange={e => setForm({...form, exit_type: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"><option>Resign</option><option>Contract End</option><option>Retired</option><option>Other</option></select></div>
                        </div>
                        <div><label className="block text-xs text-slate-400 mb-1">Alasan Keluar</label><textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows="3" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" placeholder="Ceritakan alasan Anda..."/></div>

                        <div className="border-t border-white/10 pt-4">
                            <h3 className="text-sm font-semibold text-white mb-4">Berikan Penilaian (1=Buruk, 5=Sangat Baik)</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <RatingField label="Lingkungan Kerja" name="feedback_work_environment" />
                                <RatingField label="Manajemen" name="feedback_management" />
                                <RatingField label="Jenjang Karir" name="feedback_career_growth" />
                                <RatingField label="Kompensasi" name="feedback_compensation" />
                                <RatingField label="Keseluruhan" name="feedback_overall" />
                                <div>
                                    <label className="block text-xs text-slate-400 mb-2">Ingin Kembali?</label>
                                    <div className="flex gap-2">{[{v:true,l:'Ya'},{v:false,l:'Tidak'}].map(o => (
                                        <button key={String(o.v)} type="button" onClick={() => setForm({...form, would_rejoin: o.v})} className={`px-4 py-2 rounded-lg text-sm transition ${form.would_rejoin === o.v ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{o.l}</button>
                                    ))}</div>
                                </div>
                            </div>
                        </div>
                        <div><label className="block text-xs text-slate-400 mb-1">Saran untuk Perusahaan</label><textarea value={form.suggestions} onChange={e => setForm({...form, suggestions: e.target.value})} rows="3" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" placeholder="Saran atau masukan Anda..."/></div>
                        <button type="submit" disabled={saving} className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl transition disabled:opacity-50">{saving ? 'Mengirim...' : 'Kirim Exit Form'}</button>
                    </form>
                </div>
            </div>
        </div>
    );
}
