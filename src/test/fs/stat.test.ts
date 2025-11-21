import * as assert from "assert";
import { stat } from "../../fs/stat";
import { lstat } from "../../fs/lstat";
import { writeFile } from "../../fs/write_file";
import { newTempDir, destroyAllTempPaths } from "../testUtil";
import { join } from "path";

suite("Test stat/lstat wrappers", () => {
  suiteTeardown(() => {
    destroyAllTempPaths();
  });

  test("stat file - returns file stats", async () => {
    const dir = newTempDir("stat-file");
    const filePath = join(dir, "file.txt");

    await writeFile(filePath, "data", "utf8");
    const stats = await stat(filePath);

    assert.ok(stats.isFile());
    assert.ok(!stats.isDirectory());
    assert.ok(stats.size >= 0);
  });

  test("lstat dir - returns directory stats", async () => {
    const dir = newTempDir("lstat-dir");
    const stats = await lstat(dir);

    assert.ok(stats.isDirectory());
    assert.ok(!stats.isFile());
  });
});
