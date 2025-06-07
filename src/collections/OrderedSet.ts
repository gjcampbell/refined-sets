import { BaseOrderedSet, BaseOrderedSetOptions } from './BaseOrderedSet';

/**
 * OrderedSet – A memory-efficient set that preserves insertion order
 * and provides fast lookup, removal, and ordered iteration.
 *
 * Values are unique, added in order, and removed in O(1) time
 * without disrupting iteration order. Compaction is handled
 * automatically or manually based on configuration.
 */
export class OrderedSet<T> extends BaseOrderedSet<T> {
    /**
     * Creates a new OrderedSet.
     * @param options Optional compaction strategy and thresholds.
     */
    public constructor(initial?: Iterable<T>, options?: BaseOrderedSetOptions) {
        super(initial, options);
    }

    /** Adds a value to the set if not already present. */
    public add(value: T): this {
        super.addInternal(value);
        return this;
    }

    /** Removes a value from the set. Returns true if removed. */
    public remove(value: T): boolean {
        return super.removeInternal(value);
    }
}
