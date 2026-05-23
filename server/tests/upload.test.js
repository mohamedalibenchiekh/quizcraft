import { describe, it, expect, vi } from "vitest";
import request from "supertest";

// ─── Mock the text extraction utility for integration tests ──
// We don't want to test pdf-parse/mammoth here — that's textExtractor.test.js's job.
vi.mock("../utils/textExtractor.js", () => ({
  extractTextFromFile: vi.fn(async (file) => {
    return `Extracted text from ${file.originalname}`;
  }),
}));

const { default: app } = await import("../app.js");

describe("POST /api/upload — Document Upload Integration Tests", () => {
  // ─── Test Case 1: Success Path ─────────────────────────
  it("should accept a valid .pdf file and return 200 with processed results", async () => {
    const dummyPdfBuffer = Buffer.from("%PDF-1.4 dummy content");

    const res = await request(app)
      .post("/api/upload")
      .attach("documents", dummyPdfBuffer, {
        filename: "test-course.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.filesProcessed).toHaveLength(1);
    expect(res.body.filesProcessed[0].originalName).toBe("test-course.pdf");
    expect(res.body.consolidatedText).toContain("Extracted text from test-course.pdf");
  });

  it("should accept a valid .docx file and return 200 with processed results", async () => {
    const dummyDocxBuffer = Buffer.from("PK\x03\x04 dummy docx content");

    const res = await request(app)
      .post("/api/upload")
      .attach("documents", dummyDocxBuffer, {
        filename: "lecture-notes.docx",
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.filesProcessed[0].originalName).toBe("lecture-notes.docx");
  });

  it("should accept multiple files in a single request", async () => {
    const pdfBuffer = Buffer.from("%PDF-1.4 content");
    const docxBuffer = Buffer.from("PK\x03\x04 content");

    const res = await request(app)
      .post("/api/upload")
      .attach("documents", pdfBuffer, {
        filename: "chapter1.pdf",
        contentType: "application/pdf",
      })
      .attach("documents", docxBuffer, {
        filename: "chapter2.docx",
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.filesProcessed).toHaveLength(2);
    expect(res.body.message).toContain("2 document(s) processed");
    expect(res.body.consolidatedText).toContain("chapter1.pdf");
    expect(res.body.consolidatedText).toContain("chapter2.docx");
  });

  // ─── Test Case 2: Extension Rejection ──────────────────
  it("should reject an .exe file with a 400 status and a validation error", async () => {
    const maliciousBuffer = Buffer.from("MZ malicious binary");

    const res = await request(app)
      .post("/api/upload")
      .attach("documents", maliciousBuffer, {
        filename: "malicious-script.exe",
        contentType: "application/x-msdownload",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid file type/i);
  });

  it("should reject a .png image with a 400 status and a validation error", async () => {
    const imageBuffer = Buffer.from("fake png data");

    const res = await request(app)
      .post("/api/upload")
      .attach("documents", imageBuffer, {
        filename: "image.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid file type/i);
  });

  // ─── Test Case 3: Missing File Payload ─────────────────
  it("should return a 400 error when no file is attached to the request", async () => {
    const res = await request(app)
      .post("/api/upload")
      .send(); // no file attached

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/no document/i);
  });
});
