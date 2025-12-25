// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { ISvnLogEntry } from "../common/types";
import {
  XmlParserAdapter,
  DEFAULT_PARSE_OPTIONS,
  ensureArray
} from "./xmlParserAdapter";
import { logError } from "../util/errorLogger";

export async function parseSvnLog(content: string): Promise<ISvnLogEntry[]> {
  return new Promise<ISvnLogEntry[]>((resolve, reject) => {
    try {
      const result = XmlParserAdapter.parse(content, DEFAULT_PARSE_OPTIONS);

      if (!result.logentry) {
        reject(new Error("Invalid log XML: missing logentry elements"));
        return;
      }

      const transformed = ensureArray(result.logentry);

      // Normalize paths structure: unwrap paths.path to paths array
      for (const logentry of transformed) {
        logentry.paths = ensureArray(logentry.paths?.path);
      }

      resolve(transformed);
    } catch (err) {
      logError("parseSvnLog error", err);
      reject(
        new Error(
          `Failed to parse log XML: ${err instanceof Error ? err.message : "Unknown error"}`
        )
      );
    }
  });
}
