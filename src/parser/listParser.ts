// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { parseXml, ensureArray } from "./xmlParserAdapter";
import { ISvnListItem } from "../common/types";

export function parseSvnList(content: string): Promise<ISvnListItem[]> {
  return parseXml(
    content,
    (parsed: unknown) => {
      const result = parsed as {
        lists?: { list?: { entry?: unknown } };
        list?: { entry?: unknown };
        entry?: unknown;
      };
      // SVN outputs <lists><list path="..."><entry>...
      // Handle both <lists><list> and direct <list> formats
      const listNode =
        result.lists?.list ?? result.list ?? ({ entry: result.entry } as const);
      return ensureArray(listNode?.entry) as ISvnListItem[];
    },
    "list"
  );
}
