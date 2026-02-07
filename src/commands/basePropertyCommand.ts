// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import type { SourceControlResourceState, Uri } from "vscode";
import type { Repository } from "../repository";
import { Command } from "./command";

export type PropertyCommandArg = SourceControlResourceState | Uri;

export abstract class BasePropertyCommand extends Command {
  protected async executePropertyOperation(
    args: PropertyCommandArg[],
    operation: (repository: Repository, paths: string[]) => Promise<void>,
    errorMessage: string
  ): Promise<void> {
    await this.executeOnUrisOrResources(args, operation, errorMessage);
  }
}
