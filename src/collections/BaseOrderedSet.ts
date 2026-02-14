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
     * Compaction strategy to use for managing holes in the set.
     * Defaults to `CompactionMode.Auto`.
     */
    compaction?: CompactionMode;
    /**
     * Maximum number of holes before compaction is triggered.
     * Defaults to 256, or can be set via `thresholdBytes`.
     */
    holeThreshold?: number;
    /**
     * Optional threshold in bytes to trigger compaction.
     * If set, overrides `holeThreshold` based on estimated size of holes.
     * Defaults to no threshold.
     */
    thresholdBytes?: number;
    /**
     * Whether to deduplicate values when adding to the set.
     * Defaults to true, meaning duplicate values are ignored.
     */
    deduplicate?: boolean;
    /**
     * Optional key extractor used to derive keys from values for indexing.
     * Defaults to identity (`(value) => value`).
     */
    keyExtractor?: (value: T) => K;
}

/**
 * An ordered set that maintains insertion order and allows for efficient
 * removal of elements while minimizing memory overhead.
 *
 * This implementation uses a sparse array plus index map:
 * values are removed by marking holes and compaction can run based on policy.
 */
export abstract class BaseOrderedSet<T, K = T> extends LazyIterable<T> {
    private static readonly EST_BYTES_PER_HOLE = 8;

    private readonly items: MultiItemMappedArray<K, T>;
    private readonly deduplicate: boolean;
    private readonly keyExtractor: (value: T) => K;

    private readonly compactBeforeIter: boolean;
    private readonly compactAfterIter: boolean;
    private readonly compactOnRemove: boolean;
    private readonly compactAuto: boolean;
    private readonly holeThreshold: number;

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
     * Checks if the set contains a value.
     * @param value - The value to check for presence.
     * @return true if the value is present, false otherwise.
     */
    public has(value: T): boolean {
        return this.items.containsKey(this.keyExtractor(value));
    }

    protected addInternal(value: T): this {
        const key = this.keyExtractor(value);
        if (!this.deduplicate || !this.items.containsKey(key)) {
            this.items.push(value);
        }
        return this;
    }

    /** Removes any value from the set. Returns true if removal occurred. */
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

    private *iterate(): IterableIterator<T> {
        if (this.compactBeforeIter || (this.compactAuto && this.shouldCompact())) {
            this.compact();
        }

        yield* this.items.forwardIter();

        if (this.compactAfterIter || (this.compactAuto && this.shouldCompact())) {
            this.compact();
        }
    }

    /** Returns an immutable snapshot iterator (unaffected by later mutations). */
    public *snapshotIterator(): IterableIterator<T> {
        const snapshot = Array.from(this.items.forwardIter());
        yield* snapshot;
    }

    /** Rebuilds the underlying array and index map, removing holes. */
    public compact(): this {
        this.items.compact();
        return this;
    }

    public clear(): this {
        this.items.clear();
        return this;
    }

    /** Determines whether compaction should be triggered (auto mode). */
    private shouldCompact(): boolean {
        return this.items.holeCount >= this.holeThreshold;
    }
}
