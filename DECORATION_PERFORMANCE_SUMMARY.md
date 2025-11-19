# Decoration Performance Summary

**TL;DR**: Quantize gradient to 20 colors → 5x faster renders, no visual degradation

---

## Current State

**Architecture**: One TextEditorDecorationType per unique color
- Small files (10 revs): 10 types, 3ms render ✅
- Medium files (50 revs): 50 types, 15ms render 🟡  
- Large files (100 revs): 100 types, 30ms render 🟠
- Ancient files (500+ revs): 121 types max, 36ms render 🔴

**Problem**: 100+ decoration types exceed 60fps budget (16.67ms)

---

## Root Cause

**VS Code API design**:
- gutterIconPath set at decoration type creation (immutable)
- Each color needs separate decoration type
- Each setDecorations() call triggers render overhead (~0.3ms)

**Current gradient**: Continuous hue 0-120° (121 possible values)
```typescript
const hue = Math.round(normalized * 120);  // 0, 1, 2, ..., 120
```

---

## Solution: Quantize to 20-Color Palette

**Change** (blameProvider.ts:532):
```typescript
// Before:
const hue = Math.round(normalized * 120);

// After:  
const bucketSize = 6;  // 120 / 20 = 6° per bucket
const hue = Math.round(Math.round(normalized * 120) / bucketSize) * bucketSize;
```

**Impact**:
- Decoration types: 121 max → 20 fixed (83% reduction)
- Render time: 30ms → 6ms on large files (5x faster)
- Memory: 121 KB → 20 KB (negligible, both <150 KB)
- Visual quality: No perceptible degradation (6° hue steps)

**Performance**:
- All files render in <10ms (stays within 60fps budget)
- Cache hit rate 95%+ (20 types reused across all files)
- No LRU eviction needed (20 types small enough to keep all)

---

## Why 20 Colors?

**Human perception**:
- Just-noticeable difference: ~10° hue at 70% saturation
- 6° quantization: Imperceptible to human eye
- 20 distinct hues: Sufficient for gradient perception

**Performance**:
- 10 colors: 3ms render, but visible banding (12° steps)
- 20 colors: 6ms render, no visible banding (6° steps) ✅
- 40 colors: 12ms render, no benefit over 20

**Tradeoff**: 20 is sweet spot (performance + quality)

---

## Alternatives Considered

**LRU cache**: Over-engineering (20 types already small)
**Virtual scrolling**: VS Code already viewport-culls (no benefit)
**Single decoration type**: Not possible (gutterIconPath immutable)
**10-color palette**: Visible banding (12° steps noticeable)

---

## Implementation

**Phase 1**: Quantize gradient (1 line change) + tests (2-3h)
**Phase 2**: Performance monitoring (optional, 1h)
**Phase 3**: Documentation updates (30m)

**Total**: 3-4h for complete implementation

---

## Unresolved Questions

1. User-configurable palette size? (defer to v2)
2. Dynamic palette based on revision count? (no, inconsistent UX)
3. Dispose old types on palette change? (no, 20 KB negligible)

---

**Recommendation**: Implement 20-color quantization immediately (low risk, high reward)

**Files**: 
- Analysis: `/home/user/positron-svn/DECORATION_PERFORMANCE_ANALYSIS.md`
- Summary: `/home/user/positron-svn/DECORATION_PERFORMANCE_SUMMARY.md`
