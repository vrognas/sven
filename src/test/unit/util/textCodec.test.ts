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
});
