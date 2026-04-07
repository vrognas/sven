import { describe, it, expect, beforeEach } from "vitest";
import {
  ConventionalCommitService,
  ConventionalCommit
} from "../../../src/services/conventionalCommitService";

describe("ConventionalCommitService", () => {
  let service: ConventionalCommitService;

  beforeEach(() => {
    service = new ConventionalCommitService();
  });

  describe("format", () => {
    it("formats basic commit without scope", () => {
      const commit: ConventionalCommit = {
        type: "feat",
        description: "add dark mode"
      };
      expect(service.format(commit)).toBe("feat: add dark mode");
    });

    it("formats commit with scope", () => {
      const commit: ConventionalCommit = {
        type: "fix",
        scope: "ui",
        description: "button alignment"
      };
      expect(service.format(commit)).toBe("fix(ui): button alignment");
    });

    it("truncates description to 50 chars", () => {
      const commit: ConventionalCommit = {
        type: "feat",
        description:
          "this is a very long description that exceeds the maximum allowed length"
      };
      const result = service.format(commit);
      expect(result.length).toBeLessThanOrEqual(50);
      expect(result).toMatch(/\.\.\.$/);
    });
  });

  describe("parse", () => {
    it("parses basic conventional commit", () => {
      const result = service.parse("feat: add feature");
      expect(result).toEqual({
        type: "feat",
        scope: undefined,
        description: "add feature"
      });
    });

    it("parses commit with scope", () => {
      const result = service.parse("fix(api): resolve timeout");
      expect(result).toEqual({
        type: "fix",
        scope: "api",
        description: "resolve timeout"
      });
    });

    it("returns null for non-conventional message", () => {
      const result = service.parse("random commit message");
      expect(result).toBeNull();
    });

    it("returns null for empty message", () => {
      expect(service.parse("")).toBeNull();
    });
  });

  describe("getCommitTypes", () => {
    it("returns only custom option when no types configured", () => {
      const types = service.getCommitTypes();
      expect(types).toHaveLength(1);
      expect(types[0].type).toBe("custom");
    });

    it("returns user-configured types plus custom", () => {
      const userTypes = [
        { type: "data", icon: "$(database)", description: "Data changes" },
        { type: "model", icon: "$(beaker)", description: "Model updates" }
      ];
      const service2 = new ConventionalCommitService(userTypes);
      const types = service2.getCommitTypes();
      expect(types).toHaveLength(3); // data + model + custom
      expect(types[0].type).toBe("data");
      expect(types[1].type).toBe("model");
      expect(types[2].type).toBe("custom");
    });

    it("always appends custom option even with user types", () => {
      const service2 = new ConventionalCommitService([
        { type: "fix", icon: "$(bug)", description: "Bug fix" }
      ]);
      const types = service2.getCommitTypes();
      expect(types[types.length - 1].type).toBe("custom");
    });

    it("filters out user type named 'custom' to avoid collision", () => {
      const service2 = new ConventionalCommitService([
        { type: "custom", icon: "$(pencil)", description: "My custom" },
        { type: "data", icon: "$(database)", description: "Data" }
      ]);
      const types = service2.getCommitTypes();
      expect(types).toHaveLength(2); // data + built-in custom
      expect(types[0].type).toBe("data");
      expect(types[1].type).toBe("custom");
    });

    it("filters out malformed entries with missing fields", () => {
      const service2 = new ConventionalCommitService([
        { type: "", icon: "$(bug)", description: "Empty type" },
        { type: "good", icon: "", description: "Empty icon" },
        { type: "also-good", icon: "$(ok)", description: "" },
        { type: "valid", icon: "$(check)", description: "Valid entry" }
      ] as any);
      const types = service2.getCommitTypes();
      expect(types).toHaveLength(2); // valid + custom
      expect(types[0].type).toBe("valid");
    });
  });

  describe("validateDescription", () => {
    it("accepts valid description under 50 chars", () => {
      expect(service.validateDescription("short message")).toBeUndefined();
    });

    it("rejects description over 50 chars", () => {
      const longDesc = "a".repeat(51);
      expect(service.validateDescription(longDesc)).toContain("50");
    });

    it("rejects empty description", () => {
      expect(service.validateDescription("")).toContain("empty");
    });
  });
});
