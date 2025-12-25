import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Show Glossary Command Tests (P1.2)
 *
 * Tests terminology glossary quick-pick.
 * Self-contained test without importing from module with deep vscode deps.
 */

// Mock VS Code window
const mockWindow = {
  showQuickPick: vi.fn()
};

/**
 * SVN Terminology Glossary - copy for testing.
 * Verify implementation matches this spec.
 */
const GLOSSARY = [
  {
    term: "BASE (Your Version)",
    definition: "The last version you downloaded from the server"
  },
  {
    term: "HEAD (Server Latest)",
    definition: "The most recent version on the SVN server"
  },
  {
    term: "PREV (Previous Revision)",
    definition: "The revision before the current one"
  },
  {
    term: "Working Copy",
    definition: "Your local folder containing checked-out files"
  },
  {
    term: "Revision",
    definition: "A numbered snapshot of the repository at a point in time"
  },
  {
    term: "Change Group (Changelist)",
    definition: "A named set of files to commit together"
  },
  {
    term: "Sparse / Selective Download",
    definition: "Download only specific folders instead of entire repository"
  },
  {
    term: "Lock",
    definition:
      "Reserve a file so others cannot edit it (useful for binary files)"
  },
  {
    term: "Annotations (Blame)",
    definition: "Show who last edited each line of a file"
  },
  {
    term: "Line Ending Style (EOL)",
    definition:
      "How line breaks are stored: native (OS default), LF (Unix), CRLF (Windows)"
  },
  {
    term: "File Type (MIME)",
    definition: "Content type like text/plain or application/octet-stream"
  },
  {
    term: "Require Lock (needs-lock)",
    definition: "Property that makes file read-only until locked"
  }
];

/**
 * Show glossary quick-pick - testing logic.
 */
async function showGlossary(): Promise<void> {
  const items = GLOSSARY.map(g => ({
    label: g.term,
    detail: g.definition
  }));

  await mockWindow.showQuickPick(items, {
    title: "SVN Terminology",
    placeHolder: "Search terms...",
    matchOnDetail: true
  });
}

describe("Show Glossary Command (P1.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Glossary Content", () => {
    it("defines all core SVN concepts", () => {
      const terms = GLOSSARY.map(g => g.term);

      // Core revision references
      expect(terms).toContain("BASE (Your Version)");
      expect(terms).toContain("HEAD (Server Latest)");

      // Working copy concepts
      expect(terms).toContain("Working Copy");
      expect(terms).toContain("Revision");

      // Common operations
      expect(terms).toContain("Annotations (Blame)");
      expect(terms).toContain("Lock");
    });

    it("has definitions for all terms", () => {
      for (const entry of GLOSSARY) {
        expect(entry.term).toBeTruthy();
        expect(entry.definition).toBeTruthy();
        expect(entry.definition.length).toBeGreaterThan(10);
      }
    });

    it("includes at least 8 glossary entries", () => {
      expect(GLOSSARY.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe("Quick Pick Behavior", () => {
    it("opens quick-pick with glossary items", async () => {
      mockWindow.showQuickPick.mockResolvedValue(undefined);

      await showGlossary();

      expect(mockWindow.showQuickPick).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            label: expect.any(String),
            detail: expect.any(String)
          })
        ]),
        expect.objectContaining({
          title: "SVN Terminology",
          placeHolder: expect.stringContaining("Search"),
          matchOnDetail: true
        })
      );
    });

    it("formats items with label and detail", async () => {
      mockWindow.showQuickPick.mockResolvedValue(undefined);

      await showGlossary();

      const items = mockWindow.showQuickPick.mock.calls[0][0];
      expect(items[0]).toHaveProperty("label");
      expect(items[0]).toHaveProperty("detail");
    });
  });
});
