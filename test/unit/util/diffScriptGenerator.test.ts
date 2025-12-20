import * as assert from "assert";
import {
  generateBcsvnBatContent,
  isBeyondCompareValue
} from "../../../src/util/diffScriptGenerator";

suite("diffScriptGenerator", () => {
  suite("generateBcsvnBatContent", () => {
    test("generates valid batch script with BC path", () => {
      const bcPath = "C:\\Program Files\\Beyond Compare 5\\BCompare.exe";
      const content = generateBcsvnBatContent(bcPath);

      // Should contain escaped BC path
      assert.ok(
        content.includes(
          "C:\\\\Program Files\\\\Beyond Compare 5\\\\BCompare.exe"
        ),
        "Should contain escaped BC path"
      );

      // Should have CSV detection
      assert.ok(
        content.includes("findstr /i"),
        "Should have findstr for CSV detection"
      );
      assert.ok(content.includes(".csv"), "Should check for .csv extension");

      // Should use Table Compare for CSV
      assert.ok(
        content.includes('/fv="Table Compare"'),
        "Should use Table Compare view for CSV"
      );

      // Should have proper exit codes
      assert.ok(content.includes("EXIT /B 0"), "Should exit with 0 on success");
      assert.ok(content.includes("EXIT /B 1"), "Should exit with 1 on failure");
    });

    test("escapes backslashes correctly", () => {
      const bcPath = "C:\\Users\\test\\Apps\\BCompare.exe";
      const content = generateBcsvnBatContent(bcPath);

      assert.ok(
        content.includes("C:\\\\Users\\\\test\\\\Apps\\\\BCompare.exe"),
        "Should double-escape backslashes"
      );
    });
  });

  suite("isBeyondCompareValue", () => {
    test("accepts beyondcompare variations", () => {
      assert.ok(isBeyondCompareValue("beyondcompare"));
      assert.ok(isBeyondCompareValue("BeyondCompare"));
      assert.ok(isBeyondCompareValue("BEYONDCOMPARE"));
      assert.ok(isBeyondCompareValue("beyond compare"));
      assert.ok(isBeyondCompareValue("Beyond Compare"));
      assert.ok(isBeyondCompareValue("bc"));
      assert.ok(isBeyondCompareValue("BC"));
      assert.ok(isBeyondCompareValue("bcompare"));
      assert.ok(isBeyondCompareValue("BCompare"));
    });

    test("rejects non-BC values", () => {
      assert.ok(!isBeyondCompareValue("C:\\path\\to\\tool.exe"));
      assert.ok(!isBeyondCompareValue("winmerge"));
      assert.ok(!isBeyondCompareValue("kdiff3"));
      assert.ok(!isBeyondCompareValue(""));
    });
  });
});
