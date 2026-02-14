import { BaseOrderedSet, BaseOrderedSetOptions } from './BaseOrderedSet';

/**
 * LIFO stack with ordered-set uniqueness semantics.
 * Insertion order is preserved for iteration; `push` ignores duplicates under default deduplication.
 */
export class StackSet<T, K = T> extends BaseOrderedSet<T, K> {
    public constructor(initial?: Iterable<T>, options?: BaseOrderedSetOptions<T, K>) {
        super(initial, options);
    }

    /**
     * Pushes a value onto the top of the stack.
     * O(1) average-time; duplicate handling follows base deduplication mode.
     */
    public push(value: T): this {
        super.addInternal(value);
        return this;
    }

    /**
     * Removes and returns the top value.
     * O(1) average-time excluding compaction work triggered by policy.
     */
    public pop(): T | undefined {
        return super.removeLastInternal();
    }

    /**
     * Returns the top value without removing it.
     * O(1) average-time excluding compaction work triggered by eager/auto read paths.
     */
    public peek(): T | undefined {
        return super.getLastInternal();
    }
}
