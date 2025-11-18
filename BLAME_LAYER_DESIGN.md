# SVN Blame Layer Design

**Version**: 1.0
**Date**: 2025-11-18

---

## 1. Type Definitions

### 1.1 Blame Entry Interface

Add to `/src/common/types.ts`:

```typescript
/**
 * Single line blame info from `svn blame --xml`
 * Maps to <entry> element in blame XML output
 */
export interface ISvnBlameEntry {
  /** Line number in file (1-indexed) */
  lineNumber: number;
  /** SVN revision when line was last modified */
  revision: string;
  /** Author who last modified this line */
  author: string;
  /** ISO 8601 date of last modification */
  date: string;
}

/**
 * Complete blame result for a file
 * Includes metadata + per-line entries
 */
export interface ISvnBlameResult {
  /** File path that was blamed */
  path: string;
  /** Blame entries (one per line) */
  entries: ISvnBlameEntry[];
  /** Timestamp when blame was fetched (for cache invalidation) */
  timestamp: number;
}
```

### 1.2 Operation Enum

Add to `Operation` enum in `/src/common/types.ts`:

```typescript
export enum Operation {
  // ... existing operations
  Blame = "Blame"
}
```

---

## 2. Repository Layer

### 2.1 Caching Strategy

**Pattern**: Follow `_infoCache` approach with LRU eviction

```typescript
// In Repository class
private _blameCache = new Map<string, {
  result: ISvnBlameResult;
  timeout: NodeJS.Timeout;
  lastAccessed: number;
}>();
private readonly MAX_BLAME_CACHE_SIZE = 100; // Smaller than info cache
private readonly BLAME_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
```

**Rationale**:
- Blame is expensive (processes entire file history)
- Cache smaller than info (100 vs 500) - blame data is larger
- 5min TTL balances freshness vs performance
- LRU eviction prevents memory leak on large repos

### 2.2 Repository.blame() Method

Add to `/src/svnRepository.ts`:

```typescript
import { sequentialize } from "./decorators";
import { parseBlameXml } from "./parser/blameParser";

export class Repository {
  // ... existing code

  /**
   * Get blame info for file at specific revision.
   * Uses LRU cache with 5min TTL.
   *
   * @param file - Absolute or relative file path
   * @param revision - SVN revision (defaults to "HEAD")
   * @param skipCache - Force fresh blame fetch
   * @returns Blame entries with line-level attribution
   *
   * @throws Error if file not under version control
   * @throws Error if file is binary
   * @throws Error if file is too large (>10MB configurable)
   */
  @sequentialize
  public async blame(
    file: string,
    revision: string = "HEAD",
    skipCache: boolean = false
  ): Promise<ISvnBlameResult> {
    // Normalize file path
    file = fixPathSeparator(file);
    const relativePath = this.removeAbsolutePath(file);
    const cacheKey = `${relativePath}@${revision}`;

    // Check cache
    const cached = this._blameCache.get(cacheKey);
    if (!skipCache && cached) {
      cached.lastAccessed = Date.now();
      return cached.result;
    }

    // Build SVN command
    const args = [
      "blame",
      "--xml",
      "-x", "-w --ignore-eol-style", // Ignore whitespace & EOL
      "-r", revision
    ];

    args.push(relativePath);

    // Execute command
    const result = await this.exec(args);

    // Parse XML
    let blameResult: ISvnBlameResult;
    try {
      const entries = await parseBlameXml(result.stdout);
      blameResult = {
        path: file,
        entries,
        timestamp: Date.now()
      };
    } catch (err) {
      logError(`Failed to parse blame XML for ${file}`, err);
      throw new Error(`Blame unavailable for ${file}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    // Evict LRU if cache full
    if (this._blameCache.size >= this.MAX_BLAME_CACHE_SIZE) {
      this.evictBlameCache();
    }

    // Cache result
    const timer = setTimeout(() => {
      this.resetBlameCache(cacheKey);
    }, this.BLAME_CACHE_TTL_MS);

    this._blameCache.set(cacheKey, {
      result: blameResult,
      timeout: timer,
      lastAccessed: Date.now()
    });

    return blameResult;
  }

  /**
   * Clear blame cache entry and timer
   */
  public resetBlameCache(cacheKey?: string): void {
    if (cacheKey) {
      const entry = this._blameCache.get(cacheKey);
      if (entry) {
        clearTimeout(entry.timeout);
        this._blameCache.delete(cacheKey);
      }
    } else {
      // Clear all
      this._blameCache.forEach(entry => clearTimeout(entry.timeout));
      this._blameCache.clear();
    }
  }

  /**
   * Evict least-recently-used blame cache entry
   */
  private evictBlameCache(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this._blameCache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.resetBlameCache(oldestKey);
    }
  }

  /**
   * Update clearInfoCacheTimers to also clear blame cache
   */
  public clearInfoCacheTimers(): void {
    this._infoCache.forEach(entry => clearTimeout(entry.timeout));
    this._infoCache.clear();

    // Add blame cache cleanup
    this._blameCache.forEach(entry => clearTimeout(entry.timeout));
    this._blameCache.clear();
  }
}
```

---

## 3. Parser Layer

### 3.1 Blame Parser

Create `/src/parser/blameParser.ts`:

```typescript
import { ISvnBlameEntry } from "../common/types";
import { XmlParserAdapter } from "./xmlParserAdapter";
import { logError } from "../util/errorLogger";

