import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function CandidateForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState(null);
    const [vacancies, setVacancies] = useState([]);

    useEffect(() => {
        const fetchVacancies = async () => {
            try {
                const res = await fetch('/api/vacancies');
                const data = await res.json();
                if (Array.isArray(data)) {
                    setVacancies(data);
                }
            } catch (error) {
                console.error("Failed to fetch vacancies", error);
            }
        };

        fetchVacancies();
    }, []);

    useEffect(() => {
        if (location.state?.position) {
            setFormData(prev => ({ ...prev, position: location.state.position }));
        }
    }, [location.state]);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        address: '',
        dob: '',
        position: '',
        religion: '',
        bloodType: '',
        nik: '', // New Field
        simOwnership: '', // New Field (Dropdown)
        simNumber: '', // New Field (Conditional)
        medicalHistory: '', // New Field
        emergencyContact: '',
        otherInfo: '',
        biggestAchievement: '',
        strengths: ['', '', ''],
        weaknesses: ['', '', ''],
        education: [{ level: '', school: '', year: '' }, { level: '', school: '', year: '' }, { level: '', school: '', year: '' }],
        experience: [{ company: '', role: '', duration: '', referenceName: '', referencePhone: '' }, { company: '', role: '', duration: '', referenceName: '', referencePhone: '' }, { company: '', role: '', duration: '', referenceName: '', referencePhone: '' }]
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleArrayChange = (type, index, field, value) => {
        const newArray = [...formData[type]];
        newArray[index][field] = value;
        setFormData({ ...formData, [type]: newArray });
    };

    const handleSimpleArrayChange = (type, index, value) => {
        const newArray = [...formData[type]];
        newArray[index] = value;
        setFormData({ ...formData, [type]: newArray });
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            // Strict check for PDF
            if (selectedFile.type !== 'application/pdf' && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
                alert("Mohon upload file dengan format PDF (.pdf). File gambar tidak didukung untuk analisis AI.");
                e.target.value = null; // Reset input
                setFile(null);
                return;
            }
            // Check file size (max 5MB safe limit for mobile)
            if (selectedFile.size > 5 * 1024 * 1024) {
                alert("Ukuran file terlalu besar. Maksimal 5MB.");
                e.target.value = null;
                setFile(null);
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (typeof formData[key] === 'object') {
                data.append(key, JSON.stringify(formData[key]));
            } else {
                data.append(key, formData[key]);
            }
        });

        if (file) data.append('cv', file);

        // Find vacancy ID based on selected position if not explicitly set
        // (This handles case where user changes dropdown or comes directly)
        const selectedVac = vacancies.find(v => v.title === formData.position);
        if (selectedVac) {
            data.append('vacancyId', selectedVac.id);
        }

        try {
            console.log("Submitting...", formData);
            const res = await fetch('/api/candidates', {
                method: 'POST',
                body: data
            });

            const result = await res.json();
            if (result.success && result.candidateId) {
                navigate('/test-disclaimer', { state: { candidateId: result.candidateId } });
            } else {
                throw new Error(result.error || "Gagal menyimpan data");
            }
        } catch (error) {
            console.error(error);
            const msg = error.message || "Gagal mengirim data.";
            alert(`Gagal: ${msg}\nCek koneksi atau coba lagi.`);
        } finally {
            setLoading(false);
        }
    };

    const validateStep = (currentStep) => {
        if (currentStep === 1) {
            const requiredFields = ['fullName', 'position', 'email', 'phone', 'dob', 'religion', 'address', 'emergencyContact', 'nik', 'simOwnership', 'medicalHistory'];
            for (const field of requiredFields) {
                if (!formData[field] || formData[field].trim() === '') {
                    alert(`Mohon lengkapi field: ${field}`);
                    return false;
                }
            }
            if (formData.simOwnership !== "Tidak Memiliki SIM" && (!formData.simNumber || formData.simNumber.trim() === '')) {
                alert("Mohon lengkapi Nomor SIM");
                return false;
            }
            return true;
        }
        if (currentStep === 2) {
            // Check first education entry (required)
            if (!formData.education[0].level || !formData.education[0].school || !formData.education[0].year) {
                alert("Mohon lengkapi data pendidikan terakhir");
                return false;
            }
            return true;
        }
        if (currentStep === 3) {
            // Check Personality Fields
            for (let i = 0; i < 3; i++) {
                if (!formData.strengths[i] || formData.strengths[i].trim() === '') {
                    alert(`Mohon isi Kelebihan ke-${i + 1}`);
                    return false;
                }
                if (!formData.weaknesses[i] || formData.weaknesses[i].trim() === '') {
                    alert(`Mohon isi Kekurangan ke-${i + 1}`);
                    return false;
                }
            }
            if (!formData.biggestAchievement || formData.biggestAchievement.trim() === '') {
                alert("Mohon isi pencapaian terbesar");
                return false;
            }
            return true;
        }
        return true;
    };

    const nextStep = () => {
        if (validateStep(step)) {
            setStep(s => s + 1);
            window.scrollTo(0, 0); // Scroll to top on step change
        }
    };
    const prevStep = () => {
        setStep(s => s - 1);
        window.scrollTo(0, 0);
    };

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-slate-900">
            {/* Dynamic Backgrounds */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-10 right-10 w-96 h-96 bg-gama-600/10 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div className="absolute bottom-10 left-10 w-80 h-80 bg-cyber-teal/10 rounded-full blur-[80px]"></div>
            </div>

            <div className="relative z-10 max-w-4xl w-full glass-dark rounded-3xl overflow-hidden border border-white/10 animate-fade-in-up">

                {/* Header */}
                <div className="relative p-8 pb-12 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-gama-900 to-slate-900 opacity-90"></div>
                    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gama-500 to-transparent"></div>

                    <div className="relative z-10 flex justify-between items-end">
                        <div className='flex gap-4 items-center'>
                            <div>
                                <h1 className="text-3xl font-display font-bold text-white tracking-wide">Portal Karir</h1>
                                <p className="text-gama-300 text-sm tracking-widest uppercase">PT. Gama Agro Sejati</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-4xl font-bold text-white/10">{step}<span className="text-2xl">/4</span></div>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-slate-800 w-full">
                    <div className="h-full bg-gama-500 transition-all duration-500 ease-in-out shadow-[0_0_10px_rgba(34,197,94,0.5)]" style={{ width: `${(step / 4) * 100}%` }}></div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 md:p-10">

                    {/* STEP 1: Personal Data */}
                    {step === 1 && (
                        <div className="space-y-6 animate-fade-in-up">
                            <h2 className="text-xl font-medium text-gama-300 border-b border-white/5 pb-4 mb-6 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-gama-500/20 text-gama-400 flex items-center justify-center text-sm font-bold">1</span>
                                Data Pribadi
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Nama Lengkap <span className="text-red-500">*</span></label>
                                    <input type="text" name="fullName" required className="input-field" placeholder="Masukan nama lengkap" value={formData.fullName} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Posisi yang Dilamar <span className="text-red-500">*</span></label>
                                    <select
                                        name="position"
                                        required
                                        className="input-field text-slate-300"
                                        value={formData.position}
                                        onChange={handleChange}
                                    >
                                        <option value="" className='bg-slate-900'>Pilih Posisi</option>
                                        {vacancies.map(v => (
                                            <option key={v.id} value={v.title} className='bg-slate-900'>
                                                {v.title}
                                            </option>
                                        ))}
                                        {/* Fallback if pre-filled position is not in list (e.g. if list failed to load or position hidden) */}
                                        {formData.position && !vacancies.find(v => v.title === formData.position) && (
                                            <option value={formData.position} className='bg-slate-900'>{formData.position}</option>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Email <span className="text-red-500">*</span></label>
                                    <input type="email" name="email" required className="input-field" placeholder="nama@email.com" value={formData.email} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Nomor HP / WhatsApp <span className="text-red-500">*</span></label>
                                    <input type="tel" name="phone" required className="input-field" placeholder="+62 8..." value={formData.phone} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Tanggal Lahir <span className="text-red-500">*</span></label>
                                    <input type="date" name="dob" required className="input-field text-slate-300" value={formData.dob} onChange={handleChange} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-2">Agama <span className="text-red-500">*</span></label>
                                        <select name="religion" required className="input-field text-slate-300" value={formData.religion} onChange={handleChange}>
                                            <option value="" className='bg-slate-900'>Pilih</option>
                                            <option value="Islam" className='bg-slate-900'>Islam</option>
                                            <option value="Kristen" className='bg-slate-900'>Kristen</option>
                                            <option value="Katolik" className='bg-slate-900'>Katolik</option>
                                            <option value="Hindu" className='bg-slate-900'>Hindu</option>
                                            <option value="Buddha" className='bg-slate-900'>Buddha</option>
                                            <option value="Khonghucu" className='bg-slate-900'>Khonghucu</option>
                                            <option value="Lainnya" className='bg-slate-900'>Lainnya</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-2">Gol. Darah</label>
                                        <select name="bloodType" className="input-field text-slate-300" value={formData.bloodType} onChange={handleChange}>
                                            <option value="" className='bg-slate-900'>-</option>
                                            <option value="A" className='bg-slate-900'>A</option>
                                            <option value="B" className='bg-slate-900'>B</option>
                                            <option value="AB" className='bg-slate-900'>AB</option>
                                            <option value="O" className='bg-slate-900'>O</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Alamat Lengkap <span className="text-red-500">*</span></label>
                                    <textarea name="address" required rows="2" className="input-field" placeholder="Alamat domisili saat ini..." value={formData.address} onChange={handleChange}></textarea>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-400 mb-2">NIK KTP <span className="text-red-500">*</span></label>
                                    <input type="text" name="nik" required className="input-field" placeholder="Nomor Induk Kependudukan (16 digit)" maxLength={16} value={formData.nik} onChange={handleChange} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-2">Kepemilikan SIM <span className="text-red-500">*</span></label>
                                        <select name="simOwnership" required className="input-field text-slate-300" value={formData.simOwnership} onChange={handleChange}>
                                            <option value="" className='bg-slate-900'>Pilih</option>
                                            <option value="SIM C" className='bg-slate-900'>SIM C</option>
                                            <option value="SIM A" className='bg-slate-900'>SIM A</option>
                                            <option value="SIM B1" className='bg-slate-900'>SIM B1</option>
                                            <option value="SIM A & C" className='bg-slate-900'>SIM A & C</option>
                                            <option value="Tidak Memiliki SIM" className='bg-slate-900'>Tidak Memiliki SIM</option>
                                        </select>
                                    </div>
                                    <div>
                                        {formData.simOwnership && formData.simOwnership !== "Tidak Memiliki SIM" && (
                                            <>
                                                <label className="block text-sm font-medium text-slate-400 mb-2">Nomor SIM <span className="text-red-500">*</span></label>
                                                <input type="text" name="simNumber" required className="input-field" placeholder="Nomor SIM" value={formData.simNumber} onChange={handleChange} />
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Riwayat Kesehatan (Penyakit) <span className="text-slate-500 text-xs font-normal">(Isi "-" jika tidak ada)</span> <span className="text-red-500">*</span></label>
                                    <textarea name="medicalHistory" required rows="2" className="input-field" placeholder="Sebutkan penyakit berat/kronis yang pernah diderita..." value={formData.medicalHistory} onChange={handleChange}></textarea>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Kontak Darurat (Nama & No HP) <span className="text-red-500">*</span></label>
                                    <input type="text" name="emergencyContact" required className="input-field" placeholder="Nama Kerabat - 08xxxxxxxx" value={formData.emergencyContact} onChange={handleChange} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Education & Experience */}
                    {step === 2 && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div>
                                <h2 className="text-xl font-medium text-gama-300 border-b border-white/5 pb-4 mb-6 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-full bg-gama-500/20 text-gama-400 flex items-center justify-center text-sm font-bold">2</span>
                                    Latar Belakang Pendidikan (3 Terakhir)
                                </h2>
                                <div className="space-y-4">
                                    {formData.education.map((edu, idx) => (
                                        <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-800/30 rounded-xl border border-white/5 hover:border-gama-500/30 transition-colors">
                                            <input type="text" placeholder="Jenjang (SMA/S1)" required={idx === 0} className="input-field text-sm" value={edu.level} onChange={(e) => handleArrayChange('education', idx, 'level', e.target.value)} />
                                            <input type="text" placeholder="Nama Sekolah/Univ" required={idx === 0} className="input-field text-sm" value={edu.school} onChange={(e) => handleArrayChange('education', idx, 'school', e.target.value)} />
                                            <input type="text" placeholder="Tahun Lulus" required={idx === 0} className="input-field text-sm" value={edu.year} onChange={(e) => handleArrayChange('education', idx, 'year', e.target.value)} />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h2 className="text-xl font-medium text-gama-300 border-b border-white/5 pb-4 mb-6 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-full bg-gama-500/20 text-gama-400 flex items-center justify-center text-sm font-bold">3</span>
                                    Pengalaman Kerja (3 Terakhir)
                                </h2>
                                <div className="space-y-4">
                                    {formData.experience.map((exp, idx) => (
                                        <div key={idx} className="bg-slate-800/30 rounded-xl border border-white/5 hover:border-gama-500/30 transition-colors p-4 space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <input type="text" placeholder="Nama Perusahaan" className="input-field text-sm" value={exp.company} onChange={(e) => handleArrayChange('experience', idx, 'company', e.target.value)} />
                                                <input type="text" placeholder="Jabatan" className="input-field text-sm" value={exp.role} onChange={(e) => handleArrayChange('experience', idx, 'role', e.target.value)} />
                                                <input type="text" placeholder="Lama Bekerja" className="input-field text-sm" value={exp.duration} onChange={(e) => handleArrayChange('experience', idx, 'duration', e.target.value)} />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                                                <input type="text" placeholder="Nama Referensi (Atasan/HRD)" required={exp.company !== ''} className="input-field text-sm bg-slate-900/50" value={exp.referenceName} onChange={(e) => handleArrayChange('experience', idx, 'referenceName', e.target.value)} />
                                                <input type="text" placeholder="No. HP Referensi" required={exp.company !== ''} className="input-field text-sm bg-slate-900/50" value={exp.referencePhone} onChange={(e) => handleArrayChange('experience', idx, 'referencePhone', e.target.value)} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Personality & Achievement */}
                    {step === 3 && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div>
                                <h2 className="text-xl font-medium text-gama-300 border-b border-white/5 pb-4 mb-6 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-full bg-gama-500/20 text-gama-400 flex items-center justify-center text-sm font-bold">3</span>
                                    Kepribadian & Penilaian Diri
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-4">3 Kelebihan Utama (Strengths) <span className="text-red-500">*</span></label>
                                        <div className="space-y-3">
                                            {formData.strengths.map((str, idx) => (
                                                <input
                                                    key={idx}
                                                    type="text"
                                                    required
                                                    className="input-field"
                                                    placeholder={`Kelebihan ${idx + 1}`}
                                                    value={str}
                                                    onChange={(e) => handleSimpleArrayChange('strengths', idx, e.target.value)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-4">3 Kekurangan Utama (Weaknesses) <span className="text-red-500">*</span></label>
                                        <div className="space-y-3">
                                            {formData.weaknesses.map((weak, idx) => (
                                                <input
                                                    key={idx}
                                                    type="text"
                                                    required
                                                    className="input-field"
                                                    placeholder={`Kekurangan ${idx + 1}`}
                                                    value={weak}
                                                    onChange={(e) => handleSimpleArrayChange('weaknesses', idx, e.target.value)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <label className="block text-sm font-medium text-white mb-2">Pencapaian Terbesar Selama Bekerja <span className="text-red-500">*</span></label>
                                    <textarea
                                        name="biggestAchievement"
                                        required
                                        rows="4"
                                        className="input-field"
                                        placeholder="Ceritakan pencapaian karir yang paling membanggakan bagi Anda..."
                                        value={formData.biggestAchievement}
                                        onChange={handleChange}
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Upload & Other */}
                    {step === 4 && (
                        <div className="space-y-6 animate-fade-in-up">
                            <h2 className="text-xl font-medium text-gama-300 border-b border-white/5 pb-4 mb-6 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-gama-500/20 text-gama-400 flex items-center justify-center text-sm font-bold">4</span>
                                Dokumen & Lainnya
                            </h2>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Data Pelengkap Lainnya (Opsional)</label>
                                <textarea name="otherInfo" rows="3" className="input-field" placeholder="Keahlian khusus, sertifikasi, dll." value={formData.otherInfo} onChange={handleChange}></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Upload CV (PDF Wajib) <span className="text-red-500">*</span></label>
                                <div className="mt-2 flex justify-center px-6 pt-8 pb-8 border-2 border-slate-700 border-dashed rounded-xl hover:bg-slate-800/50 hover:border-gama-500/50 transition cursor-pointer relative group bg-slate-800/20">
                                    <div className="space-y-2 text-center group-hover:scale-105 transition-transform">
                                        <div className="mx-auto w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4 text-gama-400">
                                            <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"></path></svg>
                                        </div>
                                        <div className="flex text-sm text-slate-300 justify-center">
                                            <span className="font-medium text-gama-400">
                                                {file ? file.name : "Klik untuk upload CV"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500">Format PDF, Maksimal 10MB</p>
                                    </div>
                                    <input type="file" name="cv" accept=".pdf" required={!file} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileChange} />
                                </div>
                                <p className="mt-4 text-sm text-yellow-500/90 italic flex gap-2 items-start">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <span>
                                        Penting: Setelah melakukan submit, Anda <strong>diwajibkan</strong> langsung mengerjakan tes kepribadian sebagai tahap seleksi selanjutnya.
                                    </span>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="mt-12 flex justify-between pt-6 border-t border-white/5">
                        {step > 1 ? (
                            <button type="button" onClick={prevStep} className="btn-outline">
                                Kembali
                            </button>
                        ) : <div></div>}

                        {step < 4 ? (
                            <button type="button" onClick={nextStep} className="btn-primary">
                                Lanjut
                            </button>
                        ) : (
                            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Mengirim...
                                    </>
                                ) : 'Kirim & Mulai Tes'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
