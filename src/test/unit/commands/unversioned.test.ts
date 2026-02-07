import * as assert from "assert";
import { Uri } from "vscode";
import { vi } from "vitest";
import { DeleteUnversioned } from "../../../commands/deleteUnversioned";
import { RemoveUnversioned } from "../../../commands/removeUnversioned";
import { Repository } from "../../../repository";
import { Resource } from "../../../resource";
import { Status } from "../../../common/types";
import * as fs from "../../../fs";
import * as util from "../../../util";
import * as ui from "../../../ui";

suite("Unversioned Commands Tests", () => {
  let deleteCmd: DeleteUnversioned;
  let removeCmd: RemoveUnversioned;

  setup(() => {
    vi.restoreAllMocks();
    deleteCmd = new DeleteUnversioned();
    removeCmd = new RemoveUnversioned();
  });

  teardown(() => {
    deleteCmd.dispose();
    removeCmd.dispose();
    vi.restoreAllMocks();
  });

  suite("DeleteUnversioned Command", () => {
    test("deletes file when confirmed", async () => {
      const fileUri = Uri.file("/workspace/file.txt");
      const resource = new Resource(fileUri, Status.UNVERSIONED);

      vi.spyOn(ui, "confirmDestructive").mockResolvedValue(true);
      vi.spyOn(fs, "exists").mockResolvedValue(true as any);
      vi.spyOn(fs, "lstat").mockResolvedValue({ isDirectory: () => false } as any);
      const unlinkSpy = vi.spyOn(fs, "unlink").mockResolvedValue(undefined as any);
      const deleteDirSpy = vi
        .spyOn(util, "deleteDirectory")
        .mockResolvedValue(undefined as any);

      await deleteCmd.execute(resource);

      assert.strictEqual(unlinkSpy.mock.calls.length, 1);
      assert.strictEqual(unlinkSpy.mock.calls[0]![0], fileUri.fsPath);
      assert.strictEqual(deleteDirSpy.mock.calls.length, 0);
    });

    test("deletes directory when confirmed", async () => {
      const dirUri = Uri.file("/workspace/dir");
      const resource = new Resource(dirUri, Status.UNVERSIONED);

      vi.spyOn(ui, "confirmDestructive").mockResolvedValue(true);
      vi.spyOn(fs, "exists").mockResolvedValue(true as any);
      vi.spyOn(fs, "lstat").mockResolvedValue({ isDirectory: () => true } as any);
      vi.spyOn(fs, "unlink").mockResolvedValue(undefined as any);
      const deleteDirSpy = vi
        .spyOn(util, "deleteDirectory")
        .mockResolvedValue(undefined as any);

      await deleteCmd.execute(resource);

      assert.strictEqual(deleteDirSpy.mock.calls.length, 1);
      assert.strictEqual(deleteDirSpy.mock.calls[0]![0], dirUri.fsPath);
    });

    test("does nothing when user cancels", async () => {
      const fileUri = Uri.file("/workspace/file.txt");
      const resource = new Resource(fileUri, Status.UNVERSIONED);

      vi.spyOn(ui, "confirmDestructive").mockResolvedValue(false);
      const existsSpy = vi.spyOn(fs, "exists").mockResolvedValue(true as any);
      const unlinkSpy = vi.spyOn(fs, "unlink").mockResolvedValue(undefined as any);

      await deleteCmd.execute(resource);

      assert.strictEqual(existsSpy.mock.calls.length, 0);
      assert.strictEqual(unlinkSpy.mock.calls.length, 0);
    });
  });

  suite("RemoveUnversioned Command", () => {
    test("calls repository.removeUnversioned when confirmed", async () => {
      const removeSpy = vi.fn(async () => "ok");
      const repo = { removeUnversioned: removeSpy } as unknown as Repository;

      vi.spyOn(ui, "confirmDestructive").mockResolvedValue(true);

      await removeCmd.execute(repo);

      assert.strictEqual(removeSpy.mock.calls.length, 1);
    });

    test("does nothing when user cancels", async () => {
      const removeSpy = vi.fn(async () => "ok");
      const repo = { removeUnversioned: removeSpy } as unknown as Repository;

      vi.spyOn(ui, "confirmDestructive").mockResolvedValue(false);

      await removeCmd.execute(repo);

      assert.strictEqual(removeSpy.mock.calls.length, 0);
    });

    test("propagates repository errors after confirmation", async () => {
      const repo = {
        removeUnversioned: async () => {
          throw new Error("cleanup failed");
        }
      } as unknown as Repository;

      vi.spyOn(ui, "confirmDestructive").mockResolvedValue(true);

      await assert.rejects(
        () => removeCmd.execute(repo),
        /cleanup failed/
      );
    });
  });
});

