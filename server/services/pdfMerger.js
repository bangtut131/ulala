const { PDFDocument } = require('pdf-lib');

/**
 * Merges multiple PDF buffers into a single PDF buffer.
 * @param {Buffer[]} pdfBuffers - Array of PDF buffers to merge.
 * @returns {Promise<Buffer>} - The merged PDF buffer.
 */
async function mergePDFs(pdfBuffers) {
    try {
        const mergedPdf = await PDFDocument.create();

        for (const buffer of pdfBuffers) {
            if (!buffer) continue;

            try {
                const pdf = await PDFDocument.load(buffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            } catch (err) {
                console.warn("Warning: Failed to merge a PDF chunk (might be corrupt or empty). Skipping...", err.message);
            }
        }

        const mergedPdfBytes = await mergedPdf.save();
        return Buffer.from(mergedPdfBytes);
    } catch (error) {
        console.error("Error merging PDFs:", error);
        throw error; // Re-throw to be handled by caller
    }
}

module.exports = { mergePDFs };
