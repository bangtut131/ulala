const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// --- COLORS (Tailwind Palette) ---
const COLORS = {
    slate900: '#0f172a',
    slate800: '#1e293b',
    slate700: '#334155',
    slate600: '#475569',
    slate500: '#64748b',
    slate400: '#94a3b8',
    slate300: '#cbd5e1',
    slate200: '#e2e8f0',
    slate100: '#f1f5f9',
    slate50: '#f8fafc',

    blue900: '#1e3a8a',
    blue800: '#1e40af',
    blue700: '#1d4ed8', // approximation
    blue500: '#3b82f6',
    blue400: '#60a5fa',
    blue200: '#bfdbfe',
    blue50: '#eff6ff',

    sky500: '#0ea5e9', // For DISC graphs

    green900: '#14532d',
    green800: '#166534',
    green600: '#16a34a',
    green500: '#22c55e',
    green400: '#4ade80',
    green200: '#bbf7d0',
    green50: '#f0fdf4',

    yellow500: '#eab308',
    yellow400: '#facc15',
    yellow200: '#fef08a', // approx

    red500: '#ef4444',
    red400: '#f87171',

    white: '#ffffff',
    black: '#000000'
};

const PAGE_MARGIN = 40;
const CONTENT_WIDTH = 595 - (PAGE_MARGIN * 2);

// --- HELPER FUNCTIONS ---

function drawHeader(doc, title, subtitle) {
    doc.fillColor(COLORS.slate800)
        .fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
    if (subtitle) {
        doc.moveDown(0.2);
        doc.fontSize(10).font('Helvetica').fillColor(COLORS.slate500)
            .text(subtitle, { align: 'center' });
    }
    doc.moveDown(1.5);
    drawHr(doc);
    doc.moveDown(1);
    doc.fillColor('black'); // Reset
}

function drawSectionTitle(doc, title) {
    doc.moveDown(1.5);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.slate800)
        .text(title.toUpperCase(), PAGE_MARGIN, doc.y, { underline: false });
    doc.moveDown(0.5);
    doc.strokeColor(COLORS.slate200).lineWidth(2).moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_MARGIN + 50, doc.y).stroke();
    doc.moveDown(0.8);
    doc.fillColor(COLORS.slate700).font('Helvetica').fontSize(10);
    doc.x = PAGE_MARGIN; // Reset X
}

function drawHr(doc) {
    doc.strokeColor(COLORS.slate200).lineWidth(1)
        .moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y).stroke();
}

function drawLabelValue(doc, label, value, xOffset = 0) {
    const startX = doc.x;
    const startY = doc.y;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.slate500).text(label, startX + xOffset, startY, { width: 150, continued: false });
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.slate800).text(value || '-', startX + xOffset, startY + 12);
    doc.moveDown(0.5);
}

// Simple Table Drawer (Generic)
function drawTable(doc, headers, rows, colWidths) {
    const startY = doc.y;
    let currentY = startY;
    const cellPadding = 5;

    // Header
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.slate600);
    let currentX = PAGE_MARGIN;

    doc.save().fillColor(COLORS.slate100).rect(PAGE_MARGIN, currentY, CONTENT_WIDTH, 20).fill().restore();

    headers.forEach((header, i) => {
        doc.text(header.toUpperCase(), currentX + cellPadding, currentY + 6, { width: colWidths[i] - (cellPadding * 2), align: 'left' });
        currentX += colWidths[i];
    });

    currentY += 20;

    // Rows
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.slate800);
    rows.forEach((row, rowIndex) => {
        // Calculate Row Height needed based on max content lines
        // A simple approximation is finding max newlines * lineheight
        // Or using PDFKit heightOfString
        let maxH = 20;
        row.forEach((cell, i) => {
            const h = doc.heightOfString(String(cell || '-'), { width: colWidths[i] - (cellPadding * 2) });
            if (h > maxH) maxH = h;
        });

        // Add padding
        const rowHeight = maxH + 10;

        if (currentY + rowHeight > doc.page.height - 50) {
            doc.addPage();
            currentY = PAGE_MARGIN;
        }

        currentX = PAGE_MARGIN;
        row.forEach((cell, i) => {
            doc.text(String(cell || '-'), currentX + cellPadding, currentY + 5, { width: colWidths[i] - (cellPadding * 2), align: 'left' });
            currentX += colWidths[i];
        });

        doc.save().strokeColor(COLORS.slate200).lineWidth(0.5).moveTo(PAGE_MARGIN, currentY + rowHeight).lineTo(PAGE_MARGIN + CONTENT_WIDTH, currentY + rowHeight).stroke().restore();
        currentY += rowHeight;
    });

    doc.y = currentY + 10;
}

// --- CONSTANTS ---
const aptitudeKey = {
    1: 'Ular', 2: 'Hewan', 3: '(d)', 4: 'Apel', 5: '(b)',
    6: '16', 7: 'Keponakan Laki-laki', 8: '(e)', 9: 'Amplop', 10: '(e)',
    11: '2325', 12: 'Salah', 13: '(d)', 14: 'Rumah', 15: '(h)',
    16: 'Senyum', 17: '(b)', 18: 'Mustahil untuk mengetahui apakah Bill or Peter yang lebih tinggi', 19: 'Dompet', 20: '31311313',
    21: 'Kota', 22: '(b)', 23: 'Meriam', 24: 'Salah', 25: '(b)',
    26: '(b) I', 27: '(d)', 28: '25%', 29: 'Kuningan', 30: '(e)',
    31: 'Terowongan', 32: '23', 33: 'Jerami', 34: 'Delapan', 35: '(b)',
    36: 'Roket', 37: '(b)', 38: 'Tali Sepatu', 39: '(d)', 40: 'Sepuluh sen',
    41: '(d)', 42: 'Negara', 43: '(e)', 44: 'Benar', 45: 'Kanguru',
    46: '(d)', 47: 'Ranting', 48: '5', 49: '(e)', 50: 'Sikut',
    51: 'C', 52: '25', 53: 'Keju', 54: '(h) 48', 55: 'Salmon',
    56: 'Benar', 57: '(e)', 58: 'Hektar', 59: '(c)', 60: '72mm'
};

