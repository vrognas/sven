// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { ISvnInfo } from "../common/types";
import { parseXml } from "./xmlParserAdapter";

export function parseInfoXml(content: string): Promise<ISvnInfo> {
  return parseXml(
    content,
    (parsed: unknown) => {
      const result = parsed as { entry?: ISvnInfo };
      if (typeof result.entry === "undefined") {
        throw new Error("Invalid info XML: missing entry element");
      }
      return result.entry;
    },
    "info"
  );
}
