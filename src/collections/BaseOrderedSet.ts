import { LazyIterable } from '../iterable/LazyIterable';

/**
 * Unique placeholder used to mark logical deletions in the dense backing array.
 * A `Symbol` (rather than `null`) guarantees zero collision with user‑supplied
 * values and offers O(1) identity checks.
 */
const HOLE: unique symbol = Symbol('hole');

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

export interface BaseOrderedSetOptions {
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
}

type TItem<T> = T | typeof HOLE;
type TArray<T> = Array<TItem<T>>;

class ShiftableArray<T> {
    private buf: Array<T> = [];
    private start: number = 0;
    
    public push(value: T): void {
        this.buf.push(value);
    }
    public shift(): T | undefined {
        if (this.start < this.buf.length) {
            return this.buf[this.start++];
        }
        return undefined;
    }
    public *forwardIterable(): IterableIterator<T> {
        for (let i = this.start; i < this.buf.length; i++) {
            yield this.buf[i];
        }
    }
    public clear(): void {
        this.buf = [];
        this.start = 0;
    }
    public get length(): number {
        return this.buf.length - this.start;
    }
    public compact() {
        if (this.start > 0) {
            this.buf = this.buf.slice(this.start);
            this.start = 0;
        }
    }
}


interface IArrayMap<T, TValue> {
    list: (T | typeof HOLE)[];
    indexMap: Map<T, TValue>;
    dirty: number;
    add(value: T): void;
    remove(value: T, count?: number): boolean;
    has(value: T): boolean;
    clear(): void;
    compact(): void;
}
abstract class ArrayMap<T, TValue> implements IArrayMap<T, TValue> {
    public indexMap: Map<T, TValue> = new Map();
    public list: (T | typeof HOLE)[] = [];
    public dirty: number = 0;

    protected abstract addIndex(value: T, index: number): boolean;
    protected abstract removeIndex(value: T, count?: number): Iterable<number>;
    protected abstract hasIndex(value: T): boolean;

    public add(value: T) {
        if (this.addIndex(value, this.list.length)) {
            this.list.push(value);
        }
    }

    public remove(value: T, count?: number): boolean {
        let result = false;
        for (const idx of this.removeIndex(value, count)) {
            this.list[idx] = HOLE;
            this.dirty++;
            result = true;
        }
        return result;
    }

    public has(value: T): boolean {
        return this.hasIndex(value);
    }

    public compact() {
        if (this.dirty) {
            const newList: T[] = [];
            this.indexMap.clear();

            for (const item of this.list) {
                if (item !== HOLE) {
                    this.addIndex(item, newList.length);
                    newList.push(item);
                }
            }

            this.list = newList;
            this.dirty = 0;
        }
    }

    public clear() {
        this.list = [];
        this.indexMap.clear();
        this.dirty = 0;
    }
}

class ArrayMapOfOne<T> extends ArrayMap<T, number> {
    public addIndex(value: T, index: number) {
        if (!this.indexMap.has(value)) {
            this.indexMap.set(value, index);
            return true;
        }
        return false;
    }

    public *removeIndex(value: T, _?: number): Iterable<number> {
        const index = this.indexMap.get(value);
        if (index !== undefined) {
            this.indexMap.delete(value);
            yield index;
        }
    }

    public hasIndex(value: T): boolean {
        return this.indexMap.has(value);
    }
}

class ArrayMapOfMany<T> extends ArrayMap<T, number[]> {
    public addIndex(value: T, index: number) {
        let indices = this.indexMap.get(value);
        if (!indices) {
            this.indexMap.set(value, (indices = []));
        }
        indices.push(index);
        return true;
    }

    public *removeIndex(value: T, count?: number): Iterable<number> {
        let indices = this.indexMap.get(value);
        if (indices) {
            count ??= indices.length;
            for (let i = 0; i < count; i++) {
                const removed = indices.pop();
                if (removed !== undefined) {
                    yield removed;
                } else {
                    this.indexMap.delete(value);
                    break;
                }
            }
        }
    }

    public hasIndex(value: T): boolean {
        return !this.indexMap.get(value)?.length;
    }
}

/**
 * An ordered set that maintains insertion order and allows for efficient
 * removal of elements while minimizing memory overhead.
 *
 * This implementation uses a dense array with a special `HOLE` marker to
 * represent removed elements, allowing for O(1) removal and iteration.
 *
 * Compaction can be configured to occur automatically based on the number of
 * holes, or manually via the `compact()` method.
 */
export abstract class BaseOrderedSet<T> extends LazyIterable<T> {
    private static readonly EST_BYTES_PER_HOLE = 8;

    private readonly arrayMap: IArrayMap<T, number | number[]>;

    private readonly compactBeforeIter: boolean;
    private readonly compactAfterIter: boolean;
    private readonly compactOnRemove: boolean;
    private readonly holeThreshold: number;

    public constructor(initial?: Iterable<T>, opts: BaseOrderedSetOptions = {}) {
        super();

        if (initial) {
            for (const value of initial) {
                this.addInternal(value);
            }
        }

        const mode = opts.compaction ?? CompactionMode.Auto;
        this.compactBeforeIter = mode === CompactionMode.Eager;
        this.compactOnRemove = mode === CompactionMode.Guaranteed;
        this.compactAfterIter = mode === CompactionMode.Lazy;
        this.arrayMap = opts.deduplicate ? new ArrayMapOfOne<T>() : new ArrayMapOfMany<T>();

        this.holeThreshold =
            opts.thresholdBytes && opts.thresholdBytes > 0
                ? Math.ceil(opts.thresholdBytes / BaseOrderedSet.EST_BYTES_PER_HOLE)
                : Math.max(1, opts.holeThreshold ?? 256);
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
        return this.arrayMap.has(value);
    }

    protected addInternal(value: T): this {
        this.arrayMap.add(value);
        return this;
    }

    /** Removes any value from the set. Returns true if removal occurred. */
    protected removeInternal(value: T, count?: number): boolean {
        let result = this.arrayMap.remove(value, count);

        if (this.compactOnRemove || this.shouldCompact()) {
            this.compact();
        }

        return result;
    }

    private *iterate(): IterableIterator<T> {
        if (this.compactBeforeIter || this.shouldCompact()) {
            this.compact();
        }

        for (const value of this.arrayMap.list) {
            if (value !== HOLE) yield value;
        }

        if (this.compactAfterIter || this.shouldCompact()) {
            this.compact();
        }
    }

    /** Returns an immutable snapshot iterator (unaffected by later mutations). */
    public *snapshotIterator(): IterableIterator<T> {
        const snapshot = this.arrayMap.list.slice();
        for (const value of snapshot) {
            if (value !== HOLE) yield value;
        }
    }

    /** Rebuilds the underlying array and index map, removing holes. */
    public compact(): this {
        this.arrayMap.compact();
        return this;
    }

    public clear(): this {
        this.arrayMap.clear();
        return this;
    }

    /** Determines whether compaction should be triggered (auto mode). */
    private shouldCompact(): boolean {
        return this.arrayMap.dirty >= this.holeThreshold;
    }
}