/**
 * Parse SVN blame XML output into structured entries.
 *
 * Example XML:
 * ```xml
 * <?xml version="1.0" encoding="UTF-8"?>
 * <blame>
 *   <target path="file.ts">
 *     <entry line-number="1">
 *       <commit revision="123">
 *         <author>jdoe</author>
 *         <date>2025-01-15T10:30:00.000000Z</date>
 *       </commit>
 *     </entry>
 *   </target>
 * </blame>
 * ```
 *
 * @param content - Raw XML from `svn blame --xml`
 * @returns Array of blame entries (one per line)
 * @throws Error if XML is malformed or missing required fields
 */
export async function parseBlameXml(content: string): Promise<ISvnBlameEntry[]> {
  return new Promise<ISvnBlameEntry[]>((resolve, reject) => {
    try {
      const result = XmlParserAdapter.parse(content, {
        mergeAttrs: true,
        explicitRoot: false,
        explicitArray: false,
        camelcase: true
      });

      // Validate root structure
      if (!result.target?.entry) {
        reject(new Error("Invalid blame XML: missing target/entry elements"));
        return;
      }

      // Normalize entry to array
      let entries = [];
      if (Array.isArray(result.target.entry)) {
        entries = result.target.entry;
      } else if (typeof result.target.entry === "object") {
        entries = [result.target.entry];
      }

      // Transform to ISvnBlameEntry[]
      const blameEntries: ISvnBlameEntry[] = entries
        .map((entry: any) => {
          // Skip unversioned lines (no commit info)
          if (!entry.commit) {
            return null;
          }

          return {
            lineNumber: parseInt(entry.lineNumber, 10),
            revision: entry.commit.revision,
            author: entry.commit.author || "unknown",
            date: entry.commit.date || ""
          };
        })
        .filter((e: any) => e !== null); // Remove nulls

      resolve(blameEntries);
    } catch (err) {
      logError("parseBlameXml error", err);
      reject(new Error(`Failed to parse blame XML: ${err instanceof Error ? err.message : "Unknown error"}`));
    }
  });
}
```

---

## 4. Command Layer

### 4.1 Blame Command

Create `/src/commands/blame.ts`:

```typescript
import { window, Uri } from "vscode";
import { Command } from "./command";
import { Repository } from "../repository";
import { logError } from "../util/errorLogger";

