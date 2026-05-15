// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

/**
 * Lightweight encoding/decoding via Node's built-in TextDecoder + Buffer.
 * Replaces @vscode/iconv-lite-umd (~506 KB of bundled encoding tables) for
 * the common cases (UTF-8/16, ISO-8859-x, windows-12xx, CJK families).
 *
 * Trade-off: a handful of exotic encodings supported by iconv-lite are not
 * available here (e.g. some Mac legacy codepages). Falls back to UTF-8
 * with a console warning rather than crashing.
 */

const BUFFER_WRITEABLE = new Set([
  "utf8",
  "utf-8",
  "utf16le",
  "utf-16le",
  "latin1",
  "ascii"
]);

/** True iff a TextDecoder can be constructed with the given label. */
export function encodingSupported(encoding: string): boolean {
  try {
    new TextDecoder(encoding);
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
  return new TextDecoder(encoding).decode(buffer);
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
