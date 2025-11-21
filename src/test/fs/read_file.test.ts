import * as assert from "assert";
import { readFile } from "../../fs/read_file";
import { writeFile } from "../../fs/write_file";
import { newTempDir, destroyAllTempPaths } from "../testUtil";
import { join } from "path";

suite("Test readFile wrapper", () => {
  suiteTeardown(() => {
    destroyAllTempPaths();
  });

  test("read_file success - reads file content", async () => {
    const dir = newTempDir("read-test");
    const filePath = join(dir, "testfile.txt");
    const content = "test data";

    await writeFile(filePath, content, "utf8");
    const data = await readFile(filePath, "utf8");

    assert.strictEqual(data, content);
  });

  test("read_file not found - throws ENOENT", async () => {
    const dir = newTempDir("read-missing");
    const filePath = join(dir, "nonexistent.txt");

    await assert.rejects(
      async () => await readFile(filePath, "utf8"),
      (err: NodeJS.ErrnoException) => {
        assert.strictEqual(err.code, "ENOENT");
        return true;
      }
    );
  });
});