/**
 * Execute `svn blame` on active file.
 * Shows blame info in output channel or decorators.
 */
export class Blame extends Command {
  constructor() {
    super("svn.blame");
  }

  public async execute(uri?: Uri): Promise<void> {
    // Get target URI
    if (!uri) {
      const editor = window.activeTextEditor;
      if (!editor) {
        window.showWarningMessage("No file open to blame");
        return;
      }
      uri = editor.document.uri;
    }

    // Validate file scheme
    if (uri.scheme !== "file") {
      window.showWarningMessage("Blame only works on local files");
      return;
    }

    try {
      // Get repository
      const repositories = await this.runByRepository(uri, async (repository, resource) => {
        return repository;
      });

      if (repositories.length === 0) {
        window.showWarningMessage("File is not under SVN version control");
        return;
      }

      const repository = repositories[0];

      // Fetch blame (with progress indicator)
      await window.withProgress(
        {
          location: { viewId: "svn.blame" }, // Or ProgressLocation.Notification
          title: "Fetching blame..."
        },
        async () => {
          const blameResult = await repository.blame(uri.fsPath);

          // TODO: Display blame (implement in separate PR)
          // Options: Output channel, decorators, or custom view
          console.log(`Blame fetched: ${blameResult.entries.length} lines`);
        }
      );
    } catch (error) {
      logError("Blame command failed", error);

      // User-friendly error messages
      const errorStr = error?.message || error?.toString() || "";
      if (errorStr.includes("E155007")) {
        window.showErrorMessage("File is not under version control");
      } else if (errorStr.includes("binary")) {
        window.showErrorMessage("Cannot blame binary files");
      } else {
        window.showErrorMessage("Failed to fetch blame info");
      }
    }
  }
}
```

### 4.2 ToggleBlame Command (Optional)

Create `/src/commands/toggleBlame.ts`:

```typescript
import { window } from "vscode";
import { Command } from "./command";

/**
 * Toggle blame decorators on/off for active editor.
 * State managed by BlameDecorator service.
 */
export class ToggleBlame extends Command {
  constructor() {
    super("svn.toggleBlame");
  }

  public async execute(): Promise<void> {
    const editor = window.activeTextEditor;
    if (!editor) {
      window.showWarningMessage("No active editor to toggle blame");
      return;
    }

    // TODO: Implement decorator toggle logic
    // This requires BlameDecorator service (separate PR)
    window.showInformationMessage("Blame toggle not yet implemented");
  }
}
```

### 4.3 Register Commands

Update `/src/commands.ts`:

```typescript
import { Blame } from "./commands/blame";
import { ToggleBlame } from "./commands/toggleBlame";

