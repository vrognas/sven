// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { posix as path } from "path";
import { commands, Uri, window } from "vscode";
import { Resource } from "../resource";
import { Command } from "./command";

export class OpenHeadFile extends Command {
  constructor() {
    super("sven.openHEADFile");
  }

  public async execute(arg?: Resource | Uri) {
    const resource = await this.resolveResourceFromArg(arg);

    if (!resource) {
      return;
    }

    const HEAD = await this.getLeftResource(resource, "HEAD");

    const basename = path.basename(resource.resourceUri.path);
    if (!HEAD) {
      window.showWarningMessage(
        `"HEAD version of '${basename}' is not available."`
      );
      return;
    }

    const basedir = path.dirname(resource.resourceUri.path);

    const uri = HEAD.with({
      path: path.join(basedir, `(HEAD) ${basename}`) // change document title
    });

    return commands.executeCommand<void>("vscode.open", uri, {
      preview: true
    });
  }
}
