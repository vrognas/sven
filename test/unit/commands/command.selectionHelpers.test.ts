import { beforeEach, describe, expect, it, vi } from "vitest";
import { SourceControlResourceState, Uri } from "vscode";
import { Status } from "../../../src/common/types";
import { Command } from "../../../src/commands/command";
import { Repository } from "../../../src/repository";
import { Resource } from "../../../src/resource";

class TestSelectionCommand extends Command {
  constructor() {
    super("test.selectionHelpers");
  }

  public execute(): void {
    // No-op for tests
  }

  public async invokeWithSelectedResourceUris(
    resourceStates: SourceControlResourceState[],
    fn: (uris: Uri[]) => Promise<void>
  ): Promise<boolean> {
    return this.withSelectedResourceUris(resourceStates, fn);
  }

  public async invokeRunBySelectionPaths(
    selection: Resource[],
    fn: (repository: Repository, paths: string[]) => Promise<void>
  ): Promise<void> {
    await this.runBySelectionPaths(selection, fn);
  }
}

describe("Command selection helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("withSelectedResourceUris returns false when selection is empty", async () => {
    const command = new TestSelectionCommand();
    const getUrisSpy = vi
      .spyOn(
        command as unknown as {
          getResourceUrisOrExit: (...args: unknown[]) => Promise<Uri[] | null>;
        },
        "getResourceUrisOrExit"
      )
      .mockResolvedValue(null);
    const callback = vi.fn().mockResolvedValue(undefined);

    const result = await command.invokeWithSelectedResourceUris([], callback);

    expect(result).toBe(false);
    expect(getUrisSpy).toHaveBeenCalledTimes(1);
    expect(callback).not.toHaveBeenCalled();
  });

  it("withSelectedResourceUris runs callback with selected uris", async () => {
    const command = new TestSelectionCommand();
    const uris = [Uri.file("/repo/a.txt"), Uri.file("/repo/b.txt")] as Uri[];
    vi.spyOn(
      command as unknown as {
        getResourceUrisOrExit: (...args: unknown[]) => Promise<Uri[] | null>;
      },
      "getResourceUrisOrExit"
    ).mockResolvedValue(uris);
    const callback = vi.fn().mockResolvedValue(undefined);

    const result = await command.invokeWithSelectedResourceUris([], callback);

    expect(result).toBe(true);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(uris);
  });

  it("runBySelectionPaths delegates to runByRepositoryPaths with selection uris", async () => {
    const command = new TestSelectionCommand();
    const uri1 = Uri.file("/repo/a.txt");
    const uri2 = Uri.file("/repo/b.txt");
    const selection = [
      new Resource(uri1 as Uri, Status.MODIFIED),
      new Resource(uri2 as Uri, Status.MODIFIED)
    ];
    const fn = vi.fn().mockResolvedValue(undefined);
    const runByRepositoryPathsSpy = vi
      .spyOn(
        command as unknown as {
          runByRepositoryPaths: (
            uris: Uri[],
            callback: (repository: Repository, paths: string[]) => Promise<void>
          ) => Promise<void>;
        },
        "runByRepositoryPaths"
      )
      .mockResolvedValue(undefined);

    await command.invokeRunBySelectionPaths(selection, fn);

    expect(runByRepositoryPathsSpy).toHaveBeenCalledTimes(1);
    expect(runByRepositoryPathsSpy).toHaveBeenCalledWith([uri1, uri2], fn);
  });
});
