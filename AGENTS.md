# AGENTS.md — RefinedSets

This repo is **RefinedSets**: high-performance, memory-efficient, order-aware JS/TS collection types (Set-like) using **Array + Map hybrids**, **O(1) lookup**, and **null-marking + deferred compaction**. It also includes `LazyIterable<T>` for LINQ-style lazy pipelines. :contentReference[oaicite:0]{index=0}

## North-star rules

- **Performance first, but measurable**: if you claim faster/leaner, add a benchmark or a micro-measurement note.
- **No hidden allocations** in hot paths (iteration, membership checks, add/remove).
- Prefer **array locality** over pointer-heavy structures; avoid linked-list patterns.
- Preserve **ordered iteration** guarantees explicitly; never "accidentally reorder" due to compaction or deletes.
- **TypeScript-native**: strict typing, inferable APIs, minimal `any`.

## Core design primitives

### Storage model (default pattern)

Most structures should follow some variant of:

- `items: (T | null)[]` (or `T | undefined` if justified)
- `index: Map<K, number>` (or `Map<T, number>` for Set-like)
- `holes: number` and/or a hole-tracking mechanism

Deletion is typically:

- Mark slot as `null` (O(1))
- Update index/bookkeeping (O(1))
- Defer physical compaction until policy triggers

### Compaction policies

Support explicit compaction behavior, typically one of:

- `eager`: compact before every iteration
- `guaranteed`: compact on every removal
- `lazy`: compact after a full iteration
- `auto`: compact when sparsity threshold exceeded
- `manual`: caller controls compaction

If you add or change a policy:

- Document when compaction runs relative to iteration.
- State whether indices are stable between operations.
- Ensure iterators don't corrupt order semantics.

### Iteration contracts

- Iteration must be **order-stable** (insertion order unless the structure defines another order).
- If holes exist, decide whether iteration:
    - skips holes (common), or
    - yields tombstones (rare; must be explicit)
- Snapshot iterators, if supported, should be **opt-in** and explain memory/cost tradeoffs.

## LazyIterable guidelines

`LazyIterable<T>` is intended to behave like LINQ:

- transformations (`filter`, `map`, `flatMap`, `take`, etc.) are **lazy**
- evaluation happens once on consumption (`toArray`, `toSet`, `first`, `sum`, etc.)
- chaining should avoid intermediate arrays

Rules:

- Don't introduce eager evaluation unless method name clearly implies it (e.g., `toArray`).
- Prefer generator-based implementations.
- Keep per-element overhead low (no per-item closures created inside loops when avoidable).

## API shape & naming

- Be consistent across structures: `add`, `delete`, `has`, `clear`, `size`, `values`, `keys`, `entries`, `[Symbol.iterator]`.
- If semantics differ from native `Set`/`Map`, document it plainly (e.g., whether `delete` returns boolean, what happens on re-add after delete, etc.).
- Expose "power user" hooks intentionally:
    - `compact()` or `maybeCompact()`
    - `setCompactionPolicy(...)`
    - `asLazy()` and/or `lazy(x)` interop

## Correctness requirements

- All operations must preserve:
    - `has(x)` correctness
    - `size` correctness (especially with holes)
    - iteration order guarantees
    - consistent behavior after compaction
- Edge cases that often bite:
    - delete + re-add of same key/value
    - multiple deletes
    - compaction during iteration (should be prohibited, deferred, or safely handled)
    - `NaN` and `-0/+0` behavior if you mirror JS `Set` semantics (SameValueZero)

## Testing expectations

When adding/changing behavior, add tests that cover:

- order stability under add/delete/re-add sequences
- compaction triggers vs policies
- iterator behavior with holes
- `LazyIterable` laziness (ensure no eager evaluation)
- property-style tests where useful (e.g., comparing against a reference model)

If you fix a bug, include a regression test named after the scenario.

## Benchmarks & performance notes

- Benchmarks should:
    - isolate the hot path
    - include a baseline (native `Set`, `Map`, array scan, etc.)
    - report ops/sec and/or time per op
- If you change memory behavior, note:
    - additional maps/arrays introduced
    - hole bookkeeping cost
    - compaction frequency implications

## Implementation style

- Favor **composition** over deep inheritance trees.
- No prototype monkey-patching.
- Keep modules small and purpose-driven (e.g., `src/structures/`, `src/lazy/`).
- Avoid "clever" tricks that obscure invariants; the data-structure invariants must be readable.

## PR checklist (agents)

Before you open a PR:

- [ ] Invariants are stated in docstrings or module header.
- [ ] Tests cover the new behavior and at least one edge case.
- [ ] If performance/memory changed materially, include a benchmark or measurement note.
- [ ] No API drift without updating docs/readme and/or types.
- [ ] Iteration order semantics are unchanged (or explicitly changed and documented).

## What not to do

- Don't add validation layers or defensive checks in hot paths unless they're gated or proven cheap.
- Don't add dependencies that increase bundle weight without a strong reason.
- Don't introduce reindexing work during iteration unless the structure explicitly requires it.

## Working assumptions

- This library targets real-world JS runtimes (Node + browsers) and prioritizes GC friendliness and cache locality.
- Primary value proposition is: O(1) membership + ordered iteration + memory-conscious deletion + lazy pipelines. :contentReference[oaicite:1]{index=1}
