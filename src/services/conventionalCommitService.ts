// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { truncate } from "../util/formatting";

/**
 * Parsed conventional commit structure
 */
export interface ConventionalCommit {
  type: string;
  scope?: string;
  description: string;
}

/**
 * Commit type with UI metadata.
 * Users define these via sven.commit.types setting.
 */
export interface CommitTypeInfo {
  type: string;
  icon: string;
  label: string;
  description: string;
}

/**
 * User-configurable commit type definition (from settings).
 * Label defaults to type if omitted.
 */
export interface CommitTypeConfig {
  type: string;
  icon: string;
  description: string;
}

const MAX_MESSAGE_LENGTH = 50;

/** Always-present option for free-form messages */
const CUSTOM_TYPE: CommitTypeInfo = {
  type: "custom",
  icon: "$(pencil)",
  label: "custom",
  description: "Write custom message"
};

// Regex to parse conventional commit: type(scope): description
const CONVENTIONAL_REGEX = /^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/;

/**
 * Service for parsing and formatting conventional commit messages.
 * Enforces 50-char max message length.
 * Commit types are user-configurable via sven.commit.types setting.
 */
export class ConventionalCommitService {
  private readonly userTypes: CommitTypeInfo[];

  constructor(configuredTypes?: CommitTypeConfig[]) {
    this.userTypes = (configuredTypes ?? [])
      .filter(t => t.type && t.icon && t.description && t.type !== "custom")
      .map(t => ({
        type: t.type,
        icon: t.icon,
        label: t.type,
        description: t.description
      }));
  }

  /**
   * Format a conventional commit object into a message string
   */
  format(commit: ConventionalCommit): string {
    const { type, scope, description } = commit;

    let prefix: string;
    if (scope) {
      prefix = `${type}(${scope}): `;
    } else {
      prefix = `${type}: `;
    }

    const maxDescLength = MAX_MESSAGE_LENGTH - prefix.length;
    const truncatedDesc = truncate(description, maxDescLength);

    return prefix + truncatedDesc;
  }

  /**
   * Parse a commit message into conventional commit structure.
   * Returns null if not a valid conventional commit format.
   */
  parse(message: string): ConventionalCommit | null {
    if (!message || message.trim() === "") {
      return null;
    }

    const match = message.match(CONVENTIONAL_REGEX);
    if (!match) {
      return null;
    }

    const [, type, scope, description] = match;
    return {
      type,
      scope: scope || undefined,
      description: (description || "").trim()
    };
  }

  /**
   * Get available commit types: user-configured types + always-present "custom" option.
   * Returns only "custom" when no types configured.
   */
  getCommitTypes(): CommitTypeInfo[] {
    return [...this.userTypes, CUSTOM_TYPE];
  }

  /**
   * Validate commit description.
   * Returns error message if invalid, undefined if valid.
   */
  validateDescription(description: string): string | undefined {
    if (!description || description.trim() === "") {
      return "Description cannot be empty";
    }

    if (description.length > MAX_MESSAGE_LENGTH) {
      return `Description exceeds ${MAX_MESSAGE_LENGTH} characters (${description.length})`;
    }

    return undefined;
  }

  /**
   * Get max allowed message length
   */
  getMaxLength(): number {
    return MAX_MESSAGE_LENGTH;
  }
}
