---
status: completed
priority: p2
issue_id: "004"
tags: [security, validation, integer-overflow, pr-26]
dependencies: []
completed_date: 2025-11-16
---

# Security: Revision Integer Overflow Risk

## Problem Statement

The `diffWithExternalTool` function validates revision format using regex but doesn't check upper bounds, allowing potentially dangerous large integers that could cause overflow or DoS.

## Findings

- Discovered during code review by security-sentinel
- Location: `src/util/fileOperations.ts:74-86`
- Regex validates numeric format: `/^\d+$/`
- No upper bound check (SVN max revision is 2^63-1, but parseInt has limits)
- Could allow integer overflow in downstream SVN command construction
- Potential DoS via extremely long numeric strings

## Current Code

```typescript
// Security: Validate revision format (must be numeric)
const revisionRegex = /^\d+$/;
if (oldRevision && !revisionRegex.test(oldRevision)) {
  const error = new Error(`Invalid old revision format: ${oldRevision}`);
  logError("Invalid revision format", error);
  window.showErrorMessage(error.message);
  throw error;
}
if (newRevision && !revisionRegex.test(newRevision)) {
  const error = new Error(`Invalid new revision format: ${newRevision}`);
  logError("Invalid revision format", error);
  window.showErrorMessage(error.message);
  throw error;
}
```

## Proposed Solutions

### Option 1: Reasonable Upper Bound Check (RECOMMENDED)
- **Pros**: Simple, prevents overflow and DoS
- **Cons**: Arbitrary limit (but 1 billion is generous)
- **Effort**: Small (5 minutes)
- **Risk**: Low

```typescript
const MAX_SVN_REVISION = 1000000000; // 1 billion - reasonable limit
const revisionRegex = /^\d+$/;

function validateRevision(revision: string, label: string): void {
  if (!revisionRegex.test(revision)) {
    throw new Error(`Invalid ${label} revision format: ${revision}`);
  }
  const num = parseInt(revision, 10);
  if (num > MAX_SVN_REVISION) {
    throw new Error(`${label} revision too large: ${revision} (max: ${MAX_SVN_REVISION})`);
  }
}

if (oldRevision) validateRevision(oldRevision, "old");
if (newRevision) validateRevision(newRevision, "new");
```

### Option 2: JavaScript Safe Integer Limit
- **Pros**: Uses language constant (Number.MAX_SAFE_INTEGER)
- **Cons**: Very large (2^53-1), doesn't prevent DoS from parsing
- **Effort**: Small (5 minutes)
- **Risk**: Low

```typescript
const num = parseInt(revision, 10);
if (num > Number.MAX_SAFE_INTEGER) {
  throw new Error(`Revision exceeds safe integer limit: ${revision}`);
}
```

### Option 3: Length Limit + Numeric Check
- **Pros**: Fast, prevents DoS from parsing huge strings
- **Cons**: Less semantic than numeric range
- **Effort**: Small (5 minutes)
- **Risk**: Low

```typescript
if (revision.length > 10) { // Max 10 digits = 9,999,999,999
  throw new Error(`Revision number too long: ${revision}`);
}
```

## Recommended Action

Implement Option 1 (reasonable upper bound) - balances security with practicality.
1 billion revisions is far beyond any real-world repository.

## Technical Details

- **Affected Files**: `src/util/fileOperations.ts`
- **Related Components**: SVN command execution, revision handling
- **Database Changes**: No
- **Performance Impact**: Negligible (one integer comparison)

## Resources

- Code review PR: #26
- Agent report: security-sentinel
- SVN revision numbering: https://svnbook.red-bean.com/en/1.7/svn.basic.in-action.html#svn.basic.in-action.revs
- JavaScript parseInt limits: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt

## Acceptance Criteria

- [x] Revisions validated against upper bound (1 billion or Number.MAX_SAFE_INTEGER)
- [x] Clear error message when revision exceeds limit
- [x] Tests cover edge cases (max valid, max+1, huge numbers)
- [x] No performance regression
- [x] Documentation updated with limit rationale

## Work Log

### 2025-11-16 - Implementation Complete
**By:** claude-code
**Actions:**
- Added MAX_SVN_REVISION = 1000000000 constant to validation/index.ts
- Updated validateRevision() to enforce upper bound after format check
- Added test suite "enforces upper bound limit" with 3 test cases
- Updated error message in search_log_by_revision.ts to mention limit
- Updated CHANGELOG.md and version to 2.17.150

**Implementation:**
- File: src/validation/index.ts - added upper bound check
- File: src/test/unit/validation/validators.test.ts - added tests
- File: src/commands/search_log_by_revision.ts - updated error msg
- Performance: Single integer comparison - negligible impact

### 2025-11-16 - Security Review Discovery
**By:** security-sentinel (Multi-Agent Code Review)
**Actions:**
- Identified during comprehensive security audit of PR #26
- Analyzed integer overflow and DoS vectors
- Categorized as P2 (IMPORTANT) security hardening

**Learnings:**
- Regex validation alone insufficient for numeric ranges
- parseInt can DoS with extremely long strings
- Defense-in-depth: format + range validation needed
- Real-world SVN repos rarely exceed millions of revisions

## Notes

Source: Security review performed on 2025-11-16
Review command: /compounding-engineering:review 26
Priority: P2 - Should fix before merge
Impact: Security hardening (prevent integer overflow and DoS)
