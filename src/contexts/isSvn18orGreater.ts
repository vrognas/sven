// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { Disposable } from "vscode";
import { createVersionContext } from "./svnVersionContext";

export class IsSvn18orGreater implements Disposable {
  private context: Disposable;

  constructor(svnVersion: string) {
    this.context = createVersionContext(svnVersion, "1.8", "isSvn18orGreater");
  }

  dispose() {
    this.context.dispose();
  }
}
