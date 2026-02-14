import { BaseOrderedSet, BaseOrderedSetOptions } from './BaseOrderedSet';

/**
 * QueueSet – A FIFO queue with
 * Enqueues only unique values and dequeues in insertion order.
 */
export class QueueSet<T, K = T> extends BaseOrderedSet<T, K> {
    public constructor(initial?: Iterable<T>, options?: BaseOrderedSetOptions<T, K>) {
        super(initial, options);
    }

    /** Enqueues a value if not already present. */
    public enqueue(value: T): this {
        super.addInternal(value);
        return this;
    }

    /** Dequeues and returns the earliest inserted value. */
    public dequeue(): T | undefined {
        for (const value of this) {
            super.removeInternal(value);
            return value;
        }
        return undefined;
    }

    /** Peeks at the earliest inserted, still queued value without removing it. */
    public peek(): T | undefined {
        for (const value of this) {
            return value;
        }
        return undefined;
    }
}
