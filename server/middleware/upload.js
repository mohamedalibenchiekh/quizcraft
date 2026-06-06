import multer from "multer";
import path from "path";

// ─── Allowed file types ──────────────────────────────────
const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx"]);
const ALLOWED_MIMES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

// ─── Upload limits ──────────────────────────────────────
// Per-file size cap. Configurable via MAX_UPLOAD_MB so large lecture decks
// (image-heavy PDFs can easily exceed 10 MB) can be accommodated per-deployment.
// Only a positive integer is honoured; anything else (negative, zero, float,
// non-numeric, unset) falls back to the default to avoid an invalid fileSize.
const DEFAULT_MAX_UPLOAD_MB = 25;
const parsedMaxUploadMb = Number(process.env.MAX_UPLOAD_MB);
export const MAX_FILE_SIZE_MB =
  Number.isInteger(parsedMaxUploadMb) && parsedMaxUploadMb > 0
    ? parsedMaxUploadMb
    : DEFAULT_MAX_UPLOAD_MB;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const MAX_FILES = 5;

// ─── Memory storage (no disk writes) ────────────────────
const storage = multer.memoryStorage();

// ─── Custom file filter ─────────────────────────────────
/**
 * Validates incoming files by extension AND mime-type.
 * Only .pdf and .docx documents are accepted.
 */
const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ALLOWED_EXTENSIONS.has(ext) && ALLOWED_MIMES.has(file.mimetype)) {
    return cb(null, true); // accept
  }

  const error = new Error(
    `Invalid file type "${ext}". Only .pdf and .docx documents are allowed.`
  );
  error.statusCode = 400;
  return cb(error, false); // reject
};

// ─── Multer instance ────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
});

/**
 * Wraps multer's array handler so Multer-specific errors (e.g. file too large,
 * too many files) are converted into clear 400 responses instead of bubbling up
 * to the global handler as generic 500 "Internal Server Error"s.
 */
export const uploadDocuments = (req, res, next) => {
  upload.array("documents", MAX_FILES)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        err.statusCode = 400;
        if (err.code === "LIMIT_FILE_SIZE") {
          err.message = `File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB per file.`;
        } else if (err.code === "LIMIT_FILE_COUNT") {
          err.message = `Too many files. You can upload up to ${MAX_FILES} documents at a time.`;
        } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
          err.message = "Unexpected file field in upload.";
        }
      }
      return next(err);
    }
    next();
  });
};

export default upload;
