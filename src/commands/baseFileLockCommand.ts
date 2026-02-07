// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import type { IExecutionResult } from "../common/types";
import type { Repository } from "../repository";
import { handleSvnResult } from "../util/lockHelpers";
import { Command } from "./command";

interface FileLockOperationConfig {
  args: unknown[];
  operation: (
    repository: Repository,
    paths: string[]
  ) => Promise<IExecutionResult>;
  successMessage: (count: number) => string;
  resultErrorPrefix: string;
  executeErrorMessage: string;
  onSuccess?: (repository: Repository, paths: string[]) => Promise<void>;
}

export abstract class BaseFileLockCommand extends Command {
  protected async executeFileLockOperation(
    config: FileLockOperationConfig
  ): Promise<void> {
    await this.executeOnUrisOrResources(
      config.args,
      async (repository, paths) => {
        const result = await config.operation(repository, paths);

        if (
          handleSvnResult(
            result,
            config.successMessage(paths.length),
            config.resultErrorPrefix
          )
        ) {
          if (config.onSuccess) {
            await config.onSuccess(repository, paths);
          }
        }
      },
      config.executeErrorMessage
    );
  }
}
