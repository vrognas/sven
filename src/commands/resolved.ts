// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import * as path from "path";
import { Uri, window } from "vscode";
import { configuration } from "../helpers/configuration";
import { Command } from "./command";

export class Resolved extends Command {
  constructor() {
    super("sven.resolved");
  }

  public async execute(uri: Uri) {
    if (!uri) {
      return;
    }

    const autoResolve = configuration.get<boolean>("conflict.autoResolve");

    if (!autoResolve) {
      const basename = path.basename(uri.fsPath);
      // Non-modal confirmation - less disruptive UX
      const pick = await window.showWarningMessage(
        `Mark "${basename}" as resolved?`,
        "Resolve",
        "Cancel"
      );

      if (pick !== "Resolve") {
        return;
      }
    }

    const uris = [uri];

    await this.runByRepository(uris, async (repository, resources) => {
      const files = resources.map(resource => resource.fsPath);

      await repository.resolve(files, "working");
    });
  }
}
