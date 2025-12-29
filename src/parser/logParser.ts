// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { ISvnLogEntry } from "../common/types";
import { parseXml, ensureArray } from "./xmlParserAdapter";

export function parseSvnLog(content: string): Promise<ISvnLogEntry[]> {
  return parseXml(
    content,
    (parsed: unknown) => {
      const result = parsed as { logentry?: unknown };
      if (!result.logentry) {
        // Empty log (no commits in range) is valid - return empty array
        return [];
      }

      const entries = ensureArray(result.logentry) as ISvnLogEntry[];

      // Normalize paths structure: unwrap paths.path to paths array
      for (const entry of entries) {
        entry.paths = ensureArray(
          (entry.paths as unknown as { path?: unknown })?.path
        ) as ISvnLogEntry["paths"];
      }

      return entries;
    },
    "log"
  );
}
