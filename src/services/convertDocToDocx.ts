import { execFile } from "child_process";
import path from "path";
import fs from "fs/promises";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const LIBREOFFICE_CMD = "soffice";

/**
 * Convert .doc to .docx using LibreOffice headless.
 * Works on linux/amd64 and linux/arm64 (Apple Silicon Docker).
 */
export async function convertDocToDocx(inputPath: string): Promise<string> {
  const dir = path.dirname(inputPath);
  const outDir = path.join(dir, `convert_${Date.now()}`);
  await fs.mkdir(outDir, { recursive: true });

  try {
    await execFileAsync(LIBREOFFICE_CMD, [
      "--headless",
      "--convert-to", "docx",
      "--outdir", outDir,
      inputPath,
    ], {
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
    });

    const base = path.basename(inputPath, path.extname(inputPath));
    const docxPath = path.join(outDir, `${base}.docx`);
    await fs.access(docxPath);
    return docxPath;
  } finally {
    await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});
  }
}
