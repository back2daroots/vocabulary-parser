import type { VocabPair } from "../types.js";

/** Separator: hyphen only, usually surrounded by space */
const SEPARATOR_REGEX = /\s*-\s*/;

/** At least one letter (Latin or Cyrillic) */
const HAS_LETTER = /[\p{L}]/u;

export interface ParsePairsResult {
  pairs: VocabPair[];
  skippedLines: number;
  truncatedSynonyms: number;
  totalFound: number;
  duplicatesRemoved: number;
}

/**
 * Normalize for dedupe key: lowercase, trim.
 */
function normalizeForDedupe(s: string): string {
  return s.toLowerCase().trim();
}

/**
 * Parse raw text into vocabulary pairs with deduplication and rules.
 */
export function parsePairs(rawText: string): ParsePairsResult {
  const lines = rawText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim().replace(/\s+/g, " "))
    .filter((l) => l.length > 0);

  const seen = new Set<string>();
  const pairs: VocabPair[] = [];
  let skippedLines = 0;
  let truncatedSynonyms = 0;
  let totalFound = 0;
  let duplicatesRemoved = 0;

  for (const line of lines) {
    if (/^\d+$/.test(line)) {
      skippedLines++;
      continue;
    }

    const match = line.match(SEPARATOR_REGEX);
    if (!match || match.index === undefined) {
      skippedLines++;
      continue;
    }

    const sep = match[0];
    const idx = line.indexOf(sep);
    const left = line.slice(0, idx).trim();
    const right = line.slice(idx + sep.length).trim();

    if (!left || !right) {
      skippedLines++;
      continue;
    }

    if (!HAS_LETTER.test(left) || !HAS_LETTER.test(right)) {
      skippedLines++;
      continue;
    }

    const translationParts = right
      .split(/[,/]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const translation1 = translationParts[0] ?? "";
    const translation2 = translationParts[1];
    if (translationParts.length > 2) {
      truncatedSynonyms++;
    }

    if (!translation1) {
      skippedLines++;
      continue;
    }

    totalFound++;

    const wordNorm = normalizeForDedupe(left);
    const t1Norm = normalizeForDedupe(translation1);
    const t2Norm = translation2 ? normalizeForDedupe(translation2) : "";
    const key = t2Norm ? `${wordNorm}||${t1Norm}||${t2Norm}` : `${wordNorm}||${t1Norm}`;

    if (seen.has(key)) {
      duplicatesRemoved++;
      continue;
    }
    seen.add(key);

    const pair: VocabPair = {
      word: left,
      translation1,
      ...(translation2 ? { translation2 } : {}),
    };
    pairs.push(pair);
  }

  return {
    pairs,
    skippedLines,
    truncatedSynonyms,
    totalFound,
    duplicatesRemoved,
  };
}
