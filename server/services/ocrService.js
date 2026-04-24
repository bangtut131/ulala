/**
 * ocrService.js - Tesseract.js OCR for image-based PDFs
 * 
 * Pipeline: PDF Buffer → Render pages to images → Tesseract OCR → Combined text
 * No AI API required. Runs locally using WASM.
 */

const Tesseract = require('tesseract.js');

/**
 * OCR a PDF buffer using Tesseract.js
 * Renders each PDF page to an image, then extracts text via OCR
 * 
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @param {number} maxPages - Maximum pages to process (default 5, for speed)
 * @returns {Promise<string>} - Extracted text from all pages
 */
async function ocrPdfBuffer(pdfBuffer, maxPages = 5) {
    let pdfjsLib;
    let createCanvas;

    try {
        pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    } catch (e) {
        console.error("[OCR] pdfjs-dist not available:", e.message);
        throw new Error("pdfjs-dist is required for PDF OCR");
    }

    try {
        createCanvas = require('canvas').createCanvas;
    } catch (e) {
        console.error("[OCR] canvas package not available:", e.message);
        throw new Error("canvas package is required for PDF OCR. Install: npm install canvas");
    }

    // Custom canvas factory for pdfjs-dist in Node.js
    class NodeCanvasFactory {
        create(width, height) {
            const canvas = createCanvas(width, height);
            const context = canvas.getContext('2d');
            return { canvas, context };
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

    console.log("[OCR] Loading PDF document...");
    const data = new Uint8Array(pdfBuffer);
    const doc = await pdfjsLib.getDocument({
        data,
        canvasFactory: new NodeCanvasFactory(),
        // Disable font loading to avoid warnings
        standardFontDataUrl: undefined,
        disableFontFace: true,
    }).promise;

    const numPages = Math.min(doc.numPages, maxPages);
    console.log(`[OCR] Processing ${numPages} of ${doc.numPages} pages...`);

    let allText = '';

    // Create a single Tesseract worker for all pages (reusable, faster)
    const worker = await Tesseract.createWorker('ind+eng');

    try {
        for (let i = 1; i <= numPages; i++) {
            console.log(`[OCR] Rendering page ${i}/${numPages}...`);

            const page = await doc.getPage(i);
            // Scale 2.0 for decent quality OCR (higher = better but slower)
            const viewport = page.getViewport({ scale: 2.0 });

            const canvasFactory = new NodeCanvasFactory();
            const { canvas, context } = canvasFactory.create(
                Math.floor(viewport.width),
                Math.floor(viewport.height)
            );

            await page.render({
                canvasContext: context,
                viewport,
                canvasFactory: canvasFactory,
            }).promise;

            // Convert canvas to PNG buffer for Tesseract
            const imageBuffer = canvas.toBuffer('image/png');

            console.log(`[OCR] Running Tesseract on page ${i}...`);
            const { data: { text } } = await worker.recognize(imageBuffer);

            if (text && text.trim().length > 0) {
                allText += text.trim() + '\n\n';
            }

            canvasFactory.destroy({ canvas, context });
        }
    } finally {
        await worker.terminate();
    }

    const result = allText.trim();
    console.log(`[OCR] Tesseract extracted ${result.length} characters from ${numPages} pages.`);
    return result;
}

module.exports = { ocrPdfBuffer };
