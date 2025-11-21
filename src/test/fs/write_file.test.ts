import * as assert from "assert";
import { writeFile } from "../../fs/write_file";
import { readFile } from "../../fs/read_file";
import { exists } from "../../fs/exists";
import { newTempDir, destroyAllTempPaths } from "../testUtil";
import { join } from "path";

suite("Test writeFile wrapper", () => {
  suiteTeardown(() => {
    destroyAllTempPaths();
  });

  test("write_file new - writes new file", async () => {
    const dir = newTempDir("write-test");
    const filePath = join(dir, "newfile.txt");
    const content = "test content";

    await writeFile(filePath, content, "utf8");

    assert.ok(await exists(filePath));
    const data = await readFile(filePath, "utf8");
    assert.strictEqual(data, content);
  });

  test("write_file overwrite - overwrites existing file", async () => {
    const dir = newTempDir("overwrite-test");
    const filePath = join(dir, "file.txt");

    await writeFile(filePath, "original", "utf8");
    await writeFile(filePath, "updated", "utf8");

    const data = await readFile(filePath, "utf8");
    assert.strictEqual(data, "updated");
  });
});
