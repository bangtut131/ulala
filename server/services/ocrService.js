/**
 * ocrService.js - Tesseract.js OCR for image-based PDFs
 * 
 * Two strategies:
 * 1. canvas-based: Render PDF pages → canvas → PNG → Tesseract (needs canvas package)
 * 2. canvas-free: Extract embedded images from PDF → Tesseract (no native deps)
 * 
 * Falls back automatically if canvas is not available.
 */

const Tesseract = require('tesseract.js');

/**
 * Extract raw image bytes from a PDF buffer by scanning for JPEG markers.
 * Most scanned/image-based PDFs simply embed JPEG images.
 * This avoids needing canvas/pdfjs-dist for rendering.
 * 
 * @param {Buffer} pdfBuffer
 * @returns {Buffer[]} Array of JPEG image buffers
 */
function extractImagesFromPdf(pdfBuffer) {
    const images = [];
    const SOI = Buffer.from([0xFF, 0xD8]); // JPEG Start of Image
    const EOI = Buffer.from([0xFF, 0xD9]); // JPEG End of Image

    let offset = 0;
    while (offset < pdfBuffer.length - 2) {
        // Find JPEG start marker
        const soiIdx = pdfBuffer.indexOf(SOI, offset);
        if (soiIdx === -1) break;

        // Find JPEG end marker after start
        const eoiIdx = pdfBuffer.indexOf(EOI, soiIdx + 2);
        if (eoiIdx === -1) break;

        // Extract JPEG (include the EOI marker bytes)
        const jpegBuffer = pdfBuffer.subarray(soiIdx, eoiIdx + 2);

        // Only accept images larger than 10KB (skip thumbnails/icons)
        if (jpegBuffer.length > 10000) {
            images.push(Buffer.from(jpegBuffer));
        }

        offset = eoiIdx + 2;
    }

    return images;
}

/**
 * OCR a PDF buffer using Tesseract.js
 * Strategy 1: Try canvas-based rendering (high quality)
 * Strategy 2: Extract embedded JPEG images directly (no native deps)
 * 
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @param {number} maxPages - Maximum pages to process (default 5)
 * @returns {Promise<string>} - Extracted text from all pages
 */
async function ocrPdfBuffer(pdfBuffer, maxPages = 5) {
    let result = '';

    // Strategy 1: Canvas-based rendering (best quality)
    try {
        result = await ocrWithCanvas(pdfBuffer, maxPages);
        if (result && result.trim().length > 30) {
            return result;
        }
    } catch (e) {
        console.warn("[OCR] Canvas strategy unavailable:", e.message);
    }

    // Strategy 2: Direct JPEG extraction (no native deps needed)
    console.log("[OCR] Falling back to direct image extraction...");
    result = await ocrFromExtractedImages(pdfBuffer);

    return result;
}

/**
 * Strategy 1: Render PDF pages with canvas + pdfjs-dist, then OCR
 */
async function ocrWithCanvas(pdfBuffer, maxPages) {
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    const { createCanvas } = require('canvas');

    class NodeCanvasFactory {
        create(width, height) {
            const canvas = createCanvas(width, height);
            return { canvas, context: canvas.getContext('2d') };
        }
        reset(canvasAndContext, width, height) {
            canvasAndContext.canvas.width = width;
            canvasAndContext.canvas.height = height;
        }
        destroy(canvasAndContext) {
            canvasAndContext.canvas.width = 0;
            canvasAndContext.canvas.height = 0;
        }
    }

    console.log("[OCR] Loading PDF with canvas renderer...");
    const data = new Uint8Array(pdfBuffer);
    const doc = await pdfjsLib.getDocument({
        data,
        canvasFactory: new NodeCanvasFactory(),
        disableFontFace: true,
    }).promise;

    const numPages = Math.min(doc.numPages, maxPages);
    console.log(`[OCR] Rendering ${numPages} pages...`);

    let allText = '';
    const worker = await Tesseract.createWorker('ind+eng');

    try {
        for (let i = 1; i <= numPages; i++) {
            console.log(`[OCR] Page ${i}/${numPages}...`);
            const page = await doc.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });

            const { canvas, context } = new NodeCanvasFactory().create(
                Math.floor(viewport.width), Math.floor(viewport.height)
            );

            await page.render({
                canvasContext: context,
                viewport,
                canvasFactory: new NodeCanvasFactory(),
            }).promise;

            const imageBuffer = canvas.toBuffer('image/png');
            const { data: { text } } = await worker.recognize(imageBuffer);
            if (text && text.trim().length > 0) allText += text.trim() + '\n\n';
        }
    } finally {
        await worker.terminate();
    }

    return allText.trim();
}

/**
 * Strategy 2: Extract embedded JPEG images from PDF, then OCR
 * Works without canvas package (no native dependencies)
 */
async function ocrFromExtractedImages(pdfBuffer) {
    console.log("[OCR] Extracting embedded images from PDF...");
    const images = extractImagesFromPdf(pdfBuffer);

    if (images.length === 0) {
        console.warn("[OCR] No embedded JPEG images found in PDF.");
        return '';
    }

    console.log(`[OCR] Found ${images.length} embedded image(s). Running Tesseract...`);

    // Limit to 5 images max
    const toProcess = images.slice(0, 5);
    let allText = '';

    const worker = await Tesseract.createWorker('ind+eng');

    try {
        for (let i = 0; i < toProcess.length; i++) {
            console.log(`[OCR] Processing image ${i + 1}/${toProcess.length} (${toProcess[i].length} bytes)...`);
            const { data: { text } } = await worker.recognize(toProcess[i]);
            if (text && text.trim().length > 0) {
                allText += text.trim() + '\n\n';
            }
        }
    } finally {
        await worker.terminate();
    }

    const result = allText.trim();
    console.log(`[OCR] Extracted ${result.length} characters from ${toProcess.length} images.`);
    return result;
}

module.exports = { ocrPdfBuffer };
