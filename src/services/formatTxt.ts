import type { VocabPair } from "../types.js";

/**
 * Escape a field for CSV-style output: double internal quotes, trim.
 */
export function escapeField(s: string): string {
  return s.replaceAll('"', '""').trim();
}

/**
 * Format pairs to UTF-8 .txt lines:
 * - One translation: "word";"translation"
 * - Two translations: "word";"translation1";"translation2"
 */
export function formatTxt(pairs: VocabPair[]): string {
  const lines = pairs.map((p) => {
    const word = `"${escapeField(p.word)}"`;
    const t1 = `"${escapeField(p.translation1)}"`;
    if (p.translation2 !== undefined && p.translation2 !== "") {
      return `${word};${t1};"${escapeField(p.translation2)}"`;
    }
    return `${word};${t1}`;
  });
  return lines.join("\n");
}
