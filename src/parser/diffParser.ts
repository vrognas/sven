// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { ISvnPath } from "../common/types";
import { parseXml, ensureArray } from "./xmlParserAdapter";

export function parseDiffXml(content: string): Promise<ISvnPath[]> {
  return parseXml(
    content,
    (parsed: unknown) => {
      const result = parsed as { paths?: { path?: unknown } };
      if (!result.paths?.path) {
        throw new Error("Invalid diff XML: missing paths or path elements");
      }
      return ensureArray(result.paths.path) as ISvnPath[];
    },
    "diff"
  );
}
