// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

export interface ErrorContext {
  rawCombined: string;
  fullErrorRaw: string;
  fullErrorSanitized: string;
}

interface ErrorLike {
  message?: string;
  stderr?: string;
  stderrFormated?: string;
}

export function extractErrorCode(stderr: string): string | undefined {
  const match = stderr.match(/E\d{6}/);
  return match ? match[0] : undefined;
}

export function includesAny(text: string, needles: readonly string[]): boolean {
  return needles.some(needle => text.includes(needle));
}

export function buildErrorContext(
  error: unknown,
  sanitizeStderr: (stderr: string) => string
): ErrorContext {
  const err = error as ErrorLike | undefined;
  const errorStr = err?.message || String(error) || "";
  const rawStderr = err?.stderr || err?.stderrFormated || "";
  const sanitizedStderr = sanitizeStderr(rawStderr);
  const rawCombined = `${errorStr} ${rawStderr}`;

  return {
    rawCombined,
    fullErrorRaw: rawCombined.toLowerCase(),
    fullErrorSanitized: `${errorStr} ${sanitizedStderr}`.toLowerCase()
  };
}