export function registerCommands(
  sourceControlManager: SourceControlManager,
  disposables: Disposable[]
) {
  // ... existing registrations

  disposables.push(new Blame());
  disposables.push(new ToggleBlame());
}
```

---

## 5. Error Handling

### 5.1 Common Error Scenarios

| Error | SVN Code | Handling |
|-------|----------|----------|
| **Not versioned** | E155007 | Graceful message: "File not under version control" |
| **Binary file** | E195012 | Skip blame, show: "Cannot blame binary files" |
| **Large file** | - | Check size before blame (10MB default limit) |
| **File not found** | E155010 | Show: "File does not exist in repository" |
| **Network timeout** | E175002 | Retry with exponential backoff |
| **Invalid revision** | E160006 | Show: "Invalid revision specified" |

### 5.2 Size Validation

Add to `Repository.blame()` before SVN exec:

```typescript
// Check file size (prevent blaming huge files)
const maxSizeBytes = configuration.get<number>("blame.maxFileSize", 10 * 1024 * 1024); // 10MB
try {
  const fileStat = await stat(file);
  if (fileStat.size > maxSizeBytes) {
    throw new Error(`File too large to blame (${(fileStat.size / 1024 / 1024).toFixed(1)}MB > ${maxSizeBytes / 1024 / 1024}MB)`);
  }
} catch (err) {
  // File doesn't exist locally - might be remote, proceed with blame
}
```

### 5.3 Encoding Issues

**Problem**: svn-blamer uses `-x "-w --ignore-eol-style"` which might fail on some SVN versions.

**Solution**: Graceful degradation:

```typescript
try {
  // Try with whitespace ignore first
  const result = await this.exec(["blame", "--xml", "-x", "-w --ignore-eol-style", ...]);
} catch (err) {
  if (err.toString().includes("invalid option")) {
    // Fallback: blame without -x flag
    const result = await this.exec(["blame", "--xml", ...]);
  } else {
    throw err;
  }
}
```

---

## 6. Cache Invalidation Strategy

### 6.1 When to Invalidate

| Event | Action |
|-------|--------|
| **File modified** | Clear blame cache for that file |
| **Commit** | Clear all blame cache (revisions changed) |
| **Update/Switch** | Clear all blame cache (working copy changed) |
| **Revert** | Clear blame cache for affected files |
| **Manual refresh** | User-triggered cache clear |

### 6.2 Integration Points

Hook into existing Repository methods:

```typescript
// In Repository.commitFiles()
public async commitFiles(message: string, files: string[]) {
  const result = await this.exec(args);

  // Clear blame cache after commit
  this.resetBlameCache();

  return result;
}

// In Repository.update()
public async update(ignoreExternals: boolean = true): Promise<string> {
  const result = await this.exec(args);

  this.resetInfoCache();
  this.resetBlameCache(); // Add this

  return result;
}
```

---

## 7. Configuration

Add to `package.json` contributions:

```json
{
  "configuration": {
    "properties": {
      "svn.blame.enabled": {
        "type": "boolean",
        "default": true,
        "description": "Enable SVN blame functionality"
      },
      "svn.blame.maxFileSize": {
        "type": "number",
        "default": 10485760,
        "description": "Maximum file size (bytes) to blame (default 10MB)"
      },
      "svn.blame.ignoreWhitespace": {
        "type": "boolean",
        "default": true,
        "description": "Ignore whitespace changes in blame"
      },
      "svn.blame.cacheTimeout": {
        "type": "number",
        "default": 300000,
        "description": "Blame cache TTL in milliseconds (default 5min)"
      }
    }
  }
}
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

Create `/src/test/unit/parsers/blameParser.test.ts`:

```typescript
import * as assert from "assert";
import { parseBlameXml } from "../../../parser/blameParser";

describe("BlameParser", () => {
  it("should parse single entry", async () => {
    const xml = `<?xml version="1.0"?>
      <blame>
        <target path="file.ts">
          <entry line-number="1">
            <commit revision="123">
              <author>jdoe</author>
              <date>2025-01-15T10:30:00.000000Z</date>
            </commit>
          </entry>
        </target>
      </blame>`;

    const result = await parseBlameXml(xml);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].lineNumber, 1);
    assert.strictEqual(result[0].revision, "123");
    assert.strictEqual(result[0].author, "jdoe");
  });

  it("should parse multiple entries", async () => {
    // Test with multiple <entry> elements
  });

  it("should skip unversioned lines", async () => {
    // Test entries without <commit> element
  });

  it("should reject invalid XML", async () => {
    // Test malformed XML handling
  });
});
```

### 8.2 Integration Tests

Create `/src/test/integration/blame.test.ts`:

```typescript
describe("Repository.blame()", () => {
  it("should fetch blame for versioned file", async () => {
    // Test basic blame fetch
  });

  it("should cache blame results", async () => {
    // Verify cache hit on second call
  });

  it("should evict LRU when cache full", async () => {
    // Fill cache beyond MAX_BLAME_CACHE_SIZE
  });
});
```

### 8.3 E2E Tests

