import { LazyIterable } from '../iterable/LazyIterable';
import { MultiItemMappedArray } from '../internal/IndexMap';
import { SparseArray } from '../internal/SparseArray';

export const enum CompactionMode {
    /** compact when holes exceed a threshold on remove or iteration (balanced) */
    Auto = 'auto',
    /** compact *before* iteration if threshold is reached (write optimized) */
    Eager = 'eager',
    /** compact *immediately* on each removal */
    Guaranteed = 'guaranteed',
    /**
     * compact *after* fully iterating if threshold is reached (read optimized)
     * WARNING: can cause memory leak if many deletions occur without fully iterating
     * as it defers compaction until the next full iteration.
     */
    Lazy = 'lazy',
    /** compact only via explicit call (maximum control) */
    Manual = 'manual',
}

export interface BaseOrderedSetOptions<T = unknown, K = T> {
    /**
     * Selects when hole compaction runs.
     * Defaults to `CompactionMode.Auto`, balancing remove and iteration costs.
     */
    compaction?: CompactionMode;
    /**
     * Sets the hole-count threshold used by auto compaction.
     * Defaults to 256 and is ignored when `thresholdBytes` is provided.
     */
    holeThreshold?: number;
    /**
     * Sets an approximate hole-memory threshold for auto compaction.
     * When provided, this overrides `holeThreshold` via an internal bytes-per-hole estimate.
     */
    thresholdBytes?: number;
    /**
     * Controls whether repeated values are ignored on add.
     * Defaults to `true`; when `false`, duplicates are retained and removals can be count-limited.
     */
    deduplicate?: boolean;
    /**
     * Optional key extractor used to derive keys from values for indexing.
     * Defaults to identity (`(value) => value`).
     */
    keyExtractor?: (value: T) => K;
}

/**
 * Shared ordered-set base class with pluggable compaction behavior.
 * Uses sparse storage plus key-index mapping to preserve insertion order while keeping lookup and remove paths O(1) average-time.
 * Deletions create holes; compaction policy controls when those holes are reclaimed.
 */
export abstract class BaseOrderedSet<T, K = T> extends LazyIterable<T> {
    private static readonly EST_BYTES_PER_HOLE = 8;

    protected readonly items: MultiItemMappedArray<T, T>;
    private readonly deduplicate: boolean;
    private readonly keyExtractor: (value: T) => K;

    protected readonly compactBeforeIter: boolean;
    protected readonly compactAfterIter: boolean;
    protected readonly compactOnRemove: boolean;
    protected readonly compactAuto: boolean;
    protected readonly holeThreshold: number;

    public constructor(initial?: Iterable<T>, opts: BaseOrderedSetOptions<T, K> = {}) {
        super();

        const mode = opts.compaction ?? CompactionMode.Auto;
        this.compactBeforeIter = mode === CompactionMode.Eager;
        this.compactOnRemove = mode === CompactionMode.Guaranteed;
        this.compactAfterIter = mode === CompactionMode.Lazy;
        this.compactAuto = mode === CompactionMode.Auto;
        this.deduplicate = opts.deduplicate ?? true;
        this.keyExtractor = (opts.keyExtractor as ((value: T) => K) | undefined) ?? ((value: T) => value as unknown as K);
        this.items = new MultiItemMappedArray<K, T>(this.keyExtractor, () => new SparseArray<T>());

        this.holeThreshold =
            opts.thresholdBytes && opts.thresholdBytes > 0 ?
                Math.ceil(opts.thresholdBytes / BaseOrderedSet.EST_BYTES_PER_HOLE)
            :   Math.max(1, opts.holeThreshold ?? 256);

        if (initial) {
            for (const value of initial) {
                this.addInternal(value);
            }
        }
    }

    protected getIterator(): Iterator<T> {
        return this.iterate();
    }

    /**
     * Returns whether at least one matching value exists.
     * @param value - The value to check for presence.
     * @returns `true` when present, otherwise `false`.
     */
    public has(value: T): boolean {
        return this.items.containsKey(this.keyExtractor(value));
    }

    /**
     * Adds a value according to deduplication mode.
     * O(1) average-time. When deduplication is enabled, existing values are not reinserted.
     */
    protected addInternal(value: T): this {
        const key = this.keyExtractor(value);
        if (!this.deduplicate || !this.items.containsKey(key)) {
            this.items.push(value);
        }
        return this;
    }

    /**
     * Removes matching value(s) from the set.
     * O(1) average-time per removed item. In deduplicated mode, `count` is ignored; in non-deduplicated mode, `count` limits removals.
     */
    protected removeInternal(value: T, count?: number): boolean {
        let removed = false;
        const key = this.keyExtractor(value);

        if (this.deduplicate) {
            removed = this.items.removeByKey(key).length > 0;
        } else if (count === undefined) {
            removed = this.items.removeByKey(key).length > 0;
        } else {
            removed = this.items.removeByKey(key, undefined, count).length > 0;
        }

        if (this.compactOnRemove || (this.compactAuto && this.shouldCompact())) {
            this.compact();
        }

        return removed;
    }

    /**
     * Returns the most recently inserted live value.
     * O(1) average-time excluding compaction. In eager and auto-pre-iter paths, compaction may run before read.
     */
    protected getLastInternal(): T | undefined {
        if (this.compactBeforeIter || (this.compactAuto && this.shouldCompact())) {
            this.compact();
        }
        return this.items.reverseIter().next().value;
    }

    /**
     * Removes and returns the most recently inserted live value.
     * O(1) average-time excluding compaction. Removal-triggered compaction follows configured policy.
     */
    protected removeLastInternal(): T | undefined {
        const removed = this.items.pop();
        if (removed !== undefined && (this.compactOnRemove || (this.compactAuto && this.shouldCompact()))) {
            this.compact();
        }
        return removed;
    }

    private *iterate(): IterableIterator<T> {
        if (this.compactBeforeIter || (this.compactAuto && this.shouldCompact())) {
            this.compact();
        }

        yield* this.items.forwardIter();

        if (this.compactAfterIter || (this.compactAuto && this.shouldCompact())) {
            this.compact();
        }
    }

    /**
     * Returns an immutable snapshot iterator.
     * Snapshot contents are fixed at creation time and are unaffected by later mutations.
     */
    public *snapshotIterator(): IterableIterator<T> {
        const snapshot = Array.from(this.items.forwardIter());
        yield* snapshot;
    }

    /**
     * Rebuilds storage and index mappings without holes.
     * O(n) over live elements and preserves current iteration order.
     */
    public compact(): this {
        this.items.compact();
        return this;
    }

    /**
     * Removes all values and hole bookkeeping.
     * O(1) with fresh backing storage allocation.
     */
    public clear(): this {
        this.items.clear();
        return this;
    }

    /**
     * Returns whether auto compaction threshold has been reached.
     * Uses internal hole-count tracking against the configured threshold.
     */
    protected shouldCompact(): boolean {
        return this.items.holeCount >= this.holeThreshold;
    }
}
