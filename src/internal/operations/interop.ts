import type { ILazyIterable, LazyIterable } from '../../iterable/LazyIterable';
import { createLazyIterableFromGenerator } from '../lazyHelpers';

/**
 * Returns a new iterator for this sequence.
 *
 * @returns An iterator that can be used to iterate over the elements.
 */
export function iterator<T>(this: LazyIterable<T>): Iterator<T> {
    const self = this as unknown as { getIterator: () => Iterator<T> };
    return self.getIterator();
}

/**
 * Creates a standard JS iterable which yields each element from this sequence.
 *
 * @returns An iterable that yields each element from this sequence.
 */
export function* asIterable<T>(this: LazyIterable<T>): IterableIterator<T> {
    for (const item of this) {
        yield item;
    }
}

/**
 * Evaluates the iterable immediately and returns a new ILazyIterable containing the materialized elements.
 *
 * @returns A new ILazyIterable containing all elements from this sequence.
 */
export function materialize<T>(this: LazyIterable<T>): ILazyIterable<T> {
    const materialized = this.toArray();
    return createLazyIterableFromGenerator(this.constructor as unknown as typeof LazyIterable, materialized[Symbol.iterator].bind(materialized));
}

export const interopPrototypeMethods = {
    [Symbol.iterator]: iterator,
    asIterable,
    materialize,
} as const;
