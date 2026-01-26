import React, { useState, useEffect } from 'react';
import { Leaf, Menu, ArrowRight, Sprout, Users, TrendingUp, Quote, Linkedin, Instagram, Facebook, Mail, MapPin, X, UploadCloud, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import gamaIcon from '../assets/gama-icon.png';
import gamaLogoFull from '../assets/gama-logo-full.png';
import officeBuilding from '../assets/office-building.png';

export default function LandingPage() {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalRoleName, setModalRoleName] = useState('');
    const [scrolled, setScrolled] = useState(false);

    // Check if in visible viewport for fade animations
    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('opacity-100', 'translate-y-0');
                    entry.target.classList.remove('opacity-0', 'translate-y-5');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        document.querySelectorAll('.fade-in-section').forEach(section => {
            section.classList.add('opacity-0', 'translate-y-5', 'transition-all', 'duration-700', 'ease-out');
            observer.observe(section);
        });

        const handleScroll = () => {
            if (window.scrollY > 50) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setMobileMenuOpen(false);
        }
    };

    const handleApplyClick = () => {
        window.open('/careers', '_blank');
    };

    return (
        <div className="font-sans text-gray-700 bg-slate-50 antialiased selection:bg-gama-primary selection:text-white">

            {/* Navigation */}
            <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'glass-nav shadow-md h-16' : 'glass-nav h-20'}`} style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
                    <div className="flex justify-between items-center h-full">
                        {/* Logo */}
                        <div className="flex items-center">
                            <img src={gamaLogoFull} alt="GAMA AGRO Sejati" className="h-10 md:h-12 w-auto object-contain" />
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex space-x-8 items-center">
                            <button onClick={() => scrollToSection('about')} className="text-gray-600 hover:text-gama-primary font-medium transition">Tentang Kami</button>
                            <button onClick={() => scrollToSection('values')} className="text-gray-600 hover:text-gama-primary font-medium transition">Budaya Kerja</button>
                            <button onClick={() => scrollToSection('vacancies')} className="text-gray-600 hover:text-gama-primary font-medium transition">Lowongan</button>
                            <button onClick={handleApplyClick} className="px-6 py-2.5 bg-gama-primary hover:bg-gama-dark text-white rounded-full font-medium transition shadow-lg shadow-gama-primary/30 flex items-center gap-2">
                                Gabung Sekarang <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden flex items-center">
                            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-600 focus:outline-none">
                                {mobileMenuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Panel */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white border-t border-gray-100 absolute w-full shadow-lg">
                        <div className="px-4 pt-2 pb-6 space-y-2">
                            <button onClick={() => scrollToSection('about')} className="block w-full text-left px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-gama-primary hover:bg-gray-50">Tentang Kami</button>
                            <button onClick={() => scrollToSection('values')} className="block w-full text-left px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-gama-primary hover:bg-gray-50">Budaya Kerja</button>
                            <button onClick={() => scrollToSection('vacancies')} className="block w-full text-left px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-gama-primary hover:bg-gray-50">Lowongan</button>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="relative h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat bg-fixed" style={{ backgroundImage: "linear-gradient(to right bottom, rgba(15, 57, 43, 0.85), rgba(22, 101, 78, 0.7)), url('https://images.unsplash.com/photo-1625246333195-58197bd47d19?q=80&w=2070&auto=format&fit=crop')" }}>
                <div className="absolute inset-0 bg-black/30"></div>
                <div className="relative z-10 max-w-7xl mx-auto px-4 text-center sm:px-6 lg:px-8 pt-16">
                    <span className="inline-block py-1 px-3 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold tracking-wider mb-6 fade-in-section">
                        HUMAN CAPITAL DIVISION
                    </span>
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-white mb-6 leading-tight fade-in-section" style={{ transitionDelay: '100ms' }}>
                        Menanam Talenta,<br />
                        <span className="text-gama-gold italic">Memanen Masa Depan.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto font-light fade-in-section" style={{ transitionDelay: '200ms' }}>
                        Bergabunglah dengan PT. Gama Agro Sejati. Kami berfokus pada pertumbuhan, untuk itu kami terus menumbuhkan pemimpin masa depan industri agrikultur modern.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center fade-in-section" style={{ transitionDelay: '300ms' }}>
                        <button onClick={() => scrollToSection('vacancies')} className="px-8 py-4 bg-gama-gold hover:bg-yellow-600 text-white font-bold rounded-full transition transform hover:scale-105 shadow-xl">
                            Lihat Posisi Tersedia
                        </button>
                        <button onClick={() => scrollToSection('about')} className="px-8 py-4 bg-transparent border-2 border-white text-white font-bold rounded-full hover:bg-white hover:text-gama-dark transition">
                            Pelajari Budaya Kami
                        </button>
                    </div>
                </div>

                {/* Scroll Down Indicator */}
                <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
                    <ChevronDown className="text-white w-8 h-8 opacity-70" />
                </div>
            </section>

            {/* About / Stats Section */}
            <section id="about" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center fade-in-section">
                        <div className="relative">
                            <div className="absolute -top-4 -left-4 w-24 h-24 bg-gama-gold/20 rounded-full blur-2xl"></div>
                            <img src={officeBuilding} alt="Modern Corporate Office" className="relative rounded-2xl shadow-2xl z-10 w-full object-cover h-[500px]" />
                            <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-xl shadow-xl z-20 max-w-xs border-l-4 border-gama-primary hidden md:block">
                                <p className="text-gama-primary font-bold text-4xl mb-1">15+</p>
                                <p className="text-gray-600 text-sm font-medium">Tahun berinovasi dalam industri agro.</p>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-gama-primary font-bold text-sm tracking-widest uppercase mb-2">Tentang Kami</h2>
                            <h3 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">Sinergi Alam dan Teknologi untuk Kesejahteraan.</h3>
                            <p className="text-gray-600 mb-6 leading-relaxed">
                                PT. Gama Agro Sejati adalah pionir dalam agribisnis terintegrasi. Kami percaya bahwa kunci keberhasilan perusahaan bukan hanya pada seberapa besar dan maju perusahaannya, tetapi pada <strong>sumber daya manusia</strong> yang mengelolanya.
                            </p>
                            <p className="text-gray-600 mb-8 leading-relaxed">
                                Divisi Human Capital kami berkomitmen menciptakan lingkungan kerja yang inklusif, berbasis data, dan berfokus pada pertumbuhan individu. Di sini, karir Anda dirawat selayaknya tunas terbaik.
                            </p>

                            <ul className="space-y-4">
                                <li className="flex items-center gap-3">
                                    <div className="p-2 bg-gama-light rounded-full text-gama-primary">
                                        <Sprout className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium text-gray-700">Sustainable Growth & Innovation</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="p-2 bg-gama-light rounded-full text-gama-primary">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium text-gray-700">People-First Culture</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="p-2 bg-gama-light rounded-full text-gama-primary">
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium text-gray-700">Career Acceleration Program</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Company Profile Video Section */}
            <section className="py-20 bg-slate-50 border-t border-b border-gray-100">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center fade-in-section">
                    <div className="mb-10">
                        <span className="text-gama-primary font-bold tracking-wider uppercase text-sm">Profil Perusahaan</span>
                        <h2 className="text-3xl md:text-4xl font-serif font-bold text-gama-dark mt-2">Mengenal Gama Agro Sejati Lebih Dekat</h2>
                        <p className="text-gray-600 mt-4 max-w-2xl mx-auto">Saksikan perjalanan kami dalam membangun kemandirian pangan dan memberdayakan potensi terbaik anak bangsa.</p>
                    </div>

                    <div className="relative w-full shadow-2xl rounded-2xl overflow-hidden border-8 border-white bg-gray-200 group">
                        <div style={{ paddingBottom: '56.25%', position: 'relative' }}>
                            <iframe
                                className="absolute top-0 left-0 w-full h-full"
                                src="https://www.youtube.com/embed/NBQVadCIiqs?rel=0&modestbranding=1"
                                title="Company Profile Video"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen>
                            </iframe>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values Section */}
            <section id="values" className="py-20 bg-gama-light/40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16 fade-in-section">
                        <h2 className="text-3xl md:text-4xl font-serif font-bold text-gama-dark mb-4">Nilai Inti GAMA</h2>
                        <p className="text-gray-600">Filosofi kerja yang menjadi kompas bagi setiap insan Gama Agro Sejati dalam berkarya.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Card G */}
                        <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition duration-300 border-t-4 border-gama-gold fade-in-section group hover:-translate-y-1">
                            <div className="w-12 h-12 bg-gama-light rounded-xl flex items-center justify-center text-gama-primary mb-5 group-hover:scale-110 transition duration-300">
                                <span className="font-serif text-2xl font-bold">G</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Grateful to God for everything</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Kami meyakini bahwa setiap keberhasilan adalah berkah. Rasa syukur kami wujudkan melalui integritas tinggi dan pengelolaan sumber daya yang amanah sebagai bentuk pengabdian.
                            </p>
                        </div>

                        {/* Card A */}
                        <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition duration-300 border-t-4 border-gama-primary fade-in-section group hover:-translate-y-1" style={{ transitionDelay: '100ms' }}>
                            <div className="w-12 h-12 bg-gama-light rounded-xl flex items-center justify-center text-gama-primary mb-5 group-hover:scale-110 transition duration-300">
                                <span className="font-serif text-2xl font-bold">A</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Always strive to be the best</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Kami tidak mudah puas atas pencapaian saat ini. Semangat untuk selalu memberikan performa terbaik, mendorong kami mampu menetapkan standar kualitas tertinggi dalam setiap detail pekerjaan.
                            </p>
                        </div>

                        {/* Card M */}
                        <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition duration-300 border-t-4 border-gama-gold fade-in-section group hover:-translate-y-1" style={{ transitionDelay: '200ms' }}>
                            <div className="w-12 h-12 bg-gama-light rounded-xl flex items-center justify-center text-gama-primary mb-5 group-hover:scale-110 transition duration-300">
                                <span className="font-serif text-2xl font-bold">M</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Moving forward towards excellence</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Inovasi adalah nafas kami. Kami terus bergerak maju, mengembangkan teknologi dan kompetensi untuk mencapai keunggulan operasional yang berkelanjutan.
                            </p>
                        </div>

                        {/* Card A */}
                        <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition duration-300 border-t-4 border-gama-primary fade-in-section group hover:-translate-y-1" style={{ transitionDelay: '300ms' }}>
                            <div className="w-12 h-12 bg-gama-light rounded-xl flex items-center justify-center text-gama-primary mb-5 group-hover:scale-110 transition duration-300">
                                <span className="font-serif text-2xl font-bold">A</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Adapt in any situation & condition</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Kami tangguh menghadapi perubahan. Fleksibilitas dan kecepatan adaptasi adalah kunci kami dalam menghadapi dinamika industri dan tantangan global.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Recruitment Section */}
            <section id="vacancies" className="py-24 relative overflow-hidden bg-cover bg-center bg-fixed" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2032&auto=format&fit=crop')" }}>
                <div className="absolute inset-0 bg-white/85 z-0"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-gama-light rounded-bl-full opacity-50 z-0"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-3xl mx-auto fade-in-section">
                        <span className="text-gama-primary font-bold tracking-wider uppercase text-sm">Bergabung dengan Tim</span>
                        <h2 className="text-3xl md:text-4xl font-serif font-bold text-gama-dark mt-2 mb-6">Peluang Karir PT. Gama Agro Sejati</h2>
                        <p className="text-gray-600 mb-10 text-lg">
                            Jadilah asset penting di perusahaan kami. Kami mencari profesional yang memiliki semangat dan kompeten untuk tumbuh bersama.
                        </p>

                        <button onClick={handleApplyClick} className="inline-flex items-center justify-center px-10 py-5 bg-gama-primary text-white font-bold rounded-full hover:bg-gama-dark transition-all transform hover:scale-105 shadow-xl shadow-gama-primary/20 group">
                            Cek Lowongan Kerja
                            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </section>

            {/* Quote Section */}
            <section className="py-20 bg-gama-dark text-white text-center px-4">
                <div className="max-w-4xl mx-auto fade-in-section">
                    <Quote className="w-12 h-12 text-gama-gold mx-auto mb-6 opacity-50" />
                    <h2 className="text-2xl md:text-4xl font-serif font-medium leading-relaxed mb-8">
                        "Di Gama Agro Sejati, kami tidak sekadar mencari karyawan. Kami mencari mitra untuk membangun ekosistem bisnis agro yang lebih baik di Indonesia."
                    </h2>

                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-3 mb-4">
                            <img src={gamaIcon} alt="GAMA AGRO Sejati" className="h-8 w-auto object-contain" />
                            <span className="font-bold text-xl text-white tracking-wide">GAMA AGRO SEJATI</span>
                        </div>
                        <p className="text-sm max-w-sm mb-6">
                            Perusahaan agribisnis terkemuka yang berkomitmen pada inovasi berkelanjutan dan pengembangan sumber daya manusia unggul.
                        </p>
                        <div className="flex space-x-4">
                            <a href="#" className="hover:text-white transition"><Linkedin className="w-5 h-5" /></a>
                            <a href="#" className="hover:text-white transition"><Instagram className="w-5 h-5" /></a>
                            <a href="#" className="hover:text-white transition"><Facebook className="w-5 h-5" /></a>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-4">Navigasi</h4>
                        <ul className="space-y-2 text-sm">
                            <li><button onClick={() => scrollToSection('about')} className="hover:text-gama-primary transition">Tentang Kami</button></li>
                            <li><button onClick={() => scrollToSection('vacancies')} className="hover:text-gama-primary transition">Program Magang</button></li>
                            <li><button onClick={() => scrollToSection('vacancies')} className="hover:text-gama-primary transition">Karir Profesional</button></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-4">Kontak Rekrutmen</h4>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                                <Mail className="w-4 h-4 mt-1 text-gama-primary" />
                                <span>recruitment@gamaagrosejati.co.id</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 mt-1 text-gama-primary" />
                                <span>Jl. Kawasan Industri Candi Blok 20 No. B-5</span>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-gray-800 text-center text-xs">
                    &copy; 2024 PT. Gama Agro Sejati. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
