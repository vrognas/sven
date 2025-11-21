import * as assert from "assert";
import { mkdir } from "../../fs/mkdir";
import { exists } from "../../fs/exists";
import { newTempDir, destroyAllTempPaths } from "../testUtil";
import { join } from "path";

suite("Test mkdir wrapper", () => {
  suiteTeardown(() => {
    destroyAllTempPaths();
  });

  test("mkdir success - creates new directory", async () => {
    const parentDir = newTempDir("mkdir-test");
    const newDir = join(parentDir, "newdir");

    await mkdir(newDir);

    assert.ok(await exists(newDir));
  });

  test("mkdir exists - throws when directory exists", async () => {
    const existingDir = newTempDir("mkdir-exists");

    await assert.rejects(
      async () => await mkdir(existingDir),
      (err: NodeJS.ErrnoException) => {
        assert.strictEqual(err.code, "EEXIST");
        return true;
      }
    );
  });
});
