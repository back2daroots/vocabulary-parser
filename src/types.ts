/**
 * Vocabulary pair: word (left) and one or two translations (right).
 */
export interface VocabPair {
  word: string;
  translation1: string;
  translation2?: string;
}

/**
 * Result of parsing a document.
 */
export interface ParseResult {
  pairs: VocabPair[];
  txt: string;
  warnings: string[];
  stats: {
    totalFound: number;
    kept: number;
    duplicatesRemoved: number;
    skippedLines: number;
    truncatedSynonyms: number;
  };
}

/**
 * Supported upload MIME types and extensions.
 */
export const SUPPORTED_MIMES = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
} as const;

export type SupportedMime = keyof typeof SUPPORTED_MIMES;
