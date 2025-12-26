// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { SourceControlResourceState, window } from "vscode";
import { configuration } from "../helpers/configuration";
import { Command } from "./command";

export class PullIncomingChange extends Command {
  constructor() {
    super("sven.treeview.pullIncomingChange");
  }

  public async execute(...changes: SourceControlResourceState[]) {
    const showUpdateMessage = configuration.get<boolean>(
      "showUpdateMessage",
      true
    );

    const uris = this.toUris(this.filterResources(changes));

    await this.runByRepository(uris, async (repository, resources) => {
      const files = this.toPaths(resources);

      // Pull files, collecting successes and failures
      const results: string[] = [];
      const failures: string[] = [];

      await Promise.all(
        files.map(async path => {
          try {
            const result = await repository.pullIncomingChange(path);
            results.push(result);
          } catch {
            failures.push(path);
          }
        })
      );

      // Refresh remote changes once after batch completes
      repository.refreshRemoteChanges();

      // Show notification
      if (showUpdateMessage) {
        if (failures.length > 0 && results.length === 0) {
          window.showErrorMessage(`Failed to update ${failures.length} files`);
        } else if (failures.length > 0) {
          window.showWarningMessage(
            `Updated ${results.length} files, ${failures.length} failed`
          );
        } else if (results.length === 1) {
          window.showInformationMessage(results[0] ?? "Updated 1 file");
        } else if (results.length > 1) {
          window.showInformationMessage(`Updated ${results.length} files`);
        }
      }
    });
  }
}
