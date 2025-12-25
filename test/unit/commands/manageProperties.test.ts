import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Manage Properties Command Tests (P2.2)
 *
 * Tests unified property management quick-pick.
 * Consolidates EOL, MIME, Auto-Props, Ignore, Lock settings.
 */

// Mock VS Code
const mockWindow = {
  showQuickPick: vi.fn()
};

const mockCommands = {
  executeCommand: vi.fn()
};

/**
 * Property categories for the unified command.
 */
const PROPERTY_CATEGORIES = [
  { label: "$(symbol-property) Line Endings", id: "eol" },
  { label: "$(file-media) File Types", id: "mime" },
  { label: "$(gear) Auto-Properties", id: "autoprops" },
  { label: "$(eye-closed) Ignore Patterns", id: "ignore" },
  { label: "$(lock) Lock Settings", id: "lock" }
];

/**
 * Show unified property management quick-pick.
 */
async function manageProperties(uri?: { fsPath: string }): Promise<void> {
  const selected = await mockWindow.showQuickPick(PROPERTY_CATEGORIES, {
    title: "Manage File Properties",
    placeHolder: "Select property category"
  });

  if (!selected) return;

  switch (selected.id) {
    case "eol":
      await mockCommands.executeCommand("sven.manageEolStyles", uri);
      break;
    case "mime":
      await mockCommands.executeCommand("sven.setMimeType", uri);
      break;
    case "autoprops":
      await mockCommands.executeCommand("sven.manageAutoProps");
      break;
    case "ignore":
      await mockCommands.executeCommand("sven.viewIgnorePatterns", uri);
      break;
    case "lock":
      await mockCommands.executeCommand("sven.manageLocks");
      break;
  }
}

describe("Manage Properties Command (P2.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Category Quick-Pick", () => {
    it("shows all 5 property categories", async () => {
      mockWindow.showQuickPick.mockResolvedValue(undefined);

      await manageProperties();

      expect(mockWindow.showQuickPick).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "eol" }),
          expect.objectContaining({ id: "mime" }),
          expect.objectContaining({ id: "autoprops" }),
          expect.objectContaining({ id: "ignore" }),
          expect.objectContaining({ id: "lock" })
        ]),
        expect.objectContaining({
          title: "Manage File Properties"
        })
      );
    });

    it("does nothing when user cancels", async () => {
      mockWindow.showQuickPick.mockResolvedValue(undefined);

      await manageProperties();

      expect(mockCommands.executeCommand).not.toHaveBeenCalled();
    });
  });

  describe("Category Navigation", () => {
    it("opens EOL management when Line Endings selected", async () => {
      const uri = { fsPath: "/test/file.txt" };
      mockWindow.showQuickPick.mockResolvedValue(PROPERTY_CATEGORIES[0]); // eol

      await manageProperties(uri);

      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        "sven.manageEolStyles",
        uri
      );
    });

    it("opens MIME type when File Types selected", async () => {
      const uri = { fsPath: "/test/file.txt" };
      mockWindow.showQuickPick.mockResolvedValue(PROPERTY_CATEGORIES[1]); // mime

      await manageProperties(uri);

      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        "sven.setMimeType",
        uri
      );
    });

    it("opens Auto-Props when selected", async () => {
      mockWindow.showQuickPick.mockResolvedValue(PROPERTY_CATEGORIES[2]); // autoprops

      await manageProperties();

      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        "sven.manageAutoProps"
      );
    });

    it("opens Ignore Patterns when selected", async () => {
      const uri = { fsPath: "/test/folder" };
      mockWindow.showQuickPick.mockResolvedValue(PROPERTY_CATEGORIES[3]); // ignore

      await manageProperties(uri);

      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        "sven.viewIgnorePatterns",
        uri
      );
    });

    it("opens Lock Settings when selected", async () => {
      mockWindow.showQuickPick.mockResolvedValue(PROPERTY_CATEGORIES[4]); // lock

      await manageProperties();

      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        "sven.manageLocks"
      );
    });
  });
});
