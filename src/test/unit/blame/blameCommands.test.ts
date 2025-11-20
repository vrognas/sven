import * as assert from "assert";
import { Uri } from "vscode";
import { BlameStateManager } from "../../../blame/blameStateManager";

suite("Blame Commands Tests", () => {
  let stateManager: BlameStateManager;
  let testUri: Uri;

  setup(() => {
    stateManager = new BlameStateManager();
    testUri = Uri.file("/test/file.ts");
  });

  teardown(() => {
    stateManager.dispose();
  });

  suite("ToggleBlame Command", () => {
    test("should toggle blame from disabled to enabled", () => {
      const initialState = stateManager.isBlameEnabled(testUri);
      stateManager.toggleBlame(testUri);
      assert.strictEqual(stateManager.isBlameEnabled(testUri), !initialState);
    });

    test("should toggle blame from enabled to disabled", () => {
      stateManager.setBlameEnabled(testUri, true);
      stateManager.toggleBlame(testUri);
      assert.strictEqual(stateManager.isBlameEnabled(testUri), false);
    });

    test("should return new state after toggle", () => {
      const newState = stateManager.toggleBlame(testUri);
      assert.strictEqual(newState, stateManager.isBlameEnabled(testUri));
    });
  });

  suite("ShowBlame Command", () => {
    test("should enable blame for file", () => {
      stateManager.setBlameEnabled(testUri, false);
      stateManager.setBlameEnabled(testUri, true);
      assert.strictEqual(stateManager.isBlameEnabled(testUri), true);
    });

    test("should not change state if already enabled", () => {
      stateManager.setBlameEnabled(testUri, true);
      stateManager.setBlameEnabled(testUri, true);
      assert.strictEqual(stateManager.isBlameEnabled(testUri), true);
    });
  });

  suite("ClearBlame Command", () => {
    test("should disable blame for file", () => {
      stateManager.setBlameEnabled(testUri, true);
      stateManager.clearBlame(testUri);
      assert.strictEqual(stateManager.isBlameEnabled(testUri), false);
    });

    test("should not error if blame already disabled", () => {
      stateManager.clearBlame(testUri);
      assert.strictEqual(stateManager.isBlameEnabled(testUri), false);
    });

    test("should remove file from enabled files list", () => {
      stateManager.setBlameEnabled(testUri, true);
      assert.strictEqual(stateManager.getEnabledFiles().length, 1);

      stateManager.clearBlame(testUri);
      assert.strictEqual(stateManager.getEnabledFiles().length, 0);
    });
  });

  suite("EnableBlame Command", () => {
    test("should enable blame for file when disabled", () => {
      stateManager.setBlameEnabled(testUri, false);
      stateManager.setBlameEnabled(testUri, true);
      assert.strictEqual(stateManager.isBlameEnabled(testUri), true);
    });

    test("should keep blame enabled when already enabled", () => {
      stateManager.setBlameEnabled(testUri, true);
      stateManager.setBlameEnabled(testUri, true);
      assert.strictEqual(stateManager.isBlameEnabled(testUri), true);
    });

    test("should fire state change event", () => {
      let eventFired = false;
      stateManager.onDidChangeState(() => { eventFired = true; });
      stateManager.setBlameEnabled(testUri, true);
      assert.strictEqual(eventFired, true);
    });
  });

  suite("DisableBlame Command", () => {
    test("should disable blame for file when enabled", () => {
      stateManager.setBlameEnabled(testUri, true);
      stateManager.setBlameEnabled(testUri, false);
      assert.strictEqual(stateManager.isBlameEnabled(testUri), false);
    });

    test("should keep blame disabled when already disabled", () => {
      stateManager.setBlameEnabled(testUri, false);
      stateManager.setBlameEnabled(testUri, false);
      assert.strictEqual(stateManager.isBlameEnabled(testUri), false);
    });

    test("should fire state change event", () => {
      let eventFired = false;
      stateManager.onDidChangeState(() => { eventFired = true; });
      stateManager.setBlameEnabled(testUri, false);
      assert.strictEqual(eventFired, true);
    });
  });

  suite("Icon State Integration", () => {
    test("should show enable icon when blame disabled", () => {
      stateManager.setBlameEnabled(testUri, false);
      const isEnabled = stateManager.isBlameEnabled(testUri);
      assert.strictEqual(isEnabled, false); // Show enableBlame command (eye-closed)
    });

    test("should show disable icon when blame enabled", () => {
      stateManager.setBlameEnabled(testUri, true);
      const isEnabled = stateManager.isBlameEnabled(testUri);
      assert.strictEqual(isEnabled, true); // Show disableBlame command (eye)
    });

    test("should toggle between states correctly", () => {
      // Start disabled
      stateManager.setBlameEnabled(testUri, false);
      assert.strictEqual(stateManager.isBlameEnabled(testUri), false);

      // Enable
      stateManager.setBlameEnabled(testUri, true);
      assert.strictEqual(stateManager.isBlameEnabled(testUri), true);

      // Disable
      stateManager.setBlameEnabled(testUri, false);
      assert.strictEqual(stateManager.isBlameEnabled(testUri), false);
    });
  });
});
