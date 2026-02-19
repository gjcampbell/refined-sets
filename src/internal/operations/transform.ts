import type { ILazyIterable, LazyIterable, SortDirective } from '../../iterable/LazyIterable';
import { buildComparer, createLazyIterableFromGenerator, extendLazyIterable } from '../lazyHelpers';

/**
 * Projects each element of the sequence into a new form.
 *
 * @template U Type of elements in the result sequence.
 * @param mapper Function to transform each element.
 * @returns A new ILazyIterable of type U.
 */
export function map<T, U>(this: LazyIterable<T>, mapper: (item: T, index: number) => U): ILazyIterable<U> {
    return extendLazyIterable(this, function* genMap(self) {
        let index = 0;
        for (const x of self) {
            yield mapper(x, index++);
        }
    });
}

/**
 * Returns the elements of the sequence that meet the condition specified in a callback function.
 *
 * @param predicate Function invoked for each element.
 * @returns A new ILazyIterable containing only elements that satisfy predicate.
 */
export function filter<T>(this: LazyIterable<T>, predicate: (item: T, index: number) => boolean): ILazyIterable<T> {
    return extendLazyIterable(this, function* genFilter(self) {
        let index = 0;
        for (const x of self) {
            if (predicate(x, index++)) {
                yield x;
            }
        }
    });
}

/**
 * Projects each element into an iterable and flattens the resulting sequences.
 *
 * @template U Type of elements in the flattened sequence.
 * @param mapper Function to transform each element to an iterable.
 * @returns A new ILazyIterable containing all values from the iterables returned by mapper.
 */
export function flatMap<T, U>(this: LazyIterable<T>, mapper: (item: T, index: number) => Iterable<U>): ILazyIterable<U> {
    const source = this;
    return extendLazyIterable(this, function* genFlatMap() {
        let index = 0;
        for (const x of source) {
            for (const y of mapper(x, index++)) {
                yield y;
            }
        }
    });
}

/**
 * Yields every element in the current sequence concatenated with the elements from the provided iterables.
 *
 * @param iterables Additional iterables to append.
 * @returns A new ILazyIterable yielding values from left to right.
 */
export function concat<T, U>(this: LazyIterable<T>, ...iterables: Iterable<U>[]): ILazyIterable<T | U> {
    return extendLazyIterable(this, function* genConcat(self) {
        for (const x of self) {
            yield x;
        }
        for (const iterable of iterables) {
            for (const y of iterable) {
                yield y;
            }
        }
    });
}

/**
 * Yields a tuple of [index, element] for each element in the sequence.
 *
 * @returns A lazy iterable of [index, value] tuples.
 */
export function entries<T>(this: LazyIterable<T>): ILazyIterable<[number, T]> {
    return extendLazyIterable(this, function* genEntries(self): IterableIterator<[number, T]> {
        let index = 0;
        for (const x of self) {
            yield [index++, x];
        }
    });
}

/**
 * Returns a sequence containing only the first `count` elements.
 *
 * @param count Number of elements to take.
 * @returns A new ILazyIterable containing up to `count` elements from the start.
 */
export function take<T>(this: LazyIterable<T>, count: number): ILazyIterable<T> {
    return extendLazyIterable(this, function* genTake(self) {
        let taken = 0;
        if (count <= 0) {
            return;
        }
        for (const x of self) {
            yield x;
            taken += 1;
            if (taken >= count) {
                break;
            }
        }
    });
}

/**
 * Skips the first `count` elements and returns the remainder of the sequence.
 *
 * @param count Number of elements to skip.
 * @returns A new ILazyIterable starting after the first `count` elements.
 */
export function skip<T>(this: LazyIterable<T>, count: number): ILazyIterable<T> {
    return extendLazyIterable(this, function* genSkip(self) {
        let skipped = 0;
        for (const x of self) {
            if (skipped < count) {
                skipped += 1;
                continue;
            }
            yield x;
        }
    });
}

