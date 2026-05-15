// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { analyse } from "chardet";
import { configuration } from "./helpers/configuration";

function detectEncodingByBOM(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 2) {
    return null;
  }

  const b0 = buffer.readUInt8(0);
  const b1 = buffer.readUInt8(1);

  if (b0 === 0xfe && b1 === 0xff) {
    return "utf-16be";
  }

  if (b0 === 0xff && b1 === 0xfe) {
    return "utf-16le";
  }

  if (buffer.length < 3) {
    return null;
  }

  const b2 = buffer.readUInt8(2);

  if (b0 === 0xef && b1 === 0xbb && b2 === 0xbf) {
    return "utf-8";
  }

  return null;
}

const IGNORE_ENCODINGS = ["ascii", "utf-8", "utf-16", "utf-32"];

/** Loose key used only for matching priority-list entries to chardet output. */
function looseKey(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

export function detectEncoding(buffer: Buffer): string | null {
  const bomEncoding = detectEncodingByBOM(buffer);
  if (bomEncoding) {
    return bomEncoding;
  }

  const detected = analyse(buffer);
  if (!detected || detected.length === 0) {
    return null;
  }

  const encodingPriorities =
    configuration.get<string[]>("experimental.encoding_priority", []) || [];

  if (encodingPriorities.length > 0) {
    for (const pri of encodingPriorities) {
      const match = detected.find(d => looseKey(pri) === looseKey(d.name));
      if (match && match.confidence > 60) {
        return match.name;
      }
    }
  }

  const best = detected[0]!;
  if (best.confidence < 80) {
    return null;
  }

  const encoding = best.name;

  // Ignore encodings chardet can't guess reliably
  // (http://chardet.readthedocs.io/en/latest/supported-encodings.html)
  if (IGNORE_ENCODINGS.indexOf(encoding.toLowerCase()) >= 0) {
    return null;
  }

  return encoding;
}
