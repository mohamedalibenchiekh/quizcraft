import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

describe("POST /api/upload — Document Upload Integration Tests", () => {
  // ─── Test Case 1: Success Path ─────────────────────────
  it("should accept a valid .pdf file and return 200 with confirmation JSON", async () => {
    const dummyPdfBuffer = Buffer.from("%PDF-1.4 dummy content");

    const res = await request(app)
      .post("/api/upload")
      .attach("document", dummyPdfBuffer, {
        filename: "test-course.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: "File uploaded successfully to memory buffer.",
      file: "test-course.pdf",
    });
  });

  it("should accept a valid .docx file and return 200 with confirmation JSON", async () => {
    const dummyDocxBuffer = Buffer.from("PK\x03\x04 dummy docx content");

    const res = await request(app)
      .post("/api/upload")
      .attach("document", dummyDocxBuffer, {
        filename: "lecture-notes.docx",
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.file).toBe("lecture-notes.docx");
  });

  // ─── Test Case 2: Extension Rejection ──────────────────
  it("should reject an .exe file with a 400 status and a validation error", async () => {
    const maliciousBuffer = Buffer.from("MZ malicious binary");

    const res = await request(app)
      .post("/api/upload")
      .attach("document", maliciousBuffer, {
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
      .attach("document", imageBuffer, {
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