/**
 * Yields deduplicated elements, optionally based on a key.
 *
 * @param distinctBy Optional function to extract a key for deduplication.
 * @returns A new ILazyIterable containing only distinct elements.
 */
export function distinct<T>(this: LazyIterable<T>): ILazyIterable<T>;
export function distinct<T, K>(this: LazyIterable<T>, distinctBy: (item: T) => K): ILazyIterable<T>;
export function distinct<T, K>(this: LazyIterable<T>, distinctBy?: (item: T) => K): ILazyIterable<T> {
    distinctBy ??= (x: T) => x as unknown as K;
    return extendLazyIterable(this, function* genDistinct(self) {
        const seen = new Set<K>();
        for (const x of self) {
            const key = distinctBy!(x);
            if (!seen.has(key)) {
                seen.add(key);
                yield x;
            }
        }
    });
}

/**
 * Returns a new iterable sorted by one or more directives.
 *
 * @param directives Ordered list of sort directives; at least one is required.
 * @returns A lazy iterable that yields the sorted values.
 */
export function sort<T>(this: LazyIterable<T>, ...directives: Array<SortDirective<T, unknown>>): ILazyIterable<T> {
    const comparer = buildComparer(directives);
    return extendLazyIterable(this, function* genSort(self) {
        const decorated: Array<{ item: T; index: number }> = [];
        let index = 0;
        for (const item of self) {
            decorated.push({ item, index });
            index += 1;
        }

        decorated.sort((a, b) => {
            const primary = comparer(a.item, b.item);
            if (primary !== 0) {
                return primary;
            }
            return a.index - b.index;
        });

        for (const entry of decorated) {
            yield entry.item;
        }
    });
}

/**
 * Lazily groups elements by a selected key.
 *
 * @template K Type of the grouping key.
 * @param keySelector Function to derive a key for each element.
 * @returns A lazy sequence of [key, grouped values] pairs.
 */
export function groupBy<T, K>(this: LazyIterable<T>, keySelector: (item: T, index: number) => K): ILazyIterable<[K, ILazyIterable<T>]> {
    const lazyCtor = this.constructor as unknown as typeof LazyIterable;
    return extendLazyIterable(this, function* genGroupBy(self) {
        type GroupState = {
            key: K;
            values: T[];
            iterable: ILazyIterable<T>;
        };

        const source = self[Symbol.iterator]();
        const groupsByKey = new Map<K, GroupState>();
        const groupsInOrder: GroupState[] = [];
        let sourceDone = false;
        let sourceIndex = 0;

        const pullNextSource = (): boolean => {
            if (sourceDone) {
                return false;
            }

            const next = source.next();
            if (next.done) {
                sourceDone = true;
                return false;
            }

            const item = next.value;
            const key = keySelector(item, sourceIndex++);
            let state = groupsByKey.get(key);
            if (!state) {
                const values: T[] = [];
                state = {
                    key,
                    values,
                    iterable: createLazyIterableFromGenerator(lazyCtor, function* genGroupValues() {
                        let valueIndex = 0;

                        while (true) {
                            if (valueIndex < values.length) {
                                yield values[valueIndex++];
                                continue;
                            }

                            while (!sourceDone && valueIndex >= values.length) {
                                pullNextSource();
                            }

                            if (valueIndex >= values.length) {
                                break;
                            }
                        }
                    }),
                };
                groupsByKey.set(key, state);
                groupsInOrder.push(state);
            }

            state.values.push(item);
            return true;
        };

        const ensureGroupAtIndex = (groupIndex: number): boolean => {
            while (groupsInOrder.length <= groupIndex && !sourceDone) {
                pullNextSource();
            }
            return groupsInOrder.length > groupIndex;
        };

        let groupIndex = 0;
        while (ensureGroupAtIndex(groupIndex)) {
            const state = groupsInOrder[groupIndex++];
            yield [state.key, state.iterable];
        }
    });
}

export const transformPrototypeMethods = {
    map,
    filter,
    flatMap,
    concat,
    entries,
    take,
    skip,
    distinct,
    sort,
    groupBy,
} as const;
