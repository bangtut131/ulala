import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gamaLogoCareers from '../assets/gama-logo-careers.png';
import logo from '../assets/logo.png';

const JobVacancies = () => {
    const [vacancies, setVacancies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVacancy, setSelectedVacancy] = useState(null); // State for modal
    const navigate = useNavigate();

    useEffect(() => {
        fetchVacancies();
    }, []);

    const fetchVacancies = async () => {
        try {
            const res = await fetch('/api/vacancies');
            const data = await res.json();
            if (Array.isArray(data)) {
                setVacancies(data);
            }
        } catch (error) {
            console.error("Failed to fetch vacancies", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredVacancies = vacancies.filter(v =>
        v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleApply = (vacancy) => {
        navigate('/apply', { state: { position: vacancy.title, vacancyId: vacancy.id } });
    };

    // Manage body scroll lock
    useEffect(() => {
        if (selectedVacancy) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        // Cleanup on unmount (e.g., navigating to /apply)
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [selectedVacancy]);

    const openDetail = (vacancy) => {
        setSelectedVacancy(vacancy);
        // Trigger view increment (Fire and forget)
        fetch(`/api/vacancies/${vacancy.id}`).catch(console.error);
    };

    const closeDetail = () => {
        setSelectedVacancy(null);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-inter relative">
            {/* Subtle Background Pattern for the entire page */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[40%] right-0 w-[800px] h-[800px] bg-blue-100/40 rounded-full blur-[120px] mix-blend-multiply"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-teal-100/40 rounded-full blur-[100px] mix-blend-multiply"></div>
            </div>
            {/* Hero Section */}
            <div className="relative text-white py-28 px-4 overflow-hidden">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop"
                        alt="Professional Team"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-blue-900/80"></div>
                </div>

                {/* Animated Shapes */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none"></div>

                <div className="max-w-6xl mx-auto text-center relative z-10 fade-in-section">
                    <div className="flex justify-center mb-8">
                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 shadow-2xl transform hover:scale-105 transition-transform duration-500">
                            <img src={gamaLogoCareers} alt="PT Gama Agro Sejati" className="h-16 md:h-24 object-contain" onError={(e) => e.target.style.display = 'none'} />
                        </div>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-display font-extrabold mb-6 tracking-tight leading-tight">
                        Temukan Karir <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-teal-200">Impianmu</span>
                    </h1>
                    <p className="text-lg md:text-xl text-blue-100 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
                        Bergabunglah dengan <span className="font-bold text-white">PT Gama Agro Sejati</span> dan jadilah bagian dari inovasi masa depan agrikultur yang berkelanjutan.
                    </p>

                    {/* Search Bar */}
                    <div className="max-w-3xl mx-auto bg-white/10 backdrop-blur-lg border border-white/20 rounded-full p-2 flex shadow-2xl transform transition-all hover:scale-[1.01] hover:bg-white/20">
                        <input
                            type="text"
                            placeholder="Cari posisi, keahlian, atau lokasi..."
                            className="flex-grow px-6 py-4 rounded-full text-white placeholder-blue-200 outline-none bg-transparent font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button className="bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white px-8 py-3 rounded-full font-bold transition-all shadow-lg hover:shadow-cyan-500/30 flex items-center gap-2">
                            <span>Cari</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="max-w-6xl mx-auto px-4 py-16">
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900">Posisi Tersedia</h2>
                        <p className="text-gray-500 mt-1">Kami membuka kesempatan untuk talenta terbaik.</p>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 text-sm font-medium text-blue-600">
                        Total {filteredVacancies.length} Lowongan
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 bg-white rounded-2xl shadow-sm animate-pulse"></div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredVacancies.length > 0 ? filteredVacancies.map(vacancy => (
                            <div
                                key={vacancy.id}
                                onClick={() => openDetail(vacancy)}
                                className="bg-white rounded-2xl shadow-sm hover:shadow-2xl border border-gray-100/50 hover:border-blue-500/30 transition-all duration-300 overflow-hidden flex flex-col group relative cursor-pointer"
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                {vacancy.imageUrl && (
                                    <div className="h-40 w-full overflow-hidden">
                                        <img src={vacancy.imageUrl} alt={vacancy.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    </div>
                                )}

                                <div className="p-8 flex-grow">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${vacancy.type === 'Full-time' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {vacancy.type === 'Full-time' ? 'Penuh Waktu' : vacancy.type}
                                        </span>
                                        <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded">
                                            {new Date(vacancy.postedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-3 line-clamp-2">
                                        {vacancy.title}
                                    </h3>
                                    <p className="text-gray-500 text-sm mb-6 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                        {vacancy.location || 'Kantor Pusat'}
                                    </p>

                                    <div className="prose prose-sm text-gray-600 line-clamp-3 mb-4">
                                        <p>{vacancy.description}</p>
                                    </div>
                                </div>
                                <div className="p-6 bg-gray-50/50 border-t border-gray-100 group-hover:bg-white transition-colors">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent opening modal when clicking apply directly
                                            handleApply(vacancy);
                                        }}
                                        className="w-full flex justify-center items-center gap-2 bg-white text-gray-700 border border-gray-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 font-bold py-3 rounded-xl transition-all shadow-sm hover:shadow-lg"
                                    >
                                        Lamar Sekarang
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-3 text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                                <div className="text-6xl mb-4">🔍</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Tidak ada lowongan aktif</h3>
                                <p className="text-gray-500">Silakan cek kembali nanti untuk kesempatan terbaru.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedVacancy && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div
                        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
                        onClick={closeDetail}
                    ></div>
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative animate-fade-in-up flex flex-col md:flex-row overflow-hidden">

                        {/* Sidebar / Header Info */}
                        <div className="bg-gray-50 p-8 md:w-1/3 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col justify-between">
                            <div>
                                <div className="mb-6">
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase mb-3 ${selectedVacancy.type === 'Full-time' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {selectedVacancy.type === 'Full-time' ? 'Penuh Waktu' : selectedVacancy.type}
                                    </span>
                                    <h2 className="text-3xl font-extrabold text-gray-900 mb-2 leading-tight">{selectedVacancy.title}</h2>
                                    <p className="text-gray-500 font-medium flex items-center gap-2">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                        {selectedVacancy.location || 'Head Office'}
                                    </p>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">Diposting</p>
                                        <p className="font-semibold text-gray-700">
                                            {new Date(selectedVacancy.postedAt).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">Gaji</p>
                                        <p className="font-semibold text-gray-700">{selectedVacancy.salaryRange || 'Kompetitif'}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleApply(selectedVacancy)}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-blue-500/40 transition-all flex justify-center items-center gap-2"
                            >
                                Lamar Posisi Ini
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                            </button>
                        </div>

                        {/* Main Content */}
                        <div className="p-8 md:w-2/3 overflow-y-auto bg-white relative">
                            <button
                                onClick={closeDetail}
                                className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-700 transition-colors z-10"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>

                            {selectedVacancy.imageUrl && (
                                <div className="w-full mb-8 rounded-2xl overflow-hidden shadow-sm mt-8 bg-black/5 flex justify-center">
                                    <img src={selectedVacancy.imageUrl} alt={selectedVacancy.title} className="max-w-full h-auto max-h-[600px] object-contain" />
                                </div>
                            )}

                            <div className="prose prose-blue max-w-none mt-8">
                                <h3 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-blue-500 pl-4">Deskripsi Pekerjaan</h3>
                                <div className="text-gray-600 mb-8 leading-relaxed whitespace-pre-line">
                                    {selectedVacancy.description}
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-purple-500 pl-4">Kualifikasi & Persyaratan</h3>
                                <div className="bg-blue-50/50 rounded-2xl p-6 text-gray-700 leading-relaxed whitespace-pre-line border border-blue-100">
                                    {selectedVacancy.requirements}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobVacancies;
