# AGENTS.md — RefinedSets

This repo is **RefinedSets**: provides specialized collection types and collection convenience tools. It is a standalone library. Its docs are explicit about performance and about compute vs memory trade-offs. It includes implementations of commonly combined JS collection primitives (e.g., Set + Array + Map), for improved semantics and performance.

## Guiding principles

- **Performance first, but measurable**: if you claim faster/leaner, add a benchmark or a micro-measurement note.
- **No hidden allocations** in hot paths (iteration, membership checks, add/remove).
- **No O(>1)** algorithm should be introduced without careful consideration, and must be clearly called out in API doc comments
- Preserve **ordered iteration** guarantees explicitly; never "accidentally reorder" due to compaction or deletes.
- **TypeScript-native**: strict typing, inferable APIs.
- Public **API doc comments** are robust and deliberately maintained. They describe behavior in a brief succinct statement, followed by detailed subtleties

## API shape & naming

- Be consistent across structures: `add`, `delete`, `has`, `clear`, `size`, `values`, `keys`, `entries`, `[Symbol.iterator]`.
- If semantics differ from native `Set`/`Map`, document it plainly (e.g., whether `delete` returns boolean, what happens on re-add after delete, etc.).

## Testing expectations

When adding/changing behavior, add tests that cover:

- **intended use**: demonstrate with concrete, realistic scenarios tailored to demonstrate & test proper use
- **side-effects**: inadvertant mutations, inadvertant iteration
- **performance**: documented big-O complexity and memory impact
- **validation**: invalid inputs (only those which type-checks allow), expected exceptions

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
- Never implement in a base class features that are sub-class specific,
  For example, "peek" belongs to queues or stacks, not their general-purpose base class, BaseOrderedSet.

## Change checklist

Before you open a PR:

- [ ] Invariants are stated in docstrings or module header.
- [ ] Tests coverage must be included and maintained.
- [ ] If performance/memory changed materially, include a benchmark or measurement note.
- [ ] No API drift without updating docs/readme and/or types.

## What not to do

- Don't add any runtime dependencies.
- Don't add validation layers or defensive checks in hot paths unless they're gated or proven cheap.
- Don't introduce reindexing work during iteration unless the structure explicitly requires it.

## Working assumptions

- This library targets real-world JS runtimes (Node + browsers) and prioritizes GC friendliness and cache locality.
- Primary value proposition is: O(1) membership + ordered iteration + memory-conscious + lazy pipelines.
