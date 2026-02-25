import fs from "fs/promises";
import path from "path";
import { createRequire } from "module";
import mammoth from "mammoth";
import { convertDocToDocx } from "./convertDocToDocx.js";
import type { SupportedMime } from "../types.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export interface ExtractResult {
  text: string;
  warnings: string[];
}

/**
 * Extract raw text from PDF buffer.
 */
async function extractFromPdf(buffer: Buffer): Promise<ExtractResult> {
  const warnings: string[] = [];
  try {
    const data = await pdfParse(buffer);
    const text = (data.text || "").trim();
    if (!text) {
      warnings.push("PDF produced no extractable text (scanned/image-only PDFs need OCR, not supported in MVP).");
    }
    return { text, warnings };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`PDF extraction failed: ${msg}`);
  }
}

/**
 * Extract raw text from DOCX buffer using mammoth.
 */
async function extractFromDocx(buffer: Buffer): Promise<ExtractResult> {
  const warnings: string[] = [];
  const result = await mammoth.extractRawText({ buffer });
  const text = (result.value || "").trim();
  if (result.messages.length > 0) {
    warnings.push(...result.messages.map((m) => `DOCX: ${m.message}`));
  }
  if (!text) {
    warnings.push("DOCX produced no extractable text.");
  }
  return { text, warnings };
}

/**
 * Extract text from .doc: convert to DOCX via LibreOffice, then mammoth.
 */
async function extractFromDoc(buffer: Buffer, tmpDir: string): Promise<ExtractResult> {
  const warnings: string[] = ["DOC was converted to DOCX via LibreOffice for parsing."];
  const docPath = path.join(tmpDir, `input_${Date.now()}.doc`);
  await fs.writeFile(docPath, buffer);
  try {
    const docxPath = await convertDocToDocx(docPath);
    try {
      const docxBuf = await fs.readFile(docxPath);
      const out = await extractFromDocx(docxBuf);
      out.warnings.unshift(...warnings);
      return out;
    } finally {
      await fs.unlink(docxPath).catch(() => {});
    }
  } finally {
    await fs.unlink(docPath).catch(() => {});
  }
}

/**
 * Extract raw text by MIME type. For DOC, pass a tmp dir for conversion.
 */
export async function extractText(
  buffer: Buffer,
  mime: SupportedMime,
  tmpDir: string
): Promise<ExtractResult> {
  switch (mime) {
    case "application/pdf":
      return extractFromPdf(buffer);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return extractFromDocx(buffer);
    case "application/msword":
      return extractFromDoc(buffer, tmpDir);
    default:
      throw new Error(`Unsupported MIME type: ${mime}`);
  }
}

/**
 * Resolve MIME from filename extension when client sends wrong/empty MIME.
 */
export function mimeFromFilename(filename: string): SupportedMime | null {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".doc") return "application/msword";
  if (ext === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return null;
}
