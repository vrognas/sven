import * as assert from "assert";
import { decode, encode, encodingSupported } from "../../../util/textCodec";

suite("textCodec", () => {
  test("decode utf-8 round-trip", () => {
    const buf = Buffer.from("héllo 🌍", "utf-8");
    assert.strictEqual(decode(buf, "utf-8"), "héllo 🌍");
  });

  test("decode windows-1252 maps high bytes correctly", () => {
    // 0x80 in windows-1252 is the euro sign U+20AC
    const buf = Buffer.from([0x80, 0x41]);
    assert.strictEqual(decode(buf, "windows-1252"), "€A");
  });

  test("decode tolerates encoding aliases like utf8 (no dash)", () => {
    const buf = Buffer.from("test", "utf-8");
    assert.strictEqual(decode(buf, "utf8"), "test");
  });

  test("encode utf-8 returns expected bytes", () => {
    const out = encode("AB", "utf-8");
    assert.deepStrictEqual([...out], [0x41, 0x42]);
  });

  test("encodingSupported returns true for known, false for nonsense", () => {
    assert.strictEqual(encodingSupported("utf-8"), true);
    assert.strictEqual(encodingSupported("windows-1252"), true);
    assert.strictEqual(encodingSupported("not-a-real-encoding"), false);
  });

  // Regression: chardet/normaliser variants that TextDecoder rejects raw
  test("normalizes dash-stripped labels (windows1252, shiftjis, iso88591)", () => {
    const buf1252 = Buffer.from([0x80, 0x41]); // € then A
    assert.strictEqual(decode(buf1252, "windows1252"), "€A");

    // shift_jis: 0x82 0xa0 = あ (U+3042)
    const bufSJIS = Buffer.from([0x82, 0xa0]);
    assert.strictEqual(decode(bufSJIS, "shiftjis"), "あ");

    // iso-8859-1: 0xe9 = é
    const bufLatin1 = Buffer.from([0xe9]);
    assert.strictEqual(decode(bufLatin1, "iso88591"), "é");
  });

  test("normalizes labels with spaces ('UTF-16 LE')", () => {
    const buf = Buffer.from([0x41, 0x00, 0x42, 0x00]); // "AB" in utf-16le
    assert.strictEqual(decode(buf, "UTF-16 LE"), "AB");
  });

  test("translates iconv-style aliases (cp950 → big5, cp936 → gbk, cp866 → ibm866)", () => {
    // cp866: 0x80 = Cyrillic capital А (U+0410)
    const bufCp866 = Buffer.from([0x80]);
    assert.strictEqual(decode(bufCp866, "cp866"), "А");

    // big5/cp950: 0xa4 0x40 = 一 (U+4E00)
    const bufBig5 = Buffer.from([0xa4, 0x40]);
    assert.strictEqual(decode(bufBig5, "cp950"), "一");

    assert.strictEqual(encodingSupported("cp936"), true);
  });

  test("normalizes utf16le from BOM detection", () => {
    const buf = Buffer.from([0x41, 0x00]);
    assert.strictEqual(decode(buf, "utf16le"), "A");
  });

  test("decode normalizes 'latin-1' (dash form rejected by raw TextDecoder)", () => {
    // 0xe9 = é in latin-1
    const buf = Buffer.from([0xe9]);
    assert.strictEqual(decode(buf, "latin-1"), "é");
  });

  test("decode accepts VS Code internal labels (utf8bom, macroman, big5hkscs)", () => {
    // utf8bom: stripping non-alnum gives 'utf8bom' → map to utf-8
    const buf = Buffer.from("hi", "utf-8");
    assert.strictEqual(decode(buf, "utf8bom"), "hi");
    assert.strictEqual(encodingSupported("macroman"), true);
    assert.strictEqual(encodingSupported("big5hkscs"), true);
  });

  test("encode normalizes 'iso-8859-1', 'latin-1', 'BINARY' to Node latin1", () => {
    // é at 0xe9 in latin-1 / iso-8859-1
    const expected = Buffer.from([0xe9]);
    assert.deepStrictEqual([...encode("é", "iso-8859-1")], [...expected]);
    assert.deepStrictEqual([...encode("é", "latin-1")], [...expected]);
    assert.deepStrictEqual([...encode("é", "BINARY")], [...expected]);
  });
});
