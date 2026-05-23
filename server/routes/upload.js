import { Router } from "express";
import upload from "../middleware/upload.js";

const router = Router();

// ─── POST /api/upload — Single document upload ──────────
router.post("/", upload.single("document"), (req, res, next) => {
  // If Multer didn't find a file in the payload, reject early
  if (!req.file) {
    const error = new Error("No document file was provided in the request.");
    error.statusCode = 400;
    return next(error);
  }

  res.status(200).json({
    success: true,
    message: "File uploaded successfully to memory buffer.",
    file: req.file.originalname,
  });
});

export default router;
