import { describe, it, expect, vi } from "vitest";

// ─── Mock pdf-parse and mammoth BEFORE importing the module under test ───
const mockPdfParse = vi.fn();
class MockPDFParse {
  constructor(options) {
    this.options = options;
  }
  async getText() {
    return mockPdfParse(this.options.data);
  }
}

vi.mock("pdf-parse", () => ({
  default: mockPdfParse,
  PDFParse: MockPDFParse,
}));

vi.mock("mammoth", () => ({
  default: {
    extractRawText: vi.fn(),
  },
}));

// Dynamic imports so mocks are applied first
const { default: pdfParse } = await import("pdf-parse");
const { default: mammoth } = await import("mammoth");
const { extractTextFromFile } = await import("../utils/textExtractor.js");

describe("extractTextFromFile — Text Extraction Utility", () => {
  // ─── Test Case 1: PDF extraction ───────────────────────
  it("should extract text from a PDF buffer using pdf-parse", async () => {
    const expectedText = "Chapter 1: Introduction to Algorithms\nThis course covers...";

    pdfParse.mockResolvedValueOnce({ text: expectedText });

    const mockPdfFile = {
      originalname: "lecture-notes.pdf",
      mimetype: "application/pdf",
      buffer: Buffer.from("fake-pdf-binary-data"),
    };

    const result = await extractTextFromFile(mockPdfFile);

    expect(pdfParse).toHaveBeenCalledWith(mockPdfFile.buffer);
    expect(result).toBe(expectedText);
  });

  // ─── Test Case 2: DOCX extraction ─────────────────────
  it("should extract text from a DOCX buffer using mammoth", async () => {
    const expectedText = "Section 1: Database Normalization\nNormalization is the process of...";

    mammoth.extractRawText.mockResolvedValueOnce({ value: expectedText });

    const mockDocxFile = {
      originalname: "course-material.docx",
      mimetype:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: Buffer.from("fake-docx-binary-data"),
    };

    const result = await extractTextFromFile(mockDocxFile);

    expect(mammoth.extractRawText).toHaveBeenCalledWith({
      buffer: mockDocxFile.buffer,
    });
    expect(result).toBe(expectedText);
  });

  // ─── Test Case 3: Corrupt/broken document ──────────────
  it("should throw a descriptive 422 error when pdf-parse encounters a corrupt buffer", async () => {
    pdfParse.mockRejectedValueOnce(new Error("Invalid PDF structure"));

    const corruptFile = {
      originalname: "broken-file.pdf",
      mimetype: "application/pdf",
      buffer: Buffer.from("not-a-real-pdf"),
    };

    await expect(extractTextFromFile(corruptFile)).rejects.toThrow(
      /Text extraction failed for "broken-file.pdf"/
    );

    try {
      await extractTextFromFile(corruptFile);
    } catch (err) {
      // Need a fresh mock rejection for the second call
    }
  });

  it("should throw a descriptive 422 error when mammoth encounters an unreadable DOCX", async () => {
    mammoth.extractRawText.mockRejectedValueOnce(
      new Error("Could not find the content in the docx file")
    );

    const corruptDocx = {
      originalname: "corrupted-notes.docx",
      mimetype:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: Buffer.from("garbage-data"),
    };

    await expect(extractTextFromFile(corruptDocx)).rejects.toThrow(
      /Text extraction failed for "corrupted-notes.docx"/
    );
  });

  it("should attach a 422 statusCode to parser crash errors", async () => {
    pdfParse.mockRejectedValueOnce(new Error("Stream ended prematurely"));

    const badFile = {
      originalname: "truncated.pdf",
      mimetype: "application/pdf",
      buffer: Buffer.from("partial-pdf"),
    };

    try {
      await extractTextFromFile(badFile);
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err.statusCode).toBe(422);
      expect(err.message).toContain("truncated.pdf");
    }
  });
});
