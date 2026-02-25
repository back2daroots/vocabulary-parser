import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import multipart from "@fastify/multipart";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { extractText, mimeFromFilename } from "../services/extractText.js";
import { parsePairs } from "../services/parsePairs.js";
import { formatTxt } from "../services/formatTxt.js";
import type { SupportedMime } from "../types.js";
import { SUPPORTED_MIMES } from "../types.js";

const TMP_DIR = path.join(os.tmpdir(), "vocab-parser");

export async function parseRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  await app.register(multipart, {
    limits: { fileSize: 20 * 1024 * 1024 },
  });

  app.post("/parse", async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: "No file uploaded" });
    }

    const filename = data.filename;
    let mime = data.mimetype as SupportedMime;
    if (!mime || !(mime in SUPPORTED_MIMES)) {
      const inferred = mimeFromFilename(filename);
      if (!inferred) {
        return reply.status(400).send({
          error: "Unsupported file type. Use PDF, DOC, or DOCX.",
        });
      }
      mime = inferred;
    }

    const buffer = await data.toBuffer();
    await fs.mkdir(TMP_DIR, { recursive: true });

    try {
      const { text, warnings: extractWarnings } = await extractText(
        buffer,
        mime,
        TMP_DIR
      );

      const { pairs, skippedLines, truncatedSynonyms, totalFound, duplicatesRemoved } =
        parsePairs(text);

      const txt = formatTxt(pairs);
      const warnings = [...extractWarnings];
      if (skippedLines > 0) {
        warnings.push(`Skipped ${skippedLines} line(s) (no valid pair or junk).`);
      }
      if (truncatedSynonyms > 0) {
        warnings.push(
          `Truncated to 2 synonyms in ${truncatedSynonyms} pair(s).`
        );
      }

      return reply
        .type("application/json; charset=utf-8")
        .send({
          pairs,
          txt,
          warnings,
          stats: {
            totalFound,
            kept: pairs.length,
            duplicatesRemoved,
            skippedLines,
            truncatedSynonyms,
          },
        });
    } catch (err) {
      request.log.error({ err, filename }, "Parse failed");
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: `Parse failed: ${msg}` });
    }
  });
}
