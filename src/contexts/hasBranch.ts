// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { Disposable } from "vscode";
import { debounce } from "../decorators";
import { isTrunk } from "../helpers/branch";
import { SourceControlManager } from "../source_control_manager";
import { IDisposable, setVscodeContext } from "../util";

/**
 * Context for whether any open repository is on a branch (not trunk).
 * Used to conditionally show the "Branch Changes" view.
 */
export class HasBranch implements IDisposable {
  private disposables: Disposable[] = [];

  constructor(private sourceControlManager: SourceControlManager) {
    // When repository opened or closed
    sourceControlManager.onDidOpenRepository(
      this.checkHasBranch,
      this,
      this.disposables
    );
    sourceControlManager.onDidCloseRepository(
      this.checkHasBranch,
      this,
      this.disposables
    );
    // When repository state changes (e.g., branch switch)
    sourceControlManager.onDidChangeRepository(
      this.checkHasBranch,
      this,
      this.disposables
    );

    this.checkHasBranch();
  }

  @debounce(100)
  private checkHasBranch() {
    // Check if any repository is on a branch (not trunk)
    const hasBranch = this.sourceControlManager.repositories.some(
      repo => repo.currentBranch && !isTrunk(repo.currentBranch)
    );
    setVscodeContext("sven.hasBranch", hasBranch);
  }

  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}