// Markdown Parser for PDF (with auto-paging and background refilling)
function printMarkdown(doc, text, options = {}) {
    if (!text) return;
    const { color = COLORS.slate300, fontSize = 10, indent = 0, width = CONTENT_WIDTH } = options;
    const lines = text.split('\n');
    doc.fontSize(fontSize).fillColor(color);

    const checkPageBreak = (heightNeeded = 15) => {
        if (doc.y + heightNeeded > doc.page.height - PAGE_MARGIN) {
            doc.addPage();
            // Re-apply Dark Theme Background for new page
            doc.rect(0, 0, 595, 842).fill(COLORS.slate900);

            // Re-draw container background logic removed per user request

            doc.y = PAGE_MARGIN + 20; // Reset Y inside container
            doc.fontSize(fontSize).fillColor(color); // Reset font
        }
    };

    lines.forEach(line => {
        let l = line.trim();
        if (!l) {
            checkPageBreak(10);
            doc.moveDown(0.5);
            return;
        }

        // Calculate height roughly
        // This isn't perfect but PDFKit auto-adds pages on text flow which BREAKS our background logic
        // So we strictly try to manage it.
        // Actually, doc.text() supports 'continue' but managing background is hard.
        // We will trust checkPageBreak to force a new page manually BEFORE the text creates a mess.

        // Simple logic: Heuristic height
        // A standard line is ~12-15pts. 
        // We use width constrained text.
        const estimatedHeight = doc.heightOfString(l, { width: width - indent, align: 'justify' });
        checkPageBreak(estimatedHeight + 10);

        if (l.startsWith('###')) {
            doc.font('Helvetica-Bold').fontSize(fontSize + 2).fillColor(COLORS.white).text(l.replace(/###/g, '').trim(), { indent, width: width - indent, align: 'left' });
            doc.font('Helvetica').fontSize(fontSize).fillColor(color);
        } else if (l.startsWith('**') && l.endsWith('**')) {
            doc.font('Helvetica-BoldOblique').fillColor(COLORS.white).text(l.replace(/\*\*/g, '').trim(), { indent, width: width - indent, align: 'justify' });
            doc.font('Helvetica').fillColor(color);
        } else if (l.startsWith('- ')) {
            doc.text(`•  ${l.substring(2)}`, { indent: indent + 10, width: width - (indent + 10), align: 'justify' });
        } else {
            doc.text(l, { indent, width: width - indent, align: 'justify' });
        }

        doc.moveDown(0.2);
    });
}

// Draw Bar Chart (Reusing helper but customizable)
function drawBarChart(doc, data, label) {
    const chartHeight = 80;
    const barWidth = 30;
    const gap = 30;
    const startX = doc.x + 20;
    const startY = doc.y + chartHeight + 20;
    const maxValue = 100;

    doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.slate800).text(label, doc.x, doc.y).moveDown(2);

    // Axis Line
    doc.save()
        .strokeColor(COLORS.slate300)
        .lineWidth(1)
        .moveTo(startX - 10, startY)
        .lineTo(startX + (data.length * (barWidth + gap)) + 10, startY)
        .stroke()
        .restore();

    data.forEach((item, i) => {
        const barHeight = (item.value / maxValue) * chartHeight;
        const x = startX + (i * (barWidth + gap));
        const y = startY - barHeight;

        // Bar
        doc.save()
            .fillColor(item.color || COLORS.sky500)
            .rect(x, y, barWidth, barHeight)
            .fill()
            .restore();

        // Value Label
        doc.fontSize(8).fillColor(COLORS.slate800).text(item.value, x, y - 10, { width: barWidth, align: 'center' });

        // X Label
        doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.slate500).text(item.label, x, startY + 5, { width: barWidth, align: 'center' });
    });

    doc.y = startY + 30;
}


// --- PAGE GENERATORS ---

function generateBiodataPage(doc, candidate) {
    doc.addPage();
    drawHeader(doc, 'BIODATA KANDIDAT', candidate.position ? `Posisi: ${candidate.position.toUpperCase()}` : '');

    // 1. Personal Information grid
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.slate800).text('INFORMASI PRIBADI');
    doc.moveDown(0.5);

    const startY = doc.y;
    const col2X = PAGE_MARGIN + (CONTENT_WIDTH / 2) + 20;

    // Col 1
    drawLabelValue(doc, 'NAMA LENGKAP', candidate.fullName, 0);
    drawLabelValue(doc, 'NIK', candidate.nik, 0);
    drawLabelValue(doc, 'EMAIL', candidate.email, 0);
    drawLabelValue(doc, 'NO. TELEPON', candidate.phone, 0);
    drawLabelValue(doc, 'TANGGAL LAHIR', candidate.dob ? new Date(candidate.dob).toLocaleDateString('id-ID') : '-', 0);
    drawLabelValue(doc, 'ALAMAT', candidate.address, 0);

    // Col 2 (Reset Y)
    doc.y = startY;
    const drawRight = (l, v) => {
        const currY = doc.y;
        doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.slate500).text(l, col2X, currY, { width: 150 });
        doc.font('Helvetica').fontSize(10).fillColor(COLORS.slate800).text(v || '-', col2X, currY + 12);
        doc.moveDown(0.5);
    };

    drawRight('AGAMA', candidate.religion);
    drawRight('GOL. DARAH', candidate.bloodType);
    drawRight('JENIS SIM', candidate.simOwnership);
    drawRight('NOMOR SIM', candidate.simNumber);
    drawRight('KONTAK DARURAT', candidate.emergencyContact);
    drawRight('RIWAYAT PENYAKIT', candidate.medicalHistory);

    doc.y = Math.max(doc.y, startY + 200);
    drawHr(doc);

    // Info Tambahan Row
    doc.moveDown();
    drawLabelValue(doc, 'INFO TAMBAHAN', candidate.otherInfo);
    doc.moveDown();

    // 2. Education
    drawSectionTitle(doc, 'Riwayat Pendidikan');
    if (candidate.education && Array.isArray(candidate.education) && candidate.education.length > 0) {
        const headers = ['Jenjang', 'Institusi', 'Tahun'];
        const rows = candidate.education.map(e => [e.level, e.school, e.year]);
        const validRows = rows.filter(r => r[0] || r[1]);
        if (validRows.length > 0) {
            drawTable(doc, headers, validRows, [80, 315, 100]);
        } else doc.text('-');
    } else doc.text('-');

    // 3. Experience
    drawSectionTitle(doc, 'Pengalaman Kerja');
    if (candidate.experience && Array.isArray(candidate.experience) && candidate.experience.length > 0) {
        const headers = ['Perusahaan', 'Posisi', 'Durasi', 'Referensi'];
        const rows = candidate.experience.map(e => [e.company, e.role, e.duration, `${e.referenceName || '-'} (${e.referencePhone || '-'})`]);
        const validRows = rows.filter(r => r[0] || r[1]);
        if (validRows.length > 0) {
            drawTable(doc, headers, validRows, [140, 120, 90, 145]);
        } else doc.text('-');
    } else doc.text('-');

    // 4. Personality (AS TABLE)
    drawSectionTitle(doc, 'Profil Singkat');

    // Prepare Data
    const strengths = Array.isArray(candidate.strengths) ? candidate.strengths.map(s => `• ${s}`).join('\n') : (candidate.strengths || '-');
    const weaknesses = Array.isArray(candidate.weaknesses) ? candidate.weaknesses.map(s => `• ${s}`).join('\n') : (candidate.weaknesses || '-');

    // Headers: Category | Description
    const pHeaders = ['KATEGORI', 'KETERANGAN'];
    // Rows
    const pRows = [
        ['Pencapaian Terbesar', candidate.biggestAchievement || '-'],
        ['Kelebihan (Strengths)', strengths],
        ['Kekurangan (Weaknesses)', weaknesses]
    ];

    drawTable(doc, pHeaders, pRows, [150, 345]);
}

