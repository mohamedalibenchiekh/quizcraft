import multer from "multer";
import path from "path";

// ─── Allowed file types ──────────────────────────────────
const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx"]);
const ALLOWED_MIMES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

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
    fileSize: 10 * 1024 * 1024, // 10 MB max payload
  },
});

export default upload;
