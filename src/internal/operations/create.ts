import { RefinedSetsError } from '../../errors/RefinedSetsError';
import type { ILazyIterable, LazyIterable } from '../../iterable/LazyIterable';
import { createLazyIterableFromGenerator } from '../lazyHelpers';

/**
 * Creates a new ILazyIterable from an iterable.
 *
 * @template U Type of elements in the iterable.
 * @param iterable An iterable to convert into an ILazyIterable.
 * @returns A new ILazyIterable containing the elements from the iterable.
 */
export function from<U>(this: typeof LazyIterable, iterable: Iterable<U>): ILazyIterable<U> {
    return createLazyIterableFromGenerator(this, function* genFrom() {
        for (const item of iterable) {
            yield item;
        }
    });
}

/**
 * Creates a new ILazyIterable which yields the numbers from zero to `length` (exclusive).
 *
 * @param length A positive integer, the number of numbers to yield.
 * @returns A new ILazyIterable containing the generated numbers.
 */
export function fromLength(this: typeof LazyIterable, length: number): ILazyIterable<number> {
    return createLazyIterableFromGenerator(this, function* genFromLength() {
        for (let i = 0; i < length; i++) {
            yield i;
        }
    });
}

/**
 * Creates a new ILazyIterable which yields the numbers in the range from `start`(inclusive) to `end`(inclusive).
 *
 * @param start The first number to yield.
 * @param end The largest number to yield.
 * @param incrementBy (optional) The value to increment by when stepping from `start` toward `end`, defaults to 1 or -1 depending on start and end.
 * @returns A new ILazyIterable which will yield the numbers in the range.
 */
export function fromRange(this: typeof LazyIterable, start: number, end: number, incrementBy?: number): ILazyIterable<number> {
    if (incrementBy === 0) {
        throw RefinedSetsError.invalidArgument('Expected a non-zero value for incrementBy.');
    }

    const difference = end - start;
    const direction = Math.sign(difference);

    if (incrementBy !== undefined && direction !== Math.sign(incrementBy)) {
        throw RefinedSetsError.invalidArgument(
            `Expected 'incrementBy' to match the sign of (end - start). Received: (end - start) = ${difference}, incrementBy = ${incrementBy}.`,
        );
    }

    incrementBy ??= direction;
    const count = Math.floor(Math.abs(difference) / Math.abs(incrementBy));

    return createLazyIterableFromGenerator(this, function* genFromRange() {
        let value = start;
        let remaining = count;
        do {
            yield value;
            value += incrementBy;
            remaining--;
        } while (remaining >= 0);
    });
}

/**
 * Creates an empty ILazyIterable.
 *
 * @template T Type of elements in the sequence.
 * @returns An empty ILazyIterable of type T.
 */
export function empty<T>(this: typeof LazyIterable): ILazyIterable<T> {
    return createLazyIterableFromGenerator(this, function* genEmpty() {});
}

/**
 * Creates a new ILazyIterable which yields an infinite sequence of `undefined` values.
 *
 * @returns A new ILazyIterable that yields indefinitely.
 */
export function infinite(this: typeof LazyIterable): ILazyIterable<void> {
    return createLazyIterableFromGenerator(this, function* genInfinite() {
        while (true) {
            yield;
        }
    });
}

export const createStaticMethods = {
    from,
    fromLength,
    fromRange,
    empty,
    infinite,
} as const;
