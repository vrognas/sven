// Copyright (c) 2017-2020 Christopher Johnston
// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

// Only this file is allowed to import VSCode modules
// tslint:disable: import-blacklist

// Direct import so esbuild bundles it (fixes Theia IDE compatibility)
import * as iconvLiteUmd from "@vscode/iconv-lite-umd";

export const iconv = iconvLiteUmd;
