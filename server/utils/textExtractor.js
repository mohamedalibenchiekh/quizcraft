import * as pdfParsePkg from "pdf-parse";
// pdf-parse version >= 2.x exports a `PDFParse` class rather than a function.
// For backwards compatibility and unit testing, we handle both styles.
const pdfParse = async (buffer) => {
  const PDFParseClass = pdfParsePkg?.PDFParse || pdfParsePkg?.default?.PDFParse;
  if (PDFParseClass) {
    const parser = new PDFParseClass({ data: buffer });
    return parser.getText();
  }

  const fallback = pdfParsePkg?.default ?? pdfParsePkg;
  if (typeof fallback === "function") {
    return fallback(buffer);
  }

  throw new Error("pdfParse is not a function and PDFParse class is not available");
};

import mammoth from "mammoth";
import path from "path";

/**
 * Extracts plain text from a Multer file object stored in memory.
 *
 * Supports:
 *  - PDF  → via pdf-parse
 *  - DOCX → via mammoth
 *
 * @param {object} file – A Multer file object with `.buffer`, `.mimetype`, `.originalname`.
 * @returns {Promise<string>} The extracted plain-text content.
 * @throws {Error} If the file type is unsupported or the parser encounters a corrupt payload.
 */
export const extractTextFromFile = async (file) => {
  const ext = path.extname(file.originalname).toLowerCase();

  try {
    // ─── PDF extraction ────────────────────────────────────
    if (
      ext === ".pdf" ||
      file.mimetype === "application/pdf"
    ) {
      const data = await pdfParse(file.buffer);
      return data.text;
    }

    // ─── DOCX extraction ───────────────────────────────────
    if (
      ext === ".docx" ||
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return result.value;
    }

    // ─── Unsupported type fallback ─────────────────────────
    const unsupportedError = new Error(
      `Unsupported file type "${ext}". Only .pdf and .docx are accepted for text extraction.`
    );
    unsupportedError.statusCode = 400;
    throw unsupportedError;
  } catch (err) {
    // Re-throw known application errors (statusCode already set)
    if (err.statusCode) {
      throw err;
    }

    // Wrap unexpected parser crashes with a descriptive message
    const extractionError = new Error(
      `Text extraction failed for "${file.originalname}": ${err.message}`
    );
    extractionError.statusCode = 422;
    throw extractionError;
  }
};
