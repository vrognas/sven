// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { window } from "vscode";

export interface InputConfig {
  prompt: string;
  placeholder?: string;
  value?: string;
  password?: boolean;
  ignoreFocusOut?: boolean;
  validate?: (value: string) => string | undefined | null;
}

/**
 * Show input box with standard configuration.
 */
export async function input(config: InputConfig): Promise<string | undefined> {
  return window.showInputBox({
    prompt: config.prompt,
    placeHolder: config.placeholder,
    value: config.value,
    password: config.password,
    ignoreFocusOut: config.ignoreFocusOut,
    validateInput: config.validate
  });
}

/**
 * Prompt for optional comment (e.g., lock comment, commit message).
 */
export async function inputComment(
  prompt: string,
  placeholder?: string
): Promise<string | undefined> {
  return input({ prompt, placeholder });
}