// NEW: Generates the Analysis Part (DISC + Aptitude + AI)
// PIXEL-PERFECT REPLICATION OF CandidateDetail.jsx, DiscResultReport.jsx, AptitudeResultReport.jsx
function generateAnalysisPage(doc, candidate, discResult, aptitudeResult, analysisData) {
    if (!candidate) return;

    // --- PAGE 1: AI ANALYSIS (DARK THEME) ---
    // Background: #0f172a

    if (analysisData) {
        doc.addPage();

        doc.rect(0, 0, 595, 842).fill(COLORS.slate900);

        // Header (White)
        doc.fillColor(COLORS.white).fontSize(18).font('Helvetica-Bold').text('HASIL ANALISA & SCREENING', PAGE_MARGIN, PAGE_MARGIN, { align: 'center' });
        doc.fontSize(10).fillColor(COLORS.slate400).text('AI-Powered Assessment', { align: 'center' });
        doc.moveDown(2);

        // WEIGHTED SCORE BREAKDOWN (bg-slate-800/80 border border-white/10)
        const gridY = doc.y;
        const gridH = 80;
        doc.save()
            .roundedRect(PAGE_MARGIN, gridY, CONTENT_WIDTH, gridH, 8)
            .fill(COLORS.slate800) // approximate opacity
            .strokeColor('rgba(255,255,255,0.1)').lineWidth(1).stroke()
            .restore();

        // 4 Columns
        const colW = CONTENT_WIDTH / 4;
        const items = [
            { l: 'CV & Exp', v: analysisData.details?.cvScore || 0 },
            { l: 'DISC', v: analysisData.details?.discScore || 0 },
            { l: 'Aptitude', v: analysisData.details?.aptitudeScore || 0 },
            { l: 'Personal', v: analysisData.details?.personalDataScore || 0 }
        ];

        items.forEach((item, i) => {
            const x = PAGE_MARGIN + (i * colW);
            // Label
            doc.fontSize(8).fillColor(COLORS.slate500).text(item.l.toUpperCase(), x, gridY + 15, { width: colW, align: 'center' });
            // Value
            const valColor = item.v >= 75 ? COLORS.green400 : COLORS.white;
            doc.fontSize(20).font('Helvetica-Bold').fillColor(valColor).text(item.v, x, gridY + 35, { width: colW, align: 'center' });

            // Vertical Divider
            if (i < 3) {
                doc.save().strokeColor('rgba(255,255,255,0.1)').moveTo(x + colW, gridY + 10).lineTo(x + colW, gridY + gridH - 10).stroke().restore();
            }
        });

        // TOTAL SCORE ROW (bg-slate-900/50 border-t)
        const footerY = gridY + gridH + 10;
        const footerH = 40;
        doc.save()
            .roundedRect(PAGE_MARGIN, footerY, CONTENT_WIDTH, footerH, 8)
            .fill(COLORS.slate800)
            .strokeColor('rgba(255,255,255,0.1)').lineWidth(1).stroke()
            .restore();

        const totalScore = analysisData.matchScore || 0;
        const totalColor = totalScore >= 80 ? COLORS.green400 : totalScore >= 50 ? COLORS.yellow400 : COLORS.red400;

        doc.fontSize(10).font('Helvetica').fillColor(COLORS.slate400).text('Total Match Score', PAGE_MARGIN + 20, footerY + 14);
        doc.fontSize(14).font('Helvetica-Bold').fillColor(totalColor).text(`${totalScore} / 100`, PAGE_MARGIN, footerY + 12, { align: 'right', width: CONTENT_WIDTH - 20 });

        doc.y = footerY + footerH + 30;

        // REMOVED VERDICT BADGE PER USER REQUEST
        // doc.moveDown(3);

        // CONTENT (No background box per user request)
        // We calculate start of content box
        const contentStartY = doc.y;

        // Initial Background for first page of content
        // Removed semi-transparent overlay box as it caused rendering issues (yellow).
        // Text sits directly on page background.

        doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.white).text('Analisa AI', PAGE_MARGIN + 20, contentStartY + 10);
        doc.moveDown(1);

        // Render Markdown content (Width constrained to fit inside box)
        printMarkdown(doc, analysisData.content, {
            color: COLORS.slate300,
            fontSize: 10,
            indent: 20,
            width: CONTENT_WIDTH - 40 // Padding 20 on each side
        });
    }

    // --- PAGE 2: DISC REPORT (LIGHT THEME) ---
    // As seen in DiscResultReport.jsx: bg-white text-slate-900 border-black headers
    if (discResult) {
        doc.addPage();
        // Reset to white styling enforced by new page default, but let's be sure
        doc.fillColor(COLORS.black);

        const fr = discResult.fullResult || {};

        // Header
        // Name, Position, Date row
        const dateStr = candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '-';

        doc.fontSize(11).font('Helvetica-Bold').text(`Nama: ${candidate.fullName}`, PAGE_MARGIN, PAGE_MARGIN);
        doc.text(`Posisi: ${candidate.position || '-'}`, PAGE_MARGIN + 200, PAGE_MARGIN);
        doc.text(`Tanggal: ${dateStr}`, PAGE_MARGIN + 400, PAGE_MARGIN);

        doc.moveDown(0.5);
        doc.save().moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y).lineWidth(2).strokeColor(COLORS.black).stroke().restore();
        doc.moveDown(2);

        // --- GRAPHS ROW ---
        const startGraphY = doc.y;

        // Graph 1
        const g1Data = fr.graph1 ? [
            { label: 'D', value: fr.graph1.D },
            { label: 'I', value: fr.graph1.I },
            { label: 'S', value: fr.graph1.S },
            { label: 'C', value: fr.graph1.C }
        ] : [];

        const g2Data = fr.graph2 ? [
            { label: 'D', value: fr.graph2.D },
            { label: 'I', value: fr.graph2.I },
            { label: 'S', value: fr.graph2.S },
            { label: 'C', value: fr.graph2.C }
        ] : [];

        // We draw Line Charts style bars (since PDFKit hard to do curve lines easily, we stick to Bar but color matched)
        // Wait, User said "Sama persis". Frontend uses LineChart.
        // It is very hard to draw curved spline charts in PDFKit manually without separate lib.
        // I will stick to BarCharts but ensure colors match the dots in frontend (Red/Yellow/Green/Blue logic).
        // Actually frontend `LineChart` uses `stroke="#0ea5e9"` (Sky Blue) for the line, but `CustomDot` is Sky Blue.
        // The BAR chart below it (in `CandidateDetail.jsx`) uses different colors for D, I, S, C bars.
        // `DiscResultReport.jsx` (the detailed report) uses LineChart.
        // `CandidateDetail.jsx` (the summary) uses BarChart.
        // The user said "Tampilannya harus sama persis dengan VIEW DETAIL".
        // "View Detail" usually refers to `CandidateDetail.jsx`.
        // BUT `CandidateDetail.jsx` embeds `DiscResultReport` at the bottom!
        // The screenshot shows Line Charts for "Grafik 1" and "Grafik 2".
        // So I must mimic the Line Charts. I will try to draw a simple polyline graph.

        const drawLineGraph = (data, title, sub) => {
            const h = 100;
            const w = (CONTENT_WIDTH / 2) - 20;
            const x = doc.x;
            const y = doc.y;

            // Title
            doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.black).text(title, x, y);
            doc.fontSize(9).font('Helvetica').fillColor(COLORS.slate600).text(sub, x, y + 12);

            const graphY = y + 40;
            // Border
            doc.save().rect(x, graphY, w, h).strokeColor(COLORS.slate400).stroke().restore();

            // Reference line 50
            const midY = graphY + (h / 2);
            doc.save().moveTo(x, midY).lineTo(x + w, midY).dash(3, { space: 3 }).strokeColor(COLORS.slate400).stroke().restore();

            // Points
            // D, I, S, C are equidistant
            const step = w / 4;
            const startPtX = x + (step / 2);

            const points = data.map((d, i) => {
                return {
                    x: startPtX + (i * step),
                    y: graphY + h - ((d.value / 100) * h),
                    val: d.value
                };
            });

            // Draw Line
            doc.save().strokeColor(COLORS.sky500).lineWidth(2).moveTo(points[0].x, points[0].y);
            points.forEach(p => doc.lineTo(p.x, p.y));
            doc.stroke().restore();

            // Draw Dots
            points.forEach(p => {
                doc.save().circle(p.x, p.y, 3).fillColor(COLORS.sky500).fill().strokeColor(COLORS.white).lineWidth(1).stroke().restore();
                // Value Text
                // doc.fontSize(8).fillColor(COLORS.black).text(p.val, p.x - 5, p.y - 10); // Optional
            });

            // X Labels
            const labels = ['D', 'I', 'S', 'C'];
            labels.forEach((l, i) => {
                doc.text(l, startPtX + (i * step) - 3, graphY + h + 5);
            });
        };

        const leftX = PAGE_MARGIN;
        const rightX = PAGE_MARGIN + (CONTENT_WIDTH / 2) + 20;

        doc.x = leftX;
        drawLineGraph(g1Data, 'Grafik 1: Adaptasi', 'Respons Terhadap Lingkungan');

        doc.y = startGraphY; // Reset Y for right col
        doc.x = rightX;
        drawLineGraph(g2Data, 'Grafik 2: Alami', 'Perilaku Dasar');

        doc.y = startGraphY + 160; // Push down past graphs

        // --- PEAKS BOXES ---
        // Mimic "Titik Paling Tinggi" boxes

        // Helper to find max trait
        const getPrimaryTrait = (dataItems) => {
            if (!dataItems || dataItems.length === 0) return '-';
            // sort desc
            const sorted = [...dataItems].sort((a, b) => b.value - a.value);
            return `${sorted[0].label} Tinggi`;
        };

        const trait1 = getPrimaryTrait(g1Data);
        const trait2 = getPrimaryTrait(g2Data);

        const drawPeakBox = (x, title, subtitle, pattern, trait) => {
            const w = (CONTENT_WIDTH / 2) - 20;
            doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.slate700).text(title, x, doc.y);
            doc.fontSize(9).font('Helvetica').fillColor(COLORS.slate600).text(subtitle, x, doc.y + 12);

            const boxY = doc.y + 30;
            const boxH = 60;
            // Border
            doc.save().rect(x, boxY, w, boxH).strokeColor(COLORS.slate400).stroke().restore();

            // Top Half (Pattern)
            doc.save().fillColor(COLORS.slate50).rect(x + 1, boxY + 1, w - 2, 29).fill().restore();
            doc.save().moveTo(x, boxY + 30).lineTo(x + w, boxY + 30).strokeColor(COLORS.slate300).stroke().restore();

            doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.black).text(pattern || '-', x, boxY + 10, { width: w, align: 'center' });

            // Bottom Half (Trait)
            doc.fillColor(COLORS.blue800).text(trait || '-', x, boxY + 40, { width: w, align: 'center' });
        };

        const peaksY = doc.y;
        doc.x = leftX;
        drawPeakBox(leftX, 'Titik Paling Tinggi pada Grafik 1', 'Perilaku "Adaptasi" Anda', fr.profile1?.pattern, trait1);

        doc.y = peaksY;
        drawPeakBox(rightX, 'Titik Paling Tinggi pada Grafik 2', 'Perilaku "Alami" Anda', fr.profile2?.pattern, trait2);

        // Ensure enough space before analysis columns to avoid overlap
        // Box ends at peaksY + 30 + 60 = peaksY + 90
        // Let's give some margin
        doc.y = peaksY + 150;

        // --- DETAILED ANALYSIS ROW ---
        // Two columns, white bg, border gray, shadow-sm

        const analysisY = doc.y;

        const TENDENCY_MAP = {
            'goal': 'TUJUAN',
            'judgeOthers': 'MENILAI ORANG LAIN',
            'influenceOthers': 'MEMPENGARUHI ORANG LAIN',
            'valueToOrg': 'NILAI TERHADAP ORGANISASI',
            'overUse': 'BERLEBIHAN MENGGUNAKAN',
            'underPressure': 'KETIKA DI BAWAH TEKANAN',
            'fears': 'KETAKUTAN'
        };

        const drawAnalysisCol = (x, profile, simulate = false) => {
            const w = (CONTENT_WIDTH / 2) - 20;
            const start = doc.y;
            const innerX = x + 10;
            const innerW = w - 20;

            // 1. Calculate required height first
            let simY = 0;

            // Header height
            simY += 10; // Top padding
            simY += 15; // Header text
            simY += 20; // Gap

            // Set font for simulation to match drawing
            doc.fontSize(9).font('Helvetica');

            const sections = [
                { title: 'KEKUATAN UTAMA', items: profile.analysis?.strength },
                { title: 'MEMPERBAIKI EFEKTIVITAS DENGAN :', items: profile.analysis?.improve },
                { title: 'KECENDERUNGAN', map: profile.analysis?.tendencies }
            ];

            sections.forEach(sec => {
                simY += 15; // Section Title
                simY += 5;  // Gap

                if (sec.items) {
                    sec.items.forEach(it => {
                        simY += doc.heightOfString(`• ${it}`, { width: innerW - 5 }) + 8;
                    });
                } else if (sec.map) {
                    Object.entries(sec.map).forEach(([k, v]) => {
                        const label = TENDENCY_MAP[k] || k.toUpperCase();
                        const textStr = `• ${label}: ${v}`;
                        simY += doc.heightOfString(textStr, { width: innerW - 5 }) + 8;
                    });
                }
                simY += 15; // Section gap
            });

            // 2. Draw Box with calculated height
            const boxH = simY + 10; // Add bottom padding

            if (simulate) return boxH;

            doc.save().rect(x, start, w, boxH).strokeColor(COLORS.slate300).stroke().restore();

            // 3. Draw Content
            let curY = start + 10;

            doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.blue700).text(`Grafik: ${profile.pattern}`, innerX, curY);
            curY += 35; // increased from 20 to match simY calculation roughly + extra

            sections.forEach(sec => {
                doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.slate700).text(sec.title, innerX, curY);
                curY += 20; // increased from 15
                doc.font('Helvetica').fillColor(COLORS.slate700);

                if (sec.items) {
                    sec.items.forEach(it => {
                        doc.text(`• ${it}`, innerX + 5, curY, { width: innerW - 5 });
                        curY += doc.heightOfString(`• ${it}`, { width: innerW - 5 }) + 8;
                    });
                } else if (sec.map) {
                    Object.entries(sec.map).forEach(([k, v]) => {
                        const label = TENDENCY_MAP[k] || k.toUpperCase(); // Translate key
                        const textStr = `• ${label}: ${v}`;
                        doc.text(textStr, innerX + 5, curY, { width: innerW - 5 });
                        curY += doc.heightOfString(textStr, { width: innerW - 5 }) + 8;
                    });
                }
                curY += 15;
            });

            return boxH; // Return height for correct positioning of next elements
        };

        doc.y = analysisY;

        // 1. Calculate Heights first
        let h1 = 0, h2 = 0;
        if (fr.profile1) h1 = drawAnalysisCol(leftX, fr.profile1, true); // Simulate
        if (fr.profile2) h2 = drawAnalysisCol(rightX, fr.profile2, true); // Simulate

        const maxH = Math.max(h1, h2);

        // 2. Check Page Break
        if (analysisY + maxH > doc.page.height - PAGE_MARGIN) {
            doc.addPage();
            doc.y = PAGE_MARGIN + 30; // Reset Y safely
        }

        const realStartY = doc.y;

        // 3. Draw Real
        if (fr.profile1) {
            doc.y = realStartY;
            drawAnalysisCol(leftX, fr.profile1, false);
        }
        if (fr.profile2) {
            doc.y = realStartY;
            drawAnalysisCol(rightX, fr.profile2, false);
        }

        doc.y = realStartY + maxH + 20; // Reduced spacing to 20

        // --- EXECUTIVE SUMMARY (Bottom) ---
        // border-t-4 border-slate-700
        if (doc.y > doc.page.height - 180) { // Ensure space for summary boxes
            doc.addPage();
            doc.y = PAGE_MARGIN; // Reset to top
        }

        doc.save().moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y).lineWidth(4).strokeColor(COLORS.slate700).stroke().restore();
        doc.moveDown(1);
        doc.fontSize(14).font('Helvetica-Bold').fillColor(COLORS.slate800).text('EXECUTIVE SUMMARY (KESIMPULAN)', PAGE_MARGIN, doc.y);
        doc.moveDown(1);

        const sumY = doc.y;
        const boxGap = 10;
        const boxW = (CONTENT_WIDTH - (boxGap * 2)) / 3;

        // Helper
        const drawColoredSummaryBox = (idx, bg, border, titleColor, title, content) => {
            const x = PAGE_MARGIN + (idx * (boxW + boxGap));
            // Bg
            doc.save().roundedRect(x, sumY, boxW, 150, 6).fillColor(bg).fill().restore();
            // Border
            doc.save().roundedRect(x, sumY, boxW, 150, 6).strokeColor(border).stroke().restore();

            doc.fontSize(10).font('Helvetica-Bold').fillColor(titleColor).text(title, x + 10, sumY + 10, { width: boxW - 20 });
            doc.fontSize(9).font('Helvetica').fillColor(COLORS.slate700).text(content || '-', x + 10, sumY + 35, { width: boxW - 20, align: 'left' });
        };

        // 1. Consistency (Slate)
        const consistLevel = fr.consistency?.level || '-';
        let consistColor = COLORS.slate600; // default
        if (consistLevel === 'Tinggi') consistColor = COLORS.green600;
        else if (consistLevel === 'Sedang') consistColor = COLORS.yellow500; // dark yellow
        else if (consistLevel === 'Rendah') consistColor = COLORS.red500;

        // We can't do multi-color text easily in one line without measuring, so simplified:
        drawColoredSummaryBox(0, COLORS.slate50, COLORS.slate200, COLORS.slate700,
            `Tingkat Konsistensi: ${consistLevel}`,
            fr.consistency?.description
        );

        // 2. Profile (Blue)
        drawColoredSummaryBox(1, COLORS.blue50, COLORS.blue200, COLORS.blue800,
            'Profil Awal',
            fr.conclusion
        );

        // 3. Recommendation (Green)
        // Manual content drawing for lists
        const recX = PAGE_MARGIN + (2 * (boxW + boxGap));
        doc.save().roundedRect(recX, sumY, boxW, 150, 6).fillColor(COLORS.green50).fill().restore();
        doc.save().roundedRect(recX, sumY, boxW, 150, 6).strokeColor(COLORS.green200).stroke().restore();

        doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.green800).text('Rekomendasi Posisi', recX + 10, sumY + 10);

        let currRecY = sumY + 35;
        doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.slate500).text('POSISI YANG DILAMAR:', recX + 10, currRecY);
        doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.green900).text(fr.jobMatch && fr.jobMatch.length > 0 ? fr.jobMatch[0] : 'General', recX + 10, currRecY + 10);

        currRecY += 30;
        doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.slate500).text('ALTERNATIF:', recX + 10, currRecY);

        (fr.jobMatch || []).slice(1).forEach((job) => {
            currRecY += 10;
            doc.font('Helvetica').fillColor(COLORS.slate700).text(`• ${job}`, recX + 10, currRecY);
        });
    }

    // --- PAGE 3: APTITUDE REPORT ---
    // bg-white p-8 font-sans text-gray-900 border border-slate-200
    if (aptitudeResult) {
        doc.addPage();

        // Header
        const dateStr = candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '-';

        doc.save().moveTo(PAGE_MARGIN, PAGE_MARGIN + 30).lineTo(PAGE_MARGIN + CONTENT_WIDTH, PAGE_MARGIN + 30).lineWidth(2).strokeColor(COLORS.slate800).stroke().restore();

        doc.fontSize(12).font('Helvetica-Bold').fillColor(COLORS.slate900).text(candidate.fullName, PAGE_MARGIN, PAGE_MARGIN);
        doc.fontSize(10).font('Helvetica').fillColor(COLORS.slate600).text(candidate.position || '-', PAGE_MARGIN, PAGE_MARGIN + 15);
        doc.text(dateStr, PAGE_MARGIN, PAGE_MARGIN + 15, { align: 'right', width: CONTENT_WIDTH });

        doc.moveDown(4);

        // Score Box
        // border border-blue-900 bg-blue-50/50 p-6 ... rounded-lg
        const scoreBoxH = 100;
        const scoreBoxY = doc.y;

        doc.save()
            .roundedRect(PAGE_MARGIN + 40, scoreBoxY, CONTENT_WIDTH - 80, scoreBoxH, 8)
            .fillColor('#eff6ff') // blue-50
            .fill()
            .strokeColor(COLORS.blue900)
            .stroke()
            .restore();

        // Title
        doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.blue900).text('APTITUDE SCORE (IQ ESTIMATE)', PAGE_MARGIN, scoreBoxY + 15, { align: 'center', width: CONTENT_WIDTH });

        const score = aptitudeResult.score;
        let cat = "Average";
        if (score >= 130) cat = "Very Superior";
        else if (score >= 120) cat = "Superior";
        else if (score >= 110) cat = "High Average";
        else if (score >= 90) cat = "Average";
        else if (score < 90) cat = "Low Average";

        // Score Number
        doc.fontSize(36).font('Helvetica-Bold').fillColor(COLORS.blue800).text(score, PAGE_MARGIN, scoreBoxY + 35, { align: 'center', width: CONTENT_WIDTH });

        // Category Label
        // user complained about "Superior &". We will just use text.
        // If "Superior", we draw a star manually.
        const labelText = cat;
        doc.fontSize(12).font('Helvetica-Bold').fillColor(COLORS.blue900);
        const textW = doc.widthOfString(labelText);
        const centerX = PAGE_MARGIN + (CONTENT_WIDTH / 2) - (textW / 2);

        doc.text(labelText, PAGE_MARGIN, scoreBoxY + 75, { align: 'center', width: CONTENT_WIDTH, continued: false });

        if (cat.includes('Superior')) {
            // Draw a star next to text
            // Center X + textW/2 + padding
            const starX = centerX + textW + 5 + 45; // Offset logic is weird with 'center' align text.
            // Better to calculate exact pos.
            // Let's just put it centered beneath or manually placed.
            // Simplified: Draw a small star icon using vector at computed position.
            // Actually, calculating "center" for pdfkit logic is hard if we use {align:center}.
            // Reset: Draw text manually centered.

            // Re-draw text to be sure (no, we already drew it).
            // Let's assume the alignment worked. The star might be hard to place perfectly relative to text.
            // Alternative: Add "(*)" in text. "Superior (*)". 
            // Or just draw a star character that IS supported? No, Helvetica doesn't support it.
            // We will draw a star at fixed offset if Superior.
            doc.save()
                .translate(PAGE_MARGIN + (CONTENT_WIDTH / 2) + (textW / 2) + 8, scoreBoxY + 80) // Approx position next to text
                .scale(0.5)
                .path('M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z') // SVG Star path
                .fillColor(COLORS.yellow500)
                .fill()
                .restore();
        }

        doc.y = scoreBoxY + scoreBoxH + 40;

        // Answer Table
        doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.slate500).text('DETAILED ANSWER SHEET', { align: 'center' });
        doc.moveDown(1);

        let answers = {};
        try { answers = typeof aptitudeResult.answers === 'string' ? JSON.parse(aptitudeResult.answers) : aptitudeResult.answers; } catch (e) { }

        const col1Rows = [];
        const col2Rows = [];

        for (let i = 1; i <= 30; i++) {
            const ans = answers[i];
            const correct = aptitudeKey[i];
            const exactMatch = String(ans).trim() === String(correct).trim();
            const status = exactMatch ? 'OK' : '-';
            col1Rows.push([String(i), String(ans || '-').substring(0, 15), status]);
        }
        for (let i = 31; i <= 60; i++) {
            const ans = answers[i];
            const correct = aptitudeKey[i];
            const exactMatch = String(ans).trim() === String(correct).trim();
            const status = exactMatch ? 'OK' : '-';
            col2Rows.push([String(i), String(ans || '-').substring(0, 15), status]);
        }

        const tableY = doc.y;

        const drawAptTable = (data, x) => {
            // Header: bg-slate-100 border-b border-gray-300
            doc.save().fillColor(COLORS.slate100).rect(x, tableY, 220, 20).fill().restore();
            doc.save().moveTo(x, tableY + 20).lineTo(x + 220, tableY + 20).strokeColor(COLORS.slate300).stroke().restore();

            doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.slate600);
            doc.text('NO.', x + 10, tableY + 6);
            doc.text('JAWABAN', x + 50, tableY + 6);
            doc.text('STATUS', x + 170, tableY + 6);

            let cy = tableY + 20;
            doc.font('Helvetica').fillColor(COLORS.slate800);

            data.forEach((r, idx) => {
                // Stripe hover effect simulated
                if (idx % 2 !== 0) doc.save().fillColor(COLORS.slate50).rect(x, cy, 220, 14).fill().restore();

                // Border bottom
                doc.save().strokeColor(COLORS.slate200).moveTo(x, cy + 14).lineTo(x + 220, cy + 14).stroke().restore();

                doc.fillColor(COLORS.slate500).text(r[0], x + 10, cy + 3); // No
                doc.fillColor(COLORS.slate800).text(r[1], x + 50, cy + 3); // Ans

                const statColor = r[2] === 'OK' ? COLORS.green600 : COLORS.slate300;
                doc.font('Helvetica-Bold').fillColor(statColor).text(r[2], x + 170, cy + 3);
                doc.font('Helvetica');

                cy += 14;
            });

            // Outside Border
            doc.save().rect(x, tableY, 220, cy - tableY).strokeColor(COLORS.slate300).stroke().restore();
        };

        drawAptTable(col1Rows, PAGE_MARGIN);
        drawAptTable(col2Rows, PAGE_MARGIN + 240);

        // Dynamic Footer Positioning
        // Height = 20 (header) + 30*14 (rows) = 440
        const tableHeight = 20 + (30 * 14);
        doc.y = tableY + tableHeight + 30; // 30px gap

        doc.fontSize(8).font('Helvetica-Oblique').fillColor(COLORS.slate500).text('*Interpretasi skor IQ bersifat estimasi berdasarkan jumlah jawaban benar.', { align: 'center' });
    }

    // --- PAGE 4: DISC ANSWER SHEET ---
    if (discResult && discResult.answers) {
        let discAnswers = {};
        try {
            discAnswers = typeof discResult.answers === 'string' ? JSON.parse(discResult.answers) : discResult.answers;
        } catch (e) { /* skip if parse fails */ }

        if (discAnswers && Object.keys(discAnswers).length > 0) {
            doc.addPage();

            // Embedded DISC Questions data (server-side copy - matches client/src/data/discQuestions.js)
            const discQuestionsData = [
                { id: 1, options: [{ word: "Lembut, ramah", type: "S" }, { word: "Membujuk, meyakinkan", type: "I" }, { word: "Sederhana, mudah menerima", type: "C" }, { word: "Asli, berdaya cipta", type: "D" }] },
                { id: 2, options: [{ word: "Menarik, mempesona", type: "I" }, { word: "Dapat bekerja sama", type: "S" }, { word: "Keras kepala", type: "D" }, { word: "Manis, menyenangkan", type: "C" }] },
                { id: 3, options: [{ word: "Mau dipimpin, pengikut", type: "C" }, { word: "Tangguh, berani", type: "D" }, { word: "Loyal, setia", type: "S" }, { word: "Mempesona", type: "I" }] },
                { id: 4, options: [{ word: "Bepandangan terbuka", type: "C" }, { word: "Berani, suka menolong", type: "S" }, { word: "Berkemauan keras", type: "D" }, { word: "Periang, bergembira", type: "I" }] },
                { id: 5, options: [{ word: "Periang, suka bergurau", type: "I" }, { word: "Teliti, tepat", type: "C" }, { word: "Kasar, berani", type: "D" }, { word: "Tenang, terkendali", type: "S" }] },
                { id: 6, options: [{ word: "Kompetitif", type: "D" }, { word: "Timbang rasa, bijaksana", type: "C" }, { word: "Terbuka, ramah", type: "I" }, { word: "Harmonis", type: "S" }] },
                { id: 7, options: [{ word: "Rewel, cerewet", type: "C" }, { word: "Taat, patuh", type: "S" }, { word: "Tidak mudah mundur", type: "D" }, { word: "Suka melucu, lincah", type: "I" }] },
                { id: 8, options: [{ word: "Berani, tangguh", type: "D" }, { word: "Membangkitkan semangat", type: "I" }, { word: "Patuh, menyerah", type: "S" }, { word: "Takut-takut, pendiam", type: "C" }] },
                { id: 9, options: [{ word: "Suka bergaul", type: "I" }, { word: "Sabar, toleransi", type: "S" }, { word: "Percaya diri, mandiri", type: "D" }, { word: "Berwatak halus", type: "C" }] },
                { id: 10, options: [{ word: "Menyukai tantangan", type: "D" }, { word: "Terbuka, menerima ide", type: "I" }, { word: "Ramah, bersahabat", type: "S" }, { word: "Moderat", type: "C" }] },
                { id: 11, options: [{ word: "Banyak bicara", type: "I" }, { word: "Terkendali, mandiri", type: "C" }, { word: "Tidak berlebihan", type: "S" }, { word: "Tegas, cepat keputusan", type: "D" }] },
                { id: 12, options: [{ word: "Berbudi bahasa halus", type: "S" }, { word: "Berani, ambil resiko", type: "D" }, { word: "Diplomatik", type: "C" }, { word: "Mudah puas", type: "I" }] },
                { id: 13, options: [{ word: "Agresif, penuh inisiatif", type: "D" }, { word: "Menyukai hiburan", type: "I" }, { word: "Pengikut", type: "S" }, { word: "Gelisah, khawatir", type: "C" }] },
                { id: 14, options: [{ word: "Berhati-hati", type: "C" }, { word: "Fokus, tidak goyah", type: "D" }, { word: "Meyakinkan", type: "I" }, { word: "Baik hati", type: "S" }] },
                { id: 15, options: [{ word: "Rela berkorban", type: "S" }, { word: "Antusias, ingin tahu", type: "I" }, { word: "Mudah menyetujui", type: "C" }, { word: "Lincah, antusias", type: "D" }] },
                { id: 16, options: [{ word: "Percaya diri", type: "I" }, { word: "Simpatik, pengertian", type: "S" }, { word: "Toleran", type: "C" }, { word: "Tegas, agresif", type: "D" }] },
                { id: 17, options: [{ word: "Disiplin, terkendali", type: "C" }, { word: "Dermawan", type: "S" }, { word: "Suka berekspresi", type: "I" }, { word: "Gigih", type: "D" }] },
                { id: 18, options: [{ word: "Terpuji, dikagumi", type: "I" }, { word: "Ramah, senang menolong", type: "S" }, { word: "Mudah menyerah", type: "C" }, { word: "Karakter kuat", type: "D" }] },
                { id: 19, options: [{ word: "Menunjukkan hormat", type: "C" }, { word: "Pelopor, perintis", type: "D" }, { word: "Optimis, positif", type: "I" }, { word: "Selalu siap membantu", type: "S" }] },
                { id: 20, options: [{ word: "Dapat berargumentasi", type: "D" }, { word: "Fleksibel, adaptasi", type: "S" }, { word: "Naif, acuh tak acuh", type: "C" }, { word: "Riang", type: "I" }] },
                { id: 21, options: [{ word: "Dapat dipercaya", type: "I" }, { word: "Mudah puas", type: "S" }, { word: "Selalu positif", type: "D" }, { word: "Tenang, pendiam", type: "C" }] },
                { id: 22, options: [{ word: "Mudah bergaul", type: "I" }, { word: "Berbudaya", type: "C" }, { word: "Bersemangat, giat", type: "D" }, { word: "Toleransi", type: "S" }] },
                { id: 23, options: [{ word: "Menyenangkan, ramah", type: "I" }, { word: "Teliti, akurat", type: "C" }, { word: "Terus terang", type: "D" }, { word: "Terkendali", type: "S" }] },
                { id: 24, options: [{ word: "Resah, tidak santai", type: "D" }, { word: "Baik hati, ramah", type: "S" }, { word: "Populer", type: "I" }, { word: "Rapi, teratur", type: "C" }] }
            ];

            // Header
            const dateStr = candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '-';

            doc.fontSize(14).font('Helvetica-Bold').fillColor(COLORS.slate800).text('LEMBAR JAWABAN DISC', PAGE_MARGIN, PAGE_MARGIN, { align: 'center' });
            doc.fontSize(9).font('Helvetica').fillColor(COLORS.slate500).text('Detail pilihan Most (Paling) dan Least (Kurang) untuk setiap pertanyaan', { align: 'center' });
            doc.moveDown(0.5);

            doc.fontSize(9).font('Helvetica').fillColor(COLORS.slate600);
            doc.text(`Nama: ${candidate.fullName || '-'}`, PAGE_MARGIN);
            doc.text(`Posisi: ${candidate.position || '-'}   |   Tanggal: ${dateStr}`, PAGE_MARGIN);
            doc.moveDown(1);

            // Table Setup
            const tblStartY = doc.y;
            const colWidths = { no: 25, word: 250, type: 30, most: 40, least: 40 };
            const rowH = 14;
            const headerH = 22;
            const totalW = colWidths.no + colWidths.word + colWidths.type + colWidths.most + colWidths.least;

            // Draw Header Row
            let tblY = tblStartY;
            doc.save().fillColor(COLORS.slate100).rect(PAGE_MARGIN, tblY, totalW, headerH).fill().restore();
            doc.save().strokeColor(COLORS.slate300).lineWidth(1).rect(PAGE_MARGIN, tblY, totalW, headerH).stroke().restore();

            doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.slate600);
            let hx = PAGE_MARGIN;
            doc.text('NO.', hx + 3, tblY + 7, { width: colWidths.no, align: 'center' }); hx += colWidths.no;
            doc.text('OPSI JAWABAN', hx + 5, tblY + 7, { width: colWidths.word - 10 }); hx += colWidths.word;
            doc.text('TIPE', hx + 2, tblY + 7, { width: colWidths.type, align: 'center' }); hx += colWidths.type;
            doc.fillColor(COLORS.green800).text('MOST', hx + 2, tblY + 7, { width: colWidths.most, align: 'center' }); hx += colWidths.most;
            doc.fillColor(COLORS.red500).text('LEAST', hx + 2, tblY + 7, { width: colWidths.least, align: 'center' });

            tblY += headerH;

            // Draw Rows
            discQuestionsData.forEach((q) => {
                const answer = discAnswers[q.id] || {};

                // Check page break before drawing question group (4 rows)
                if (tblY + (rowH * 4) + 5 > doc.page.height - PAGE_MARGIN) {
                    doc.addPage();
                    tblY = PAGE_MARGIN;
                }

                q.options.forEach((opt, optIdx) => {
                    let cx = PAGE_MARGIN;

                    // Question group separator
                    if (optIdx === 0) {
                        doc.save().strokeColor(COLORS.slate400).lineWidth(0.5).moveTo(PAGE_MARGIN, tblY).lineTo(PAGE_MARGIN + totalW, tblY).stroke().restore();
                    }

                    // No column (only first row of group)
                    if (optIdx === 0) {
                        const groupH = rowH * q.options.length;
                        doc.save().fillColor(COLORS.slate50).rect(cx, tblY, colWidths.no, groupH).fill().restore();
                        doc.save().strokeColor(COLORS.slate200).rect(cx, tblY, colWidths.no, groupH).stroke().restore();
                        doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.slate500)
                            .text(String(q.id), cx, tblY + (groupH / 2) - 4, { width: colWidths.no, align: 'center' });
                    }
                    cx += colWidths.no;

                    // Word column
                    doc.fontSize(8).font('Helvetica').fillColor(COLORS.slate800)
                        .text(opt.word, cx + 5, tblY + 3, { width: colWidths.word - 10 });
                    cx += colWidths.word;

                    // Type column
                    doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.slate400)
                        .text(opt.type, cx, tblY + 3, { width: colWidths.type, align: 'center' });
                    cx += colWidths.type;

                    // Most column
                    const isMost = answer.most === opt.type;
                    if (isMost) {
                        doc.save().fillColor(COLORS.green50).rect(cx, tblY, colWidths.most, rowH).fill().restore();
                    }
                    doc.fontSize(8).font('Helvetica-Bold').fillColor(isMost ? COLORS.green600 : COLORS.slate200)
                        .text(isMost ? 'V' : '-', cx, tblY + 3, { width: colWidths.most, align: 'center' });
                    cx += colWidths.most;

                    // Least column
                    const isLeast = answer.least === opt.type;
                    if (isLeast) {
                        doc.save().fillColor('#fef2f2').rect(cx, tblY, colWidths.least, rowH).fill().restore();
                    }
                    doc.fontSize(8).font('Helvetica-Bold').fillColor(isLeast ? COLORS.red500 : COLORS.slate200)
                        .text(isLeast ? 'V' : '-', cx, tblY + 3, { width: colWidths.least, align: 'center' });

                    // Row bottom line
                    doc.save().strokeColor(COLORS.slate200).lineWidth(0.3)
                        .moveTo(PAGE_MARGIN + colWidths.no, tblY + rowH)
                        .lineTo(PAGE_MARGIN + totalW, tblY + rowH)
                        .stroke().restore();

                    tblY += rowH;
                });
            });

            // Outside border
            doc.save().strokeColor(COLORS.slate300).lineWidth(1)
                .rect(PAGE_MARGIN, tblStartY, totalW, tblY - tblStartY + headerH)
                .stroke().restore();

            doc.y = tblY + 15;
            doc.fontSize(7).font('Helvetica-Oblique').fillColor(COLORS.slate500)
                .text('*Most = sifat yang paling menggambarkan diri kandidat. Least = sifat yang paling tidak menggambarkan diri kandidat.', { align: 'center' });
        }
    }
}

function generateBiodataPDF(candidate) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ autoFirstPage: false, margin: PAGE_MARGIN });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        try {
            generateBiodataPage(doc, candidate);
            doc.end();
        } catch (err) { reject(err); }
    });
}

function generateAnalysisPDF(candidate, discResult, aptitudeResult, analysisData) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ autoFirstPage: false, margin: PAGE_MARGIN });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        try {
            generateAnalysisPage(doc, candidate, discResult, aptitudeResult, analysisData);
            doc.end();
        } catch (err) { reject(err); }
    });
}

function generateFullReport(candidate, discResult, aptitudeResult, analysisData) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ autoFirstPage: false, margin: PAGE_MARGIN });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        try {
            generateBiodataPage(doc, candidate);
            generateAnalysisPage(doc, candidate, discResult, aptitudeResult, analysisData);
            doc.end();
        } catch (err) { reject(err); }
    });
}

module.exports = { generateBiodataPDF, generateAnalysisPDF, generateFullReport };
