// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

/**
 * Lightweight encoding/decoding via Node's built-in TextDecoder + Buffer.
 * Replaces @vscode/iconv-lite-umd (~506 KB of bundled encoding tables) for
 * the common cases (UTF-8/16, ISO-8859-x, windows-12xx, CJK families).
 *
 * Trade-off: a handful of exotic encodings supported by iconv-lite are not
 * available here (e.g. VISCII, some Mac legacy codepages). Decoders for
 * those fall back to UTF-8 with a console warning rather than crashing.
 */

const BUFFER_WRITEABLE = new Set([
  "utf8",
  "utf-8",
  "utf16le",
  "utf-16le",
  "latin1",
  "ascii"
]);

/**
 * Map of normalized (lowercase, non-alphanumeric stripped) labels to
 * WHATWG canonical labels that `TextDecoder` actually accepts.
 *
 * Covers two sources of name drift:
 *   1. callers passing dash-stripped forms ("windows1252", "shiftjis"),
 *   2. iconv-lite codepage aliases ("cp866", "cp950", "cp936") that map
 *      onto WHATWG names.
 */
const LABEL_ALIASES: Record<string, string> = {
  utf8: "utf-8",
  utf16: "utf-16le",
  utf16le: "utf-16le",
  utf16be: "utf-16be",
  windows1250: "windows-1250",
  windows1251: "windows-1251",
  windows1252: "windows-1252",
  windows1253: "windows-1253",
  windows1254: "windows-1254",
  windows1255: "windows-1255",
  windows1256: "windows-1256",
  windows1257: "windows-1257",
  windows1258: "windows-1258",
  iso88591: "iso-8859-1",
  iso88592: "iso-8859-2",
  iso88593: "iso-8859-3",
  iso88594: "iso-8859-4",
  iso88595: "iso-8859-5",
  iso88596: "iso-8859-6",
  iso88597: "iso-8859-7",
  iso88598: "iso-8859-8",
  iso88599: "windows-1254", // WHATWG maps ISO-8859-9 onto windows-1254
  iso885910: "iso-8859-10",
  iso885913: "iso-8859-13",
  iso885914: "iso-8859-14",
  iso885915: "iso-8859-15",
  iso885916: "iso-8859-16",
  shiftjis: "shift_jis",
  eucjp: "euc-jp",
  euckr: "euc-kr",
  koi8r: "koi8-r",
  koi8u: "koi8-u",
  cp866: "ibm866",
  cp950: "big5",
  cp936: "gbk"
};

/**
 * Translate a user-supplied label into one TextDecoder will accept.
 * Falls back to the original label if no alias applies.
 */
function canonicalLabel(label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return LABEL_ALIASES[normalized] ?? label;
}

/** True iff a TextDecoder can be constructed with the given label. */
export function encodingSupported(encoding: string): boolean {
  try {
    new TextDecoder(canonicalLabel(encoding));
    return true;
  } catch {
    return false;
  }
}

/**
 * Decode bytes to string. Throws if the encoding label is unknown.
 * Callers should fall back to UTF-8 if they want to be defensive.
 */
export function decode(buffer: Buffer | Uint8Array, encoding: string): string {
  return new TextDecoder(canonicalLabel(encoding)).decode(buffer);
}

/**
 * Encode string to bytes. Supports UTF-8/16-LE, latin1, ASCII via Node's
 * native Buffer.from. Other encodings fall back to UTF-8 with a warning —
 * writing arbitrary legacy codepages was a rare path supported by iconv-lite.
 */
export function encode(text: string, encoding: string): Buffer {
  const normalized = encoding.toLowerCase();
  if (BUFFER_WRITEABLE.has(normalized)) {
    return Buffer.from(text, normalized as BufferEncoding);
  }
  console.warn(
    `textCodec: encoding "${encoding}" not supported for writing; falling back to utf-8`
  );
  return Buffer.from(text, "utf-8");
}
