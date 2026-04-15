/**
 * Credential storage mode - determines where SVN credentials are stored
 */
export type CredentialMode =
  | "auto"
  | "systemKeyring"
  | "extensionStorage"
  | "prompt";
