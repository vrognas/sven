// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import {
  SourceControlResourceState,
  TextDocumentShowOptions,
  Uri,
  ViewColumn,
  window,
  workspace
} from "vscode";
import { exists, stat } from "../fs";
import { Resource } from "../resource";
import { fromSvnUri } from "../uri";
import { Command } from "./command";

export class OpenFile extends Command {
  constructor() {
    super("sven.openFile");
  }

  public async execute(
    arg?: Resource | Uri,
    ...resourceStates: SourceControlResourceState[]
  ) {
    const preserveFocus = arg instanceof Resource;

    let uris: Uri[] | undefined;

    if (arg instanceof Uri) {
      if (arg.scheme === "svn") {
        uris = [Uri.file(fromSvnUri(arg).fsPath)];
      } else if (arg.scheme === "file") {
        uris = [arg];
      }
    } else {
      let resource: Resource | undefined = arg;

      if (!(resource instanceof Resource)) {
        resource = await this.getSCMResource();
      }

      if (resource) {
        uris = [
          ...resourceStates.map(r => r.resourceUri),
          resource.resourceUri
        ];
      }
    }

    if (!uris) {
      return;
    }

    const preview = uris.length === 1 ? true : false;
    const activeTextEditor = window.activeTextEditor;
    for (const uri of uris) {
      if (
        !uri ||
        ((await exists(uri.fsPath)) && (await stat(uri.fsPath)).isDirectory())
      ) {
        continue;
      }

      const opts: TextDocumentShowOptions = {
        preserveFocus,
        preview,
        viewColumn: ViewColumn.Active
      };

      if (
        activeTextEditor &&
        activeTextEditor.document.uri.toString() === uri.toString()
      ) {
        opts.selection = activeTextEditor.selection;
      }

      const document = await workspace.openTextDocument(uri);
      await window.showTextDocument(document, opts);
    }
  }
}
