import { BaseOrderedSet, BaseOrderedSetOptions } from './BaseOrderedSet';

/**
 * StackSet – A LIFO stack with set semantics.
 * Pushes only unique values and pops the most recent.
 */
export class StackSet<T> extends BaseOrderedSet<T> {
    public constructor(initial?: Iterable<T>, options?: BaseOrderedSetOptions) {
        super(initial, options);
    }

    /** Pushes a value onto the stack if not already present. */
    public push(value: T): this {
        super.addInternal(value);
        return this;
    }

    /** Pops and returns the most recently added value. */
    public pop(): T | undefined {
        let last: T | undefined;
        // todo: do not iterate the whole set
        for (const value of this) last = value;
        if (last !== undefined) super.removeInternal(last);
        return last;
    }

    /** Peeks at the most recently added value without removing it. */
    public peek(): T | undefined {
        let last: T | undefined;
        // todo: do not iterate the whole set
        for (const value of this) {
            last = value;
        }
        return last;
    }
}
