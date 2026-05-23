import { Router } from "express";
import upload from "../middleware/upload.js";
import { extractTextFromFile } from "../utils/textExtractor.js";

const router = Router();

// ─── POST /api/upload — Multi-document upload + text extraction ──
router.post("/", upload.array("documents", 5), async (req, res, next) => {
  try {
    // If Multer didn't find any files in the payload, reject early
    if (!req.files || req.files.length === 0) {
      const error = new Error("No document files were provided in the request.");
      error.statusCode = 400;
      return next(error);
    }

    // Process each file through the text extraction pipeline
    const filesProcessed = [];
    const textChunks = [];

    for (const file of req.files) {
      const extractedText = await extractTextFromFile(file);
      filesProcessed.push({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        extractedLength: extractedText.length,
      });
      textChunks.push(extractedText);
    }

    // Consolidate all extracted text into a single pool
    const consolidatedText = textChunks.join("\n\n---\n\n");

    res.status(200).json({
      success: true,
      message: `${filesProcessed.length} document(s) processed successfully.`,
      filesProcessed,
      consolidatedText,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
