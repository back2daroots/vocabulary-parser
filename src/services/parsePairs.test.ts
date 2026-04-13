import { describe, it, expect } from "vitest";
import { parsePairs } from "./parsePairs.js";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("parsePairs", () => {
  it("splits on hyphen with spaces", () => {
    const { pairs } = parsePairs("a dog - собака");
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toEqual({ word: "a dog", translation1: "собака" });
  });

  it("only hyphen is separator (en-dash/colon/equals skipped)", () => {
    const { pairs, skippedLines } = parsePairs("the cat – кот\nbird — птица\nhello : привет\nworld = мир");
    expect(pairs).toHaveLength(0);
    expect(skippedLines).toBe(4);
  });

  it("allows flexible spaces around separator", () => {
    const { pairs } = parsePairs("  extra   spaces   -   перевод  ");
    expect(pairs).toHaveLength(1);
    expect(pairs[0].word).toBe("extra spaces");
    expect(pairs[0].translation1).toBe("перевод");
  });

  it("keeps articles and multi-word phrases on word side", () => {
    const { pairs } = parsePairs("a/an/the article - артикль\nmulti word phrase - несколько слов");
    expect(pairs).toHaveLength(2);
    expect(pairs[0].word).toBe("a/an/the article");
    expect(pairs[1].word).toBe("multi word phrase");
  });

  it("preserves Cyrillic on both sides", () => {
    const { pairs } = parsePairs("Cyrillic слово - word\nдва - two");
    expect(pairs).toHaveLength(2);
    expect(pairs[0].word).toBe("Cyrillic слово");
    expect(pairs[0].translation1).toBe("word");
    expect(pairs[1].word).toBe("два");
    expect(pairs[1].translation1).toBe("two");
  });

  it("parses two synonyms separated by comma", () => {
    const { pairs } = parsePairs("synonym pair - перевод1, перевод2");
    expect(pairs).toHaveLength(1);
    expect(pairs[0].word).toBe("synonym pair");
    expect(pairs[0].translation1).toBe("перевод1");
    expect(pairs[0].translation2).toBe("перевод2");
  });

  it("parses two synonyms separated by slash", () => {
    const { pairs } = parsePairs("word - trans1 / trans2");
    expect(pairs).toHaveLength(1);
    expect(pairs[0].word).toBe("word");
    expect(pairs[0].translation1).toBe("trans1");
    expect(pairs[0].translation2).toBe("trans2");
  });

  it("truncates to first two synonyms and sets truncatedSynonyms", () => {
    const { pairs, truncatedSynonyms } = parsePairs("только два - one, two, three");
    expect(pairs).toHaveLength(1);
    expect(pairs[0].word).toBe("только два");
    expect(pairs[0].translation1).toBe("one");
    expect(pairs[0].translation2).toBe("two");
    expect(truncatedSynonyms).toBe(1);
  });

  it("skips page-number-only lines", () => {
    const { pairs, skippedLines } = parsePairs("dog - собака\n1\n2\ncat - кот");
    expect(pairs).toHaveLength(2);
    expect(skippedLines).toBeGreaterThanOrEqual(2);
  });

  it("skips very long lines", () => {
    const longLeft = "a".repeat(121);
    const { pairs, skippedLines } = parsePairs(`${longLeft} - перевод\ndog - собака`);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].word).toBe("dog");
    expect(skippedLines).toBeGreaterThanOrEqual(1);
  });

  it("skips lines containing links", () => {
    const { pairs, skippedLines } = parsePairs(
      "https://www.englishgrammar.at - online_exercises\nword - слово\nenglish-practice.net - adjective-endings"
    );
    expect(pairs).toHaveLength(1);
    expect(pairs[0].word).toBe("word");
    expect(skippedLines).toBeGreaterThanOrEqual(2);
  });

  it("skips lines without separator", () => {
    const { pairs, skippedLines } = parsePairs("no-separator here\ndog - собака");
    expect(pairs).toHaveLength(1);
    expect(skippedLines).toBeGreaterThanOrEqual(1);
  });

  it("skips empty translation side", () => {
    const { pairs } = parsePairs("empty side - ");
    expect(pairs).toHaveLength(0);
  });

  it("skips empty word side", () => {
    const { pairs } = parsePairs(" - missing left");
    expect(pairs).toHaveLength(0);
  });

  it("deduplicates same normalized pair keeping first", () => {
    const { pairs, duplicatesRemoved } = parsePairs(
      "Dog - собака\ndog - собака\nDOG - Собака"
    );
    expect(pairs).toHaveLength(1);
    expect(pairs[0].word).toBe("Dog");
    expect(pairs[0].translation1).toBe("собака");
    expect(duplicatesRemoved).toBe(2);
  });

  it("handles quoted words in content", () => {
    const { pairs } = parsePairs('"quoted" word - "кавычки"');
    expect(pairs).toHaveLength(1);
    expect(pairs[0].word).toBe('"quoted" word');
    expect(pairs[0].translation1).toBe('"кавычки"');
  });

  it("normalizes CRLF to LF and trims", () => {
    const { pairs } = parsePairs("a - b\r\nc - d\r\n");
    expect(pairs).toHaveLength(2);
  });

  it("returns correct totalFound and kept", () => {
    const result = parsePairs("x - 1\ny - 2\ny - 2");
    expect(result.totalFound).toBe(3);
    expect(result.pairs).toHaveLength(2);
    expect(result.duplicatesRemoved).toBe(1);
  });

  it("full fixture: multiple formats and skips", () => {
    const raw = readFileSync(
      path.join(__dirname, "__fixtures__", "sample.txt"),
      "utf-8"
    );
    const { pairs, skippedLines, truncatedSynonyms } = parsePairs(raw);
    expect(pairs.length).toBeGreaterThan(5);
    expect(skippedLines).toBeGreaterThan(0);
    expect(truncatedSynonyms).toBe(1);
    const oneTwo = pairs.find((p) => p.word === "только два");
    expect(oneTwo?.translation1).toBe("one");
    expect(oneTwo?.translation2).toBe("two");
  });
});
