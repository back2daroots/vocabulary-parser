import { describe, it, expect } from "vitest";
import { formatTxt } from "./formatTxt.js";
import type { VocabPair } from "../types.js";

describe("formatTxt", () => {
  it("formats single translation with quotes and semicolon", () => {
    const pairs: VocabPair[] = [{ word: "dog", translation1: "собака" }];
    expect(formatTxt(pairs)).toBe('"dog";"собака"');
  });

  it("formats two translations with two semicolons", () => {
    const pairs: VocabPair[] = [
      { word: "hi", translation1: "привет", translation2: "здравствуй" },
    ];
    expect(formatTxt(pairs)).toBe('"hi";"привет";"здравствуй"');
  });

  it("escapes internal double quotes by doubling them", () => {
    const pairs: VocabPair[] = [{ word: 'say "hello"', translation1: 'сказать "привет"' }];
    expect(formatTxt(pairs)).toBe('"say ""hello""";"сказать ""привет"""');
  });

  it("trims fields", () => {
    const pairs: VocabPair[] = [{ word: "  word  ", translation1: "  trans  " }];
    expect(formatTxt(pairs)).toBe('"word";"trans"');
  });

  it("joins multiple pairs with newline", () => {
    const pairs: VocabPair[] = [
      { word: "a", translation1: "1" },
      { word: "b", translation1: "2" },
    ];
    expect(formatTxt(pairs)).toBe('"a";"1"\n"b";"2"');
  });

  it("handles empty translation2 by outputting single translation line", () => {
    const pairs: VocabPair[] = [{ word: "x", translation1: "y", translation2: "" }];
    expect(formatTxt(pairs)).toBe('"x";"y"');
  });

  it("handles Cyrillic and Latin in one line", () => {
    const pairs: VocabPair[] = [{ word: "слово", translation1: "word" }];
    expect(formatTxt(pairs)).toBe('"слово";"word"');
  });
});
