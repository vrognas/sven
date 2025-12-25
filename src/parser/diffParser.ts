// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { ISvnPath } from "../common/types";
import {
  XmlParserAdapter,
  DEFAULT_PARSE_OPTIONS,
  ensureArray
} from "./xmlParserAdapter";
import { logError } from "../util/errorLogger";

export async function parseDiffXml(content: string): Promise<ISvnPath[]> {
  return new Promise<ISvnPath[]>((resolve, reject) => {
    try {
      const result = XmlParserAdapter.parse(content, DEFAULT_PARSE_OPTIONS);

      if (!result.paths?.path) {
        reject(new Error("Invalid diff XML: missing paths or path elements"));
        return;
      }

      resolve(ensureArray(result.paths.path));
    } catch (err) {
      logError("parseDiffXml error", err);
      reject(
        new Error(
          `Failed to parse diff XML: ${err instanceof Error ? err.message : "Unknown error"}`
        )
      );
    }
  });
}
