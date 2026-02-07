// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { ISvnPath } from "../common/types";
import { parseXml, ensureArray } from "./xmlParserAdapter";

export function parseDiffXml(content: string): Promise<ISvnPath[]> {
  return parseXml(
    content,
    (parsed: unknown) => {
      const result = parsed as { paths?: { path?: unknown }; path?: unknown };
      const paths = result.paths?.path ?? result.path;
      if (!paths) {
        throw new Error("Invalid diff XML: missing paths or path elements");
      }
      return ensureArray(paths) as ISvnPath[];
    },
    "diff"
  );
}
