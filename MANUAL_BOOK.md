# 📘 MANUAL BOOK - HR Auto Screening System
## PT. Gama Agro Sejati

**Versi:** 1.0  
**Tanggal:** Februari 2026  

---

# DAFTAR ISI

1. [Pendahuluan](#1-pendahuluan)
2. [Arsitektur Sistem](#2-arsitektur-sistem)
3. [Alur Pendaftaran Kandidat](#3-alur-pendaftaran-kandidat)
4. [Tes DISC (Kepribadian)](#4-tes-disc-kepribadian)
5. [Tes Aptitude (IQ/Kognitif)](#5-tes-aptitude-iqkognitif)
6. [Analisis AI](#6-analisis-ai)
7. [Dashboard Admin](#7-dashboard-admin)
8. [Detail Kandidat](#8-detail-kandidat)
9. [Kanban Board](#9-kanban-board)
10. [SLA Monitoring](#10-sla-monitoring)
11. [Manpower Planning (Admin)](#11-manpower-planning-admin)
12. [Portal Divisi](#12-portal-divisi)
13. [Vacancy Management](#13-vacancy-management)
14. [Pengaturan Admin](#14-pengaturan-admin)
15. [Notifikasi WhatsApp](#15-notifikasi-whatsapp)
16. [Laporan PDF](#16-laporan-pdf)
17. [Database & Skema Data](#17-database--skema-data)

---

# 1. PENDAHULUAN

## 1.1 Tentang Aplikasi

HR Auto Screening adalah sistem rekrutmen otomatis berbasis web yang dirancang untuk PT. Gama Agro Sejati. Aplikasi ini mengintegrasikan asesmen psikometri (DISC), tes kognitif (Aptitude/IQ), dan analisis kecerdasan buatan (AI) untuk mengevaluasi kandidat secara komprehensif.

## 1.2 Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| **Formulir Lamaran Online** | 4 tahap: Data Pribadi → Pendidikan & Pengalaman → Kepribadian → Upload CV |
| **Tes DISC** | 24 pertanyaan, 15 menit, menghasilkan profil kepribadian |
| **Tes Aptitude** | 60 pertanyaan, 30 menit, mengukur kemampuan kognitif/IQ |
| **Analisis AI** | Evaluasi otomatis menggunakan Google Gemini atau provider custom |
| **Dashboard Admin** | Tabel kandidat dengan filter, sort, dan export CSV |
| **Kanban Board** | Drag-and-drop untuk tracking pipeline rekrutmen |
| **Manpower Planning** | Portal permintaan tenaga kerja per divisi |
| **Notifikasi WhatsApp** | Broadcast otomatis hasil analisis ke HR |
| **Laporan PDF** | Generate report kandidat lengkap |

## 1.3 Tech Stack

- **Frontend:** React + Vite, Tailwind CSS
- **Backend:** Express.js, Node.js
- **Database:** Supabase (PostgreSQL) + SQLite (Prisma ORM)
- **AI:** Google Gemini 1.5 Flash / OpenAI-compatible API
- **Integrasi:** Google Drive, Google Sheets, WAHA (WhatsApp)

---

# 2. ARSITEKTUR SISTEM

## 2.1 Struktur Aplikasi

```
HR Auto Screening
├── client/                    # Frontend (React + Vite)
│   └── src/
│       ├── pages/             # 22 halaman aplikasi
│       ├── components/        # Komponen reusable
│       ├── utils/             # Logic DISC, helpers
│       └── data/              # Soal aptitude (JSON)
└── server/                    # Backend (Express.js)
    ├── routes/                # API endpoints
    ├── services/              # Business logic (AI, PDF, WA)
    └── prisma/                # Database schema
```

## 2.2 Alur Data Utama

```
Kandidat Melamar → Form 4 Tahap → Tes DISC → Tes Aptitude
       ↓
CV Upload → Google Drive → OCR Text Extraction
       ↓
AI Analysis (Gemini/Custom) → Weighted Scoring → Verdict
       ↓
WhatsApp Notification → Admin Dashboard → PDF Report
```

## 2.3 Autentikasi

| Role | Login | Akses |
|------|-------|-------|
| **Admin** | `/admin/login` | Dashboard, Kandidat, Kanban, SLA, Manpower, Vacancies, Settings |
| **Portal User** | `/portal/login` | Portal Divisi (Manpower Request) |
| **Kandidat** | Tidak perlu login | Form lamaran, Tes DISC, Tes Aptitude |

---

# 3. ALUR PENDAFTARAN KANDIDAT

## 3.1 Tahap 1: Data Pribadi

Kandidat mengisi informasi berikut:

| Field | Wajib | Keterangan |
|-------|-------|------------|
| Nama Lengkap | ✅ | |
| Email | ✅ | Harus unik (tidak boleh duplikat) |
| No. HP | ✅ | |
| NIK | ❌ | Nomor KTP |
| Agama | ❌ | |
| Golongan Darah | ❌ | |
| Alamat | ❌ | |
| Kepemilikan SIM | ❌ | Jenis SIM (A/B/C) |
| Nomor SIM | ❌ | |
| Riwayat Medis | ❌ | |
| Posisi yang Dilamar | ✅ | Diambil dari daftar lowongan aktif |

## 3.2 Tahap 2: Pendidikan & Pengalaman

- **Pendidikan:** Riwayat pendidikan (institusi, jurusan, tahun)
- **Pengalaman Kerja:** Riwayat pekerjaan (perusahaan, posisi, durasi)
- Data disimpan sebagai JSON string di database

## 3.3 Tahap 3: Kepribadian (Personality Traits)

Kandidat memilih sifat yang paling menggambarkan diri mereka. Data ini digunakan sebagai input tambahan untuk analisis AI.

## 3.4 Tahap 4: Upload CV

- Format: PDF
- CV di-upload ke **Google Drive** (folder ID dikonfigurasi di Settings)
- Teks CV diekstrak melalui **OCR** untuk analisis AI
- URL file disimpan di field `cvUrl`

---

# 4. TES DISC (KEPRIBADIAN)

## 4.1 Gambaran Umum

| Parameter | Nilai |
|-----------|-------|
| Jumlah Pertanyaan | 24 |
| Durasi | 15 menit (900 detik) |
| Format | Pilih "Most" dan "Least" dari 4 kata sifat |
| Auto-submit | Ya, saat waktu habis |

## 4.2 Mekanisme Jawaban

Setiap pertanyaan menampilkan 4 kata sifat yang masing-masing mewakili satu dimensi DISC. Kandidat memilih:
- **Most (M):** Kata yang **PALING** menggambarkan diri mereka
- **Least (L):** Kata yang **PALING TIDAK** menggambarkan diri mereka

## 4.3 Formula Perhitungan Skor

### Langkah 1: Hitung Raw Score

```
Raw Score per Dimensi = Jumlah kali dimensi dipilih sebagai "Most" atau "Least"

Contoh:
- D dipilih "Most" 8 kali → Raw M_D = 8
- D dipilih "Least" 3 kali → Raw L_D = 3
```

### Langkah 2: Konversi ke Norm Score (Persentil)

Menggunakan **Norm Table** berbasis distribusi populasi standar:

| Raw Score | D | I | S | C |
|-----------|---|---|---|---|
| 0 | 5 | 5 | 5 | 5 |
| 1 | 10 | 10 | 5 | 15 |
| 2 | 15 | 15 | 10 | 25 |
| 3 | 25 | 20 | 15 | 35 |
| 4 | 35 | 30 | 20 | 45 |
| 5 | 45 | 40 | 25 | 50 |
| 6 | 55 | 50 | 30 | 60 |
| 7 | 65 | 60 | 40 | 70 |
| 8 | 75 | 70 | 50 | 80 |
| 9 | 80 | 78 | 55 | 85 |
| 10 | 85 | 82 | 60 | 88 |
| 11 | 88 | 85 | 65 | 90 |
| 12 | 90 | 88 | 70 | 92 |
| 13 | 92 | 90 | 75 | 94 |
| 14 | 94 | 92 | 80 | 96 |
| 15 | 96 | 94 | 85 | 97 |
| 16 | 97 | 96 | 90 | 98 |
| 17 | 98 | 97 | 92 | 99 |
| 18 | 99 | 98 | 95 | 99 |
| 19 | 99 | 99 | 97 | 99 |
| 20+ | 99-100 | 99-100 | 98-100 | 99-100 |

**Catatan:** Setiap dimensi memiliki kurva berbeda karena distribusi populasi yang berbeda:
- **D** (rata-rata populasi raw ~6-7): Kurva naik cepat
- **I** (rata-rata populasi raw ~7-8): Kurva moderat
- **S** (rata-rata populasi raw ~9-10): Kurva naik lambat
- **C** (rata-rata populasi raw ~5-6): Kurva naik cepat

### Langkah 3: Dua Grafik Profil

Sistem menghasilkan **2 grafik** dari data jawaban:
- **Graph 1 (Most):** Profil perilaku yang **ditampilkan di tempat kerja** (Adapted)
- **Graph 2 (Least):** Profil perilaku **alami/natural** (Natural)

## 4.4 Penentuan Pola Klasik (15 Tipe)

Setelah konversi ke Norm Score, sistem mencocokkan dengan **15 pola klasik DISC**:

| No. | Nama Pola | Kode | Aturan | Deskripsi |
|-----|-----------|------|--------|-----------|
| 1 | Achiever | 1-1 | D↑ S↓ | Mandiri, fokus hasil |
| 2 | Agent | 3-1 | S↑ | Suportif, peduli |
| 3 | Appraiser | 3-3 | I↑ C↑ | Kritis tapi persuasif |
| 4 | Counselor | 2-2 | I↑ S↑ | Hangat, membangun hubungan |
| 5 | Creative | 1-5 | D↑ I↑ C↑ | Inovatif, visioner |
| 6 | Developer | 1-2 | D↑ C↑ | Problem solver teknis |
| 7 | Director | 1-3 | D↑ I↓ S↓ | Berorientasi hasil, tegas |
| 8 | Inspirational | 2-3 | I↑ D↑ | Karismatik, persuasif |
| 9 | Investigator | 3-2 | C↑ | Teliti, analitis |
| 10 | Objective Thinker | 3-4 | C↑ S↑ | Logis, metodis |
| 11 | Perfectionist | 3-5 | C↑ D↓ I↓ | Standar kualitas tinggi |
| 12 | Persuader | 2-1 | D↑ I↑ | Meyakinkan, negosiator |
| 13 | Practitioner | 2-5 | S↑ C↑ | Ahli teknis, loyal |
| 14 | Promoter | 2-4 | I↑ S↓ C↓ | Optimis, sosial |
| 15 | Result-Oriented | 1-4 | D↑ I↓ | Objektif, efisien |

**Keterangan:** ↑ = Di atas 50 (midline), ↓ = Di bawah 50

### Algoritma Pencocokan Pola

1. Tentukan status setiap dimensi: High (≥50) atau Low (<50)
2. Cocokkan dengan semua 15 pola berdasarkan aturan
3. Prioritaskan pola dengan **jumlah aturan terbanyak** (paling spesifik)
4. Jika tidak ada yang cocok → Gunakan **fallback** berdasarkan dimensi tertinggi

## 4.5 Consistency Check (Tingkat Konsistensi)

Mengukur perbedaan antara Graph 1 (Kerja) dan Graph 2 (Alami):

```
totalDiff = |G1.D - G2.D| + |G1.I - G2.I| + |G1.S - G2.S| + |G1.C - G2.C|
```

| Total Diff | Level | Interpretasi |
|------------|-------|-------------|
| 0 – 20 | **Tinggi** | Sangat konsisten, minim tekanan |
| 21 – 50 | **Sedang** | Penyesuaian wajar, cukup fleksibel |
| > 50 | **Rendah** | Penyesuaian besar, potensi stress |

## 4.6 Validity Check (Validitas Jawaban)

Sistem memeriksa 3 kondisi anomali:

| Tipe | Kondisi | Interpretasi |
|------|---------|-------------|
| **Compression** (Flat Profile) | Semua skor antara 35-65 | Bingung/bermain aman |
| **Over-Shift** (Faking Good) | ≥3 skor di atas 75 | Berusaha terlihat sempurna |
| **Under-Shift** | ≥3 skor di bawah 30 | Stres berat/sangat kritis diri |

## 4.7 Job Fit Evaluation

Mencocokkan profil DISC dengan posisi yang dilamar menggunakan keyword matching:

| Profil | Keyword Posisi yang Cocok |
|--------|--------------------------|
| Director | manager, kepala, lead, direktur, supervisor, head |
| Promoter | marketing, sales, PR, trainer, komunikasi, kreatif |
| Relater | admin, HR, support, guru, sekretaris, customer |
| Analyzer | akuntan, finance, IT, data, quality, engineer, programmer |

---

# 5. TES APTITUDE (IQ/KOGNITIF)

## 5.1 Gambaran Umum

| Parameter | Nilai |
|-----------|-------|
| Jumlah Pertanyaan | 60 |
| Durasi | 30 menit (1800 detik) |
| Format | Pilihan ganda (3-8 opsi) |
| Auto-submit | Ya, saat waktu habis |
| Tipe Soal | Analogi, pola, logika, matematika, verbal |

## 5.2 Kategori Soal

| Kategori | Contoh | Jumlah |
|----------|--------|--------|
| Klasifikasi (Odd One Out) | "Mana yang paling tidak mirip?" | ~20 |
| Analogi Verbal | "Jika Susu itu Gelas, maka Surat itu..." | ~15 |
| Pola Visual | Gambar pola yang perlu dilengkapi | ~15 |
| Logika/Silogisme | "Jika semua A adalah B..." | ~5 |
| Matematika | Perhitungan, deret angka | ~5 |

## 5.3 Formula Scoring

### Langkah 1: Hitung Jawaban Benar

```
correctCount = Jumlah jawaban yang cocok dengan kunci jawaban
```

### Langkah 2: Konversi ke Skor IQ

Menggunakan **Conversion Table** (mapping jawaban benar ke skor IQ):

| Benar | Skor IQ | Benar | Skor IQ | Benar | Skor IQ |
|-------|---------|-------|---------|-------|---------|
| 0 | 0 | 20 | 80 | 40 | 120 |
| 1 | 40 | 21 | 82 | 41 | 122 |
| 2 | 42 | 22 | 84 | 42 | 124 |
| 5 | 50 | 25 | 90 | 45 | 130 |
| 10 | 60 | 30 | 100 | 50 | 140 |
| 15 | 70 | 35 | 110 | 55 | 150 |
| 18 | 76 | 38 | 116 | 58 | 156 |
| 19 | 78 | 39 | 118 | 60 | 160 |

**Formula umum:** `Skor IQ = 40 + (correctCount - 1) × 2` (untuk correctCount ≥ 1)

### Langkah 3: Interpretasi Kategori

| Skor IQ | Kategori | Keterangan |
|---------|----------|------------|
| > 135 | **Tinggi / Superior** | Lebih dari 45 jawaban benar |
| 90 – 135 | **Rata-rata / Normal** | 30 – 45 jawaban benar |
| < 90 | **Rendah / Below Average** | Kurang dari 30 jawaban benar |

---

# 6. ANALISIS AI

## 6.1 Provider yang Didukung

| Provider | Default | Model | Keterangan |
|----------|---------|-------|------------|
| **Google Gemini** | ✅ | gemini-1.5-flash | Gratis dengan API key |
| **Custom (OpenAI Compatible)** | ❌ | Configurable | Mendukung API OpenAI-compatible |

Jika API key tidak tersedia, sistem menggunakan **Mock Analysis** dengan skor default.

## 6.2 Data Input untuk AI

AI menerima data berikut untuk analisis:

1. **Data Pribadi:** Nama, usia, domisili, agama, status pernikahan
2. **Posisi yang Dilamar**
3. **Hasil DISC:** Skor D/I/S/C, pola profil, konsistensi, job fit
4. **Hasil Aptitude:** Skor IQ, jumlah benar dari total
5. **Teks CV (OCR):** Maks 4000 karakter pertama dari hasil OCR

## 6.3 Empat Dimensi Penilaian (0-100)

| Dimensi | Bobot | Aspek yang Dinilai |
|---------|-------|-------------------|
| **CV & Experience** | **40%** | Hard skills, pengalaman relevan, kesesuaian pendidikan |
| **DISC Personality** | **25%** | Kecocokan kepribadian dengan tuntutan posisi |
| **Aptitude (Kognitif)** | **20%** | Kemampuan kognitif berdasarkan skor IQ |
| **Personal Data** | **15%** | Kesesuaian domisili, usia, kelengkapan data |

## 6.4 Formula Final Match Score

```
Final Score = (cvScore × 0.40) + (discScore × 0.25) + (aptitudeScore × 0.20) + (personalDataScore × 0.15)
```

**Contoh Perhitungan:**
```
cvScore = 85, discScore = 70, aptitudeScore = 90, personalDataScore = 80

Final = (85 × 0.40) + (70 × 0.25) + (90 × 0.20) + (80 × 0.15)
      = 34 + 17.5 + 18 + 12
      = 81.5 → 82 (dibulatkan)
```

## 6.5 Verdict (Keputusan)

| Final Score | Verdict |
|------------|---------|
| ≥ 85 | **Sangat Direkomendasikan** |
| 75 – 84 | **Direkomendasikan** |
| 50 – 74 | **Bisa Dipertimbangkan** |
| < 50 | **Tidak Direkomendasikan** |

## 6.6 Output Analisis AI

AI menghasilkan laporan markdown dengan struktur:
1. **Analisis Profil** - Evaluasi keseluruhan kandidat
2. **Analisis Data Pribadi** - Kesesuaian administratif
3. **Kecocokan DISC** - Analisis kepribadian vs posisi
4. **Kemampuan Kognitif** - Interpretasi skor aptitude
5. **Kesimpulan Komprehensif** - Verdict final dan rekomendasi

---

# 7. DASHBOARD ADMIN

## 7.1 Akses

- URL: `/admin` (memerlukan login via `/admin/login`)
- Token disimpan di `localStorage` sebagai `adminToken`

## 7.2 Fitur Tabel Kandidat

| Fitur | Deskripsi |
|-------|-----------|
| **Filter** | Berdasarkan nama, posisi, verdict, profil DISC, match score |
| **Sort** | Berdasarkan tanggal, nama, skor, atau verdict |
| **Export CSV** | Download seluruh data kandidat ke file CSV |
| **View Detail** | Navigasi ke halaman detail kandidat |
| **Delete** | Hapus kandidat dari database |

## 7.3 Informasi yang Ditampilkan

Setiap baris kandidat menampilkan:
- Nama lengkap dan posisi
- Profil DISC (mis: "Achiever #1-1")
- Match Score (%) dengan indikator warna
- Verdict (Sangat Direkomendasikan / Direkomendasikan / dll.)
- Tanggal pendaftaran

---

# 8. DETAIL KANDIDAT

## 8.1 Akses
- URL: `/admin/candidate/:id`

## 8.2 Layout Halaman

### Panel Kiri: Data Pribadi & Hasil Tes
- No HP, Agama, Golongan Darah, Alamat
- **Grafik DISC:** Bar chart D/I/S/C dengan warna (D=Merah, I=Kuning, S=Hijau, C=Biru)
- **Profil DISC:** Tipe profil dan skor numerik
- **Hasil Aptitude:** Skor IQ, jumlah benar/total

### Panel Kanan: Analisis AI
- **Rincian Penilaian (Weighted Scoring):** 4 dimensi dengan bobot
- **Total Match Score** dengan indikator warna
- **Analisis AI** dalam format Markdown
- **Data CV (OCR):** Teks hasil OCR dari CV
- **System Logs:** Informasi debug

### Fitur Tambahan
- **Regenerate Analysis:** Tombol untuk menjalankan ulang analisis AI
- **Assign to Request:** Dropdown untuk menghubungkan kandidat ke Manpower Request
- **View Original CV:** Link ke file CV di Google Drive
- **Full DISC Report:** Laporan psikometri lengkap
- **Aptitude Report:** Laporan hasil tes IQ

---

# 9. KANBAN BOARD

## 9.1 Deskripsi
Kanban board drag-and-drop untuk melacak pipeline rekrutmen kandidat.

## 9.2 Kolom Status

| Kolom | Warna | Deskripsi |
|-------|-------|-----------|
| Applied | Biru | Kandidat baru mendaftar |
| Screening | Indigo | Sedang di-review |
| Interview | Ungu | Dijadwalkan/sedang interview |
| Offered | Pink | Penawaran kerja dikirim |
| Hired | Hijau | Diterima dan mulai kerja |
| Rejected | Merah | Ditolak |

## 9.3 Fitur
- **Drag & Drop:** Pindahkan kandidat antar kolom
- **Link to Request:** Hubungkan kandidat ke Manpower Request
- **View Detail:** Klik untuk membuka detail kandidat

---

# 10. SLA MONITORING

## 10.1 Deskripsi
Halaman monitoring Service Level Agreement (SLA) untuk proses rekrutmen.

## 10.2 Statistik yang Ditampilkan
- **Stat Cards:** Ringkasan metrik SLA (jumlah, rata-rata waktu, dll.)
- **Analisis per Request:** Breakdown waktu proses setiap manpower request
- **Perhitungan SLA:** Berbasis data timestamp dari pembuatan request hingga fulfillment

---

# 11. MANPOWER PLANNING (ADMIN)

## 11.1 Akses
- URL: `/admin/manpower`

## 11.2 Fitur Admin

| Fitur | Deskripsi |
|-------|-----------|
| View All Requests | Melihat semua permintaan dari seluruh divisi |
| Approve | Menyetujui permintaan |
| Reject | Menolak dengan alasan |
| Delete | Menghapus permintaan |
| Publish | Mempublikasikan lowongan berdasarkan request |

## 11.3 Status Workflow

```
Pending → Approved → In Progress → Fulfilled → Finalized
                  ↘ Rejected
```

---

# 12. PORTAL DIVISI

## 12.1 Akses
- URL: `/portal/login` → Register/Login → `/portal`
- Akun baru memerlukan **approval admin** sebelum bisa login

## 12.2 Dashboard Portal

### Statistik (4 Kartu)
| Kartu | Hitung |
|-------|--------|
| Total Requests | Semua request dari divisi user |
| Pending | Status = 'Pending' |
| In Progress | Status = 'Approved' atau 'In Progress' |
| Fulfilled | Status = 'Fulfilled' atau 'Finalized' |

### Form Permintaan Baru (New Request)

| Field | Tipe | Opsi/Keterangan |
|-------|------|-----------------|
| Division | Dropdown | Dari daftar divisi (Settings) |
| Requester Name | Text | Nama pemohon |
| Position / Job Title | Text | Nama posisi |
| Quantity | Number | Jumlah orang dibutuhkan |
| Priority | Radio | Low / Normal / High |
| Job Description | Textarea | Deskripsi pekerjaan |
| Keperluan Hire | Dropdown | Replacement / Penambahan / Posisi Baru |
| Level Posisi | Dropdown | Staff → Senior → Head → Supervisor → Manager → GM → Direksi / Other |
| Pendidikan | Dropdown | SMP / SMA / D3 / S1 / S2 |
| Jurusan | Text | Muncul jika bukan SMP |
| Pengalaman Kerja | Dropdown | Fresh Graduate / <1 Tahun / 1-15 Tahun / >15 Tahun |
| Kualifikasi Lainnya | Textarea | Detail tambahan |

### Fitur Lain
- **View Details:** Modal detail dengan Hiring Progress (funnel visualisasi)
- **Delete:** Hapus request yang masih Pending
- **Finalize:** Selesaikan request yang sudah terpenuhi

---

# 13. VACANCY MANAGEMENT

## 13.1 Akses
- URL: `/admin/vacancies`

## 13.2 Fitur CRUD
- **Create:** Tambah lowongan baru (posisi, deskripsi, persyaratan, status)
- **Read:** Daftar semua lowongan
- **Update:** Edit detail lowongan
- **Delete:** Hapus lowongan

Lowongan yang aktif akan muncul di dropdown posisi pada form kandidat dan di halaman karir publik.

---

# 14. PENGATURAN ADMIN

## 14.1 Akses
- URL: `/admin/settings`

## 14.2 Konfigurasi AI

| Setting | Keterangan |
|---------|------------|
| **AI Provider** | Google Gemini (default) atau Custom (OpenAI Compatible) |
| **API Key** | Gemini API Key atau Custom API Key |
| **Base URL** | Hanya untuk Custom provider (default: api.openai.com/v1) |
| **Model Name** | Hanya untuk Custom provider (default: gpt-3.5-turbo) |
| **System Prompt** | Instruksi untuk AI dalam menganalisa kandidat |

## 14.3 Google Services

| Setting | Keterangan |
|---------|------------|
| Google Drive Folder ID | Folder tujuan upload CV |
| Google Sheet ID | Spreadsheet untuk data kandidat |
| Google Client ID | OAuth 2.0 Client ID |
| Google Client Secret | OAuth 2.0 Client Secret |

## 14.4 WhatsApp (WAHA)

| Setting | Keterangan |
|---------|------------|
| WAHA Base URL | URL server WAHA (mis: http://localhost:3000) |
| Session ID | Session WAHA (default: "default") |
| API Key | Optional, jika WAHA diamankan |
| Target | Nomor HP (62812...) atau Group ID (...@g.us) |

## 14.5 Manajemen Divisi
- Tambah/hapus divisi yang tersedia di form portal
- Default: IT, HR, Marketing, Finance, Operations

## 14.6 Persetujuan User Portal
- Daftar user portal berstatus "pending" yang menunggu approval

## 14.7 Keamanan Admin
- Form ganti password admin (old → new → confirm)

## 14.8 Prioritas Konfigurasi
```
Environment Variables (.env) > Database (Supabase) > Default Values
```
Settings di-cache 30 detik untuk mengurangi query database.

---

# 15. NOTIFIKASI WHATSAPP

## 15.1 Kapan Dikirim
Otomatis dikirim setelah analisis AI selesai terhadap kandidat baru.

## 15.2 Format Pesan

```
📄 Kandidat Baru Dianalisis!

Nama: [Nama Kandidat]
Posisi: [Posisi]
No. HP: [Nomor]

━━━━━━━━━━━━━━━━━━
📊 HASIL ANALISIS AI
━━━━━━━━━━━━━━━━━━

Total Match Score: [X]%
Keputusan: [Verdict]

Rincian Nilai:
• CV & Pengalaman: [X]/100
• Kecocokan DISC: [X]/100
• Kemampuan Kognitif: [X]/100
• Data Pribadi: [X]/100

━━━━━━━━━━━━━━━━━━
🧠 HASIL TES APTITUDE
━━━━━━━━━━━━━━━━━━
• Skor: [X] ([benar]/[total] benar) - [Kategori]

Profil DISC: [Tipe Profil]

Cek dashboard admin untuk detail lengkap.
```

## 15.3 Kategori Aptitude dalam Notifikasi
| Skor | Label |
|------|-------|
| > 135 | **Tinggi** |
| 90 – 135 | **Rata-rata** |
| < 90 | **Rendah** |

---

# 16. LAPORAN PDF

## 16.1 Konten Report
Laporan PDF yang di-generate mencakup:

1. **Halaman Biodata** - Data pribadi kandidat lengkap
2. **Halaman Analisis AI** - Skor per dimensi, verdict, analisis narrative
3. **Halaman DISC** - Grafik bar D/I/S/C, tabel skor, profil tipe, kekuatan/kelemahan
4. **Halaman Aptitude** - Skor IQ, jumlah benar, kategori

## 16.2 Elemen Visual
- Header dengan logo perusahaan
- Section titles dengan garis pemisah
- Tabel data terstruktur
- Grafik batang DISC berwarna
- Markdown rendering untuk analisis AI

---

# 17. DATABASE & SKEMA DATA

## 17.1 Model Candidate

| Field | Tipe | Keterangan |
|-------|------|------------|
| id | Int (Auto) | Primary Key |
| fullName | String | Nama lengkap |
| email | String (Unique) | Email (tidak boleh duplikat) |
| phone | String | Nomor telepon |
| position | String? | Posisi yang dilamar |
| religion | String? | Agama |
| bloodType | String? | Golongan darah |
| address | String? | Alamat |
| nik | String? | Nomor KTP |
| simOwnership | String? | Kepemilikan SIM |
| simNumber | String? | Nomor SIM |
| medicalHistory | String? | Riwayat medis |
| experience | String? | JSON string pengalaman kerja |
| education | String? | JSON string pendidikan |
| cvUrl | String? | URL CV di Google Drive |
| cvText | String? | Teks OCR dari CV |
| cvDriveId | String? | ID file di Google Drive |
| createdAt | DateTime | Timestamp pendaftaran |

## 17.2 Model DiscResult

| Field | Tipe | Keterangan |
|-------|------|------------|
| id | Int (Auto) | Primary Key |
| candidateId | Int (Unique) | FK ke Candidate |
| dScore | Int | Skor Dominance |
| iScore | Int | Skor Influence |
| sScore | Int | Skor Steadiness |
| cScore | Int | Skor Compliance |
| profile | String | Nama profil DISC |
| answers | String | JSON jawaban mentah |

## 17.3 Model Analysis

| Field | Tipe | Keterangan |
|-------|------|------------|
| id | Int (Auto) | Primary Key |
| candidateId | Int (Unique) | FK ke Candidate |
| matchScore | Int | Final weighted score |
| content | String | Markdown analisis AI |
| ocrText | String? | Teks OCR dari CV |
| createdAt | DateTime | Timestamp analisis |

## 17.4 Relasi

```
Candidate (1) ←→ (1) DiscResult
Candidate (1) ←→ (1) Analysis
```

---

# LAMPIRAN

## A. Daftar 15 Profil DISC Lengkap

### Achiever (High D, Low S)
- **Kekuatan:** Mandiri, fokus hasil, berani ambil risiko, pemecah masalah cepat
- **Perlu Ditingkatkan:** Sabar dengan proses, kurangi defensif, peka terhadap tim
- **Tujuan:** Hasil nyata dan kemenangan
- **Nilai bagi Organisasi:** Pendorong produktivitas utama

### Agent (High S)
- **Kekuatan:** Suportif, pendengar empatik, menjaga harmoni, loyal
- **Perlu Ditingkatkan:** Tegas menolak, berani konfrontasi, lebih inisiatif

### Appraiser (High I, High C)
- **Kekuatan:** Kritis tapi persuasif, diplomatis, mengutamakan kualitas
- **Perlu Ditingkatkan:** Kurangi over-analisis, terima ketidaksempurnaan

### Counselor (High I, High S)
- **Kekuatan:** Hangat, membangun hubungan jangka panjang, persuasif halus
- **Perlu Ditingkatkan:** Fokus tugas, tegas dengan deadline

### Creative (High D, High I, High C)
- **Kekuatan:** Inovatif, visioner, dinamis, mampu memimpin perubahan
- **Perlu Ditingkatkan:** Fokus satu hal, kurangi kontrol berlebih

### Developer (High D, High C)
- **Kekuatan:** Mandiri, pemecah masalah kompleks, standar tinggi, gigih
- **Perlu Ditingkatkan:** Lebih komunikatif, kurangi perfeksionisme kaku

### Director (Pure High D)
- **Kekuatan:** Berorientasi hasil, tegas, berani ambil risiko, visioner
- **Perlu Ditingkatkan:** Sabar mendengarkan, kurangi arogansi

### Inspirational (High I, High D)
- **Kekuatan:** Karismatik, persuasif dan berani, optimis, mampu mobilisasi
- **Perlu Ditingkatkan:** Perhatikan detail, dengarkan saran, kurangi impulsif

### Investigator (High C)
- **Kekuatan:** Teliti, berbasis data, tenang dan analitis, terorganisir
- **Perlu Ditingkatkan:** Cepat ambil keputusan, berani ambil risiko

### Objective Thinker (High C, High S)
- **Kekuatan:** Berpikir jernih, sabar dalam analisis, diplomatis, dependable
- **Perlu Ditingkatkan:** Lebih spontan, berani ungkapkan opini

### Perfectionist (Pure High C)
- **Kekuatan:** Standar kualitas ekstrem, akurasi tinggi, prosedural, disiplin
- **Perlu Ditingkatkan:** Terima kesalahan manusiawi, delegasikan tugas

### Persuader (High D, High I)
- **Kekuatan:** Sangat meyakinkan, antusias, jago negosiasi
- **Perlu Ditingkatkan:** Konsistensi, kelola detail, kurangi janji berlebih

### Practitioner (High S, High C)
- **Kekuatan:** Ahli teknis, loyal, pelayanan prima, menjaga standar
- **Perlu Ditingkatkan:** Lebih percaya diri, keluar zona nyaman

### Promoter (Pure High I)
- **Kekuatan:** Optimis, verbal, sosial, inspirator, kreatif
- **Perlu Ditingkatkan:** Manajemen waktu, follow-up, fokus

### Result-Oriented (High D, Low I)
- **Kekuatan:** Objektif, to the point, efisien, mandiri, tegas
- **Perlu Ditingkatkan:** Senyum dan sapa, jelaskan 'mengapa', validasi tim

---

## B. Rekomendasi Jabatan per Profil DISC

| Profil | Jabatan yang Direkomendasikan |
|--------|------------------------------|
| Director | Manager, Sales Manager, Project Manager, Entrepreneur |
| Promoter | Public Relations, Marketing, Trainer, Customer Service |
| Relater | Human Resources, Customer Support, Konselor, Guru |
| Analyzer | Akuntan, Programmer/IT, Engineer, Quality Control, Data Analyst |
| Persuader | Sales Executive, Negosiator, Manager Pemasaran |
| Practitioner | Teknisi Spesialis, Ahli Logistik, Researcher |
| Objective Thinker | System Analyst, Perencana Keuangan |
| Counselor | HR Specialist, Psikolog, Konsultan Pendidikan |

---

*Dokumen ini di-generate secara otomatis berdasarkan analisis kode sumber aplikasi HR Auto Screening System v1.0.*