```typescript
describe("Blame Command", () => {
  it("should show error for non-versioned file", async () => {
    // Test error handling
  });

  it("should handle binary file gracefully", async () => {
    // Test binary file rejection
  });

  it("should respect file size limit", async () => {
    // Test large file rejection
  });
});
```

---

## 9. Performance Considerations

### 9.1 Benchmarks

| Operation | Target | Notes |
|-----------|--------|-------|
| **Blame fetch** | <500ms | For typical file (500 lines) |
| **Cache hit** | <5ms | In-memory lookup |
| **Parser** | <50ms | XML to ISvnBlameEntry[] |
| **LRU eviction** | <10ms | Single entry removal |

### 9.2 Optimization Opportunities

1. **Lazy loading**: Only fetch visible line range (requires VS Code API support)
2. **Incremental blame**: Cache per-line, update only changed lines
3. **Background fetch**: Pre-fetch blame for open files
4. **Compression**: Store cached blame compressed (if >100 entries)

---

## 10. Integration with Existing Code

### 10.1 Files to Modify

| File | Change | Reason |
|------|--------|--------|
| `/src/common/types.ts` | Add ISvnBlameEntry, ISvnBlameResult | Type definitions |
| `/src/svnRepository.ts` | Add blame(), cache methods | Core functionality |
| `/src/commands.ts` | Register Blame, ToggleBlame | Command registration |
| `/src/repository.ts` | Call resetBlameCache() on commits | Cache invalidation |
| `package.json` | Add configuration, commands | Extension manifest |

### 10.2 New Files to Create

| File | Purpose |
|------|---------|
| `/src/parser/blameParser.ts` | XML parsing logic |
| `/src/commands/blame.ts` | Blame command |
| `/src/commands/toggleBlame.ts` | Toggle command |
| `/src/test/unit/parsers/blameParser.test.ts` | Parser tests |
| `/src/test/integration/blame.test.ts` | Integration tests |

---

## 11. Cross-Check with svn-blamer

### 11.1 Similarities

- **XML parsing**: Both use XML output (`--xml` flag)
- **Whitespace ignore**: Both use `-x "-w --ignore-eol-style"`
- **Error handling**: Both catch E155007 (not working copy)

### 11.2 Differences

| Aspect | svn-blamer | Our Implementation |
|--------|------------|-------------------|
| **Caching** | None | LRU cache with TTL |
| **File validation** | Basic error catch | Size limits, encoding checks |
| **Integration** | Standalone decorators | Full VS Code SCM integration |
| **Parser** | xml-js library | XmlParserAdapter (fast-xml-parser) |
| **Sequentialization** | None | @sequentialize decorator |

### 11.3 Architecture Alignment

Our implementation:
- ✅ Follows Repository pattern (svnRepository.ts)
- ✅ Uses Command pattern (command.ts base)
- ✅ Leverages existing parser infrastructure (XmlParserAdapter)
- ✅ Respects decorator patterns (@sequentialize)
- ✅ Integrates with existing error logging (logError)
- ✅ Matches cache patterns (_infoCache model)

---

## 12. Unresolved Questions

1. **Decorator UI**: Output channel vs inline decorators vs custom panel?
2. **Revision navigation**: Should blame support "blame at revision X"?
3. **Diff integration**: Link blame to diff view for changed lines?
4. **Multi-file blame**: Support blaming multiple files at once?
5. **Blame history**: Should we show blame evolution over time?
6. **Performance**: Need lazy loading for files >1000 lines?
7. **Annotations**: Show blame in gutter or hover tooltips?

---

**Design Review Checklist**:
- [x] Type safety (strict TypeScript interfaces)
- [x] Error handling (user-friendly messages)
- [x] Caching strategy (LRU + TTL)
- [x] Performance targets (<500ms fetch)
- [x] Testing plan (unit + integration + E2E)
- [x] Configuration options (size limits, timeouts)
- [x] Integration points (existing patterns)
- [x] SVN command flags (--xml, -x, -r)
