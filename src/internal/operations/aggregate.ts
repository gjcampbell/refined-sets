import type { LazyIterable } from '../../iterable/LazyIterable';

/**
 * Invokes a side-effecting callback for each element in the sequence.
 * Enumeration occurs immediately when this method is called.
 *
 * @param callback Function to execute for each element.
 */
export function forEach<T>(this: LazyIterable<T>, callback: (item: T, index: number) => void): void {
    let index = 0;
    for (const x of this) {
        callback(x, index++);
    }
}

/**
 * Calls the specified callback function for all elements in sequence and returns the final accumulated result.
 *
 * @param reducer Reducer function.
 * @param initial Initial accumulator value.
 * @returns The final accumulated value.
 */
export function reduce<T, U>(this: LazyIterable<T>, reducer: (accumulator: U, item: T, index: number) => U, initial: U): U {
    let result = initial;
    let index = 0;
    for (const x of this) {
        result = reducer(result, x, index++);
    }
    return result;
}

/**
 * Returns the number of elements in the sequence.
 *
 * @returns The count of elements in this sequence.
 */
export function count<T>(this: LazyIterable<T>): number {
    let size = 0;
    for (const _ of this) {
        size += 1;
    }
    return size;
}

/**
 * Collects all elements into an array.
 * Enumeration occurs immediately when this method is called.
 *
 * @returns An array containing all elements from this sequence.
 */
export function toArray<T>(this: LazyIterable<T>): T[] {
    return [...this];
}

export const aggregatePrototypeMethods = {
    forEach,
    reduce,
    count,
    toArray,
} as const;
