// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { Repository } from "../repository";
import { confirmDestructive } from "../ui";
import { Command } from "./command";

export class RemoveUnversioned extends Command {
  constructor() {
    super("sven.removeUnversioned", { repository: true });
  }

  public async execute(repository: Repository) {
    const confirmed = await confirmDestructive(
      "Remove all unversioned files except ignored?",
      "Remove"
    );
    if (!confirmed) return;
    await repository.removeUnversioned();
  }
}
