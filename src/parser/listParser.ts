// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import {
  XmlParserAdapter,
  DEFAULT_PARSE_OPTIONS,
  ensureArray
} from "./xmlParserAdapter";
import { ISvnListItem } from "../common/types";
import { logError } from "../util/errorLogger";

export async function parseSvnList(content: string): Promise<ISvnListItem[]> {
  return new Promise<ISvnListItem[]>((resolve, reject) => {
    try {
      const result = XmlParserAdapter.parse(content, DEFAULT_PARSE_OPTIONS);

      // SVN outputs <lists><list path="..."><entry>...
      // Handle both <lists><list> and direct <list> formats
      const listNode = result.lists?.list ?? result.list;

      resolve(ensureArray(listNode?.entry));
    } catch (err) {
      logError("parseSvnList error", err);
      reject(
        new Error(
          `Failed to parse list XML: ${err instanceof Error ? err.message : "Unknown error"}`
        )
      );
    }
  });
}
