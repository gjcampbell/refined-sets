import type { LazyIterable } from '../../iterable/LazyIterable';

/**
 * Determines whether any element satisfies the predicate.
 *
 * @param predicate Predicate to test each element.
 * @returns True if at least one element passes the test; otherwise, false.
 */
export function some<T>(this: LazyIterable<T>, predicate: (item: T, index: number) => boolean): boolean {
    let index = 0;
    for (const x of this) {
        if (predicate(x, index++)) {
            return true;
        }
    }
    return false;
}

/**
 * Determines whether all elements satisfy the predicate.
 *
 * @param predicate Predicate to test each element.
 * @returns True if every element passes the test; otherwise, false.
 */
export function every<T>(this: LazyIterable<T>, predicate: (item: T, index: number) => boolean): boolean {
    let index = 0;
    for (const x of this) {
        if (!predicate(x, index++)) {
            return false;
        }
    }
    return true;
}

/**
 * Returns the first element that satisfies the predicate, if any.
 *
 * @param predicate Predicate to test each element.
 * @returns The first matching element, or `undefined` if none matched.
 */
export function find<T>(this: LazyIterable<T>, predicate: (item: T, index: number) => boolean): T | undefined {
    let index = 0;
    for (const x of this) {
        if (predicate(x, index++)) {
            return x;
        }
    }
    return undefined;
}

/**
 * Returns the first element in the sequence, or undefined if the sequence is empty.
 *
 * @returns The first element, or undefined if the sequence is empty.
 */
export function first<T>(this: LazyIterable<T>): T | undefined {
    for (const x of this) {
        return x;
    }
    return undefined;
}

/**
 * Returns the last element in the sequence, or undefined if the sequence is empty.
 *
 * @returns The last element, or undefined if the sequence is empty.
 */
export function last<T>(this: LazyIterable<T>): T | undefined {
    let tail: T | undefined;
    for (const x of this) {
        tail = x;
    }
    return tail;
}

export const queryPrototypeMethods = {
    some,
    every,
    find,
    first,
    last,
} as const;
