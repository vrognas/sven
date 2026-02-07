import * as assert from "assert";
import { window } from "vscode";
import { vi } from "vitest";
import {
  confirm,
  confirmDestructive,
  confirmRevert,
  confirmRollback
} from "../../../ui/confirm";
import { input, inputComment } from "../../../ui/input";
import {
  quickPick,
  quickPickMany,
  quickPickWithDetail
} from "../../../ui/quickPick";
import * as ui from "../../../ui";

suite("UI Wrappers", () => {
  setup(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  teardown(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  suite("confirm", () => {
    test("returns true when confirm label chosen", async () => {
      const spy = vi
        .spyOn(window, "showWarningMessage")
        .mockResolvedValue("Yes");

      const ok = await confirm("Proceed?");

      assert.strictEqual(ok, true);
      assert.strictEqual(spy.mock.calls.length, 1);
      assert.strictEqual(spy.mock.calls[0]?.[0], "Proceed?");
      assert.deepStrictEqual(spy.mock.calls[0]?.[1], { modal: true });
      assert.strictEqual(spy.mock.calls[0]?.[2], "Yes");
    });

    test("returns false when canceled or other option", async () => {
      vi.spyOn(window, "showWarningMessage").mockResolvedValue(undefined);
      assert.strictEqual(await confirm("Proceed?"), false);
    });

    test("confirmRevert/confirmRollback pass expected labels", async () => {
      const spy = vi
        .spyOn(window, "showWarningMessage")
        .mockResolvedValue("Yes, revert");

      await confirmRevert();
      await confirmRollback("123");
      await confirmDestructive("Danger", "Do it");

      assert.strictEqual(spy.mock.calls.length, 3);
      assert.strictEqual(spy.mock.calls[0]?.[2], "Yes, revert");
      assert.strictEqual(spy.mock.calls[1]?.[2], "Yes, rollback");
      assert.strictEqual(spy.mock.calls[2]?.[2], "Do it");
      assert.ok(String(spy.mock.calls[1]?.[0]).includes("123"));
    });
  });

  suite("input", () => {
    test("maps input config to showInputBox", async () => {
      const validate = (value: string) =>
        value ? undefined : "cannot be empty";
      const spy = vi
        .spyOn(window, "showInputBox")
        .mockResolvedValue("typed-value");

      const result = await input({
        prompt: "Enter",
        placeholder: "Type here",
        value: "seed",
        password: true,
        ignoreFocusOut: true,
        validate
      });

      assert.strictEqual(result, "typed-value");
      assert.strictEqual(spy.mock.calls.length, 1);
      assert.strictEqual(spy.mock.calls[0]?.[0]?.prompt, "Enter");
      assert.strictEqual(spy.mock.calls[0]?.[0]?.placeHolder, "Type here");
      assert.strictEqual(spy.mock.calls[0]?.[0]?.value, "seed");
      assert.strictEqual(spy.mock.calls[0]?.[0]?.password, true);
      assert.strictEqual(spy.mock.calls[0]?.[0]?.ignoreFocusOut, true);
      assert.strictEqual(spy.mock.calls[0]?.[0]?.validateInput, validate);
    });

    test("inputComment delegates prompt + placeholder", async () => {
      const spy = vi.spyOn(window, "showInputBox").mockResolvedValue("note");

      const result = await inputComment("Comment prompt", "Optional");

      assert.strictEqual(result, "note");
      assert.strictEqual(spy.mock.calls[0]?.[0]?.prompt, "Comment prompt");
      assert.strictEqual(spy.mock.calls[0]?.[0]?.placeHolder, "Optional");
    });
  });

  suite("quickPick", () => {
    test("single, multi, and detail options map correctly", async () => {
      const items = [{ label: "A" }, { label: "B" }];
      const spy = vi
        .spyOn(window, "showQuickPick")
        .mockResolvedValue(items[0] as any);

      await quickPick({ items, placeholder: "pick one", title: "T1" });
      await quickPickMany({ items, placeholder: "pick many", title: "T2" });
      await quickPickWithDetail({
        items,
        placeholder: "pick detail",
        title: "T3"
      });

      assert.strictEqual(spy.mock.calls.length, 3);
      assert.strictEqual(spy.mock.calls[0]?.[1]?.canPickMany, undefined);
      assert.strictEqual(spy.mock.calls[1]?.[1]?.canPickMany, true);
      assert.strictEqual(spy.mock.calls[2]?.[1]?.matchOnDetail, true);
    });
  });

  suite("index exports", () => {
    test("barrel re-exports core wrappers", () => {
      assert.strictEqual(typeof ui.confirm, "function");
      assert.strictEqual(typeof ui.input, "function");
      assert.strictEqual(typeof ui.quickPick, "function");
    });
  });
});
