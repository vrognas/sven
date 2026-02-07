// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { commands } from "vscode";
import { SourceControlManager } from "../source_control_manager";

export async function fetchSourceControlManager(): Promise<SourceControlManager> {
  return (await commands.executeCommand(
    "sven.getSourceControlManager",
    ""
  )) as SourceControlManager;
}
