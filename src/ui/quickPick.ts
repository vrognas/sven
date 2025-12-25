// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

import { QuickPickItem, window } from "vscode";

export interface QuickPickConfig<T extends QuickPickItem> {
  items: T[];
  placeholder: string;
  title?: string;
}

export interface MultiSelectConfig<T extends QuickPickItem>
  extends QuickPickConfig<T> {
  canPickMany: true;
}

/**
 * Show single-select QuickPick.
 */
export async function quickPick<T extends QuickPickItem>(
  config: QuickPickConfig<T>
): Promise<T | undefined> {
  return window.showQuickPick(config.items, {
    placeHolder: config.placeholder,
    title: config.title
  });
}

/**
 * Show multi-select QuickPick.
 */
export async function quickPickMany<T extends QuickPickItem>(
  config: QuickPickConfig<T>
): Promise<T[] | undefined> {
  return window.showQuickPick(config.items, {
    placeHolder: config.placeholder,
    title: config.title,
    canPickMany: true
  });
}

/**
 * Show QuickPick with match on detail enabled.
 */
export async function quickPickWithDetail<T extends QuickPickItem>(
  config: QuickPickConfig<T>
): Promise<T | undefined> {
  return window.showQuickPick(config.items, {
    placeHolder: config.placeholder,
    title: config.title,
    matchOnDetail: true
  });
}
