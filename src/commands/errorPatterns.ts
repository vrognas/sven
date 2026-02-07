// Copyright (c) 2025-present Viktor Rognas
// Licensed under MIT License

export const CLEANUP_ERROR_TOKENS = [
  "e155004",
  "e155005",
  "e155009",
  "e155010",
  "e155015",
  "e155016",
  "e155031",
  "e155032",
  "e155037",
  "e200030",
  "e200033",
  "e200034",
  "previous operation",
  "run 'cleanup'",
  "work queue",
  "is corrupt",
  "disk image is malformed"
] as const;

export const UPDATE_ERROR_TOKENS = [
  "e155019",
  "e200042",
  "out of date",
  "not up-to-date"
] as const;

export const CONFLICT_ERROR_TOKENS = ["e155023", "e200024"] as const;

export const AUTH_ERROR_TOKENS = [
  "e170001",
  "e215004",
  "no more credentials",
  "authorization failed",
  "authentication failed"
] as const;

export const NETWORK_ERROR_TOKENS = [
  "e170013",
  "e175002",
  "unable to connect",
  "network timeout",
  "connection refused",
  "could not connect"
] as const;

export const LOCK_CONFLICT_TOKENS = ["e200035", "already locked"] as const;

export const LOCK_NOT_LOCKED_TOKENS = ["e200036", "not locked"] as const;

export const LOCK_EXPIRED_TOKENS = ["e200041", "lock expired"] as const;

export const OUTPUT_ERROR_TOKENS = [
  "e261001",
  "e261002",
  "e250006",
  "access denied",
  "permission denied",
  "not readable"
] as const;

export const FORMAT_NETWORK_CONNECTION_TOKENS = [
  "e170013",
  "unable to connect",
  "connection refused",
  "could not resolve host"
] as const;

export const FORMAT_NETWORK_TIMEOUT_TOKENS = [
  "e175002",
  "timed out",
  "timeout",
  "operation timed out"
] as const;

export const FORMAT_CLEANUP_TOKENS = [
  "e155004",
  "e155037",
  "e200030",
  "e200033",
  "e155032",
  "previous operation",
  "run 'cleanup'"
] as const;

export const FORMAT_CODE_MESSAGES = [
  {
    token: "e200035",
    message: "Path already locked (E200035). Another user has the lock."
  },
  {
    token: "e200036",
    message: "Path not locked (E200036). No lock to release."
  },
  {
    token: "e200041",
    message: "Lock expired (E200041). Re-lock the file if needed."
  },
  {
    token: "e261001",
    message: "Access denied (E261001). Insufficient read permissions."
  },
  {
    token: "e261002",
    message: "Partial access (E261002). Some items not visible."
  },
  {
    token: "e250006",
    message: "Version mismatch (E250006). Client/server versions incompatible."
  }
] as const;
