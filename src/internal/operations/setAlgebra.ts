import type { ILazyIterable, LazyIterable, SetOpOptions } from '../../iterable/LazyIterable';
import { containsByComparer, createEqualityStrategy, extendLazyIterable } from '../lazyHelpers';

/**
 * Yields unique values from this iterable followed by unique values from `other`, preserving first-seen order.
 *
 * @param other Iterable of additional values.
 * @param opts Optional equality strategy.
 * @returns A lazy iterable of unioned values.
 */
export function union<T>(this: LazyIterable<T>, other: Iterable<T>): ILazyIterable<T>;
export function union<T, K>(this: LazyIterable<T>, other: Iterable<T>, opts: { keyExtractor: (item: T) => K }): ILazyIterable<T>;
export function union<T>(this: LazyIterable<T>, other: Iterable<T>, opts: { equalityComparer: (a: T, b: T) => boolean }): ILazyIterable<T>;
export function union<T, K>(this: LazyIterable<T>, other: Iterable<T>, opts?: SetOpOptions<T, K>): ILazyIterable<T> {
    const strategy = createEqualityStrategy(opts);
    return extendLazyIterable(this, function* genUnion(self) {
        if (strategy.mode === 'key') {
            const seenKeys = new Set<K>();
            for (const item of self) {
                const key = strategy.getKey(item);
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    yield item;
                }
            }
            for (const item of other) {
                const key = strategy.getKey(item);
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    yield item;
                }
            }
            return;
        }

        if (strategy.mode === 'comparer') {
            const seenItems: T[] = [];
            for (const item of self) {
                if (!containsByComparer(seenItems, item, strategy.equals)) {
                    seenItems.push(item);
                    yield item;
                }
            }
            for (const item of other) {
                if (!containsByComparer(seenItems, item, strategy.equals)) {
                    seenItems.push(item);
                    yield item;
                }
            }
            return;
        }

        const seen = new Set<T>();
        for (const item of self) {
            if (!seen.has(item)) {
                seen.add(item);
                yield item;
            }
        }
        for (const item of other) {
            if (!seen.has(item)) {
                seen.add(item);
                yield item;
            }
        }
    });
}

/**
 * Yields unique values from this iterable that also exist in `other`, preserving this iterable's order.
 *
 * @param other Iterable used as membership source.
 * @param opts Optional equality strategy.
 * @returns A lazy iterable of intersection values.
 */
export function intersection<T>(this: LazyIterable<T>, other: Iterable<T>): ILazyIterable<T>;
export function intersection<T, K>(this: LazyIterable<T>, other: Iterable<T>, opts: { keyExtractor: (item: T) => K }): ILazyIterable<T>;
export function intersection<T>(this: LazyIterable<T>, other: Iterable<T>, opts: { equalityComparer: (a: T, b: T) => boolean }): ILazyIterable<T>;
export function intersection<T, K>(this: LazyIterable<T>, other: Iterable<T>, opts?: SetOpOptions<T, K>): ILazyIterable<T> {
    const strategy = createEqualityStrategy(opts);
    return extendLazyIterable(this, function* genIntersection(self) {
        if (strategy.mode === 'key') {
            const otherKeys = new Set<K>();
            for (const item of other) {
                otherKeys.add(strategy.getKey(item));
            }

            const yieldedKeys = new Set<K>();
            for (const item of self) {
                const key = strategy.getKey(item);
                if (otherKeys.has(key) && !yieldedKeys.has(key)) {
                    yieldedKeys.add(key);
                    yield item;
                }
            }
            return;
        }

        if (strategy.mode === 'comparer') {
            const otherItems = [...other];
            const yieldedItems: T[] = [];
            for (const item of self) {
                const isInOther = containsByComparer(otherItems, item, strategy.equals);
                if (isInOther && !containsByComparer(yieldedItems, item, strategy.equals)) {
                    yieldedItems.push(item);
                    yield item;
                }
            }
            return;
        }

        const otherSet = new Set<T>(other);
        const yielded = new Set<T>();
        for (const item of self) {
            if (otherSet.has(item) && !yielded.has(item)) {
                yielded.add(item);
                yield item;
            }
        }
    });
}

/**
 * Yields unique values from this iterable that do not exist in `other`, preserving this iterable's order.
 *
 * @param other Iterable used as exclusion source.
 * @param opts Optional equality strategy.
 * @returns A lazy iterable of left-only values.
 */
export function difference<T>(this: LazyIterable<T>, other: Iterable<T>): ILazyIterable<T>;
export function difference<T, K>(this: LazyIterable<T>, other: Iterable<T>, opts: { keyExtractor: (item: T) => K }): ILazyIterable<T>;
export function difference<T>(this: LazyIterable<T>, other: Iterable<T>, opts: { equalityComparer: (a: T, b: T) => boolean }): ILazyIterable<T>;
export function difference<T, K>(this: LazyIterable<T>, other: Iterable<T>, opts?: SetOpOptions<T, K>): ILazyIterable<T> {
    const strategy = createEqualityStrategy(opts);
    return extendLazyIterable(this, function* genDifference(self) {
        if (strategy.mode === 'key') {
            const otherKeys = new Set<K>();
            for (const item of other) {
                otherKeys.add(strategy.getKey(item));
            }

            const yieldedKeys = new Set<K>();
            for (const item of self) {
                const key = strategy.getKey(item);
                if (!otherKeys.has(key) && !yieldedKeys.has(key)) {
                    yieldedKeys.add(key);
                    yield item;
                }
            }
            return;
        }

        if (strategy.mode === 'comparer') {
            const otherItems = [...other];
            const yieldedItems: T[] = [];
            for (const item of self) {
                const isInOther = containsByComparer(otherItems, item, strategy.equals);
                if (!isInOther && !containsByComparer(yieldedItems, item, strategy.equals)) {
                    yieldedItems.push(item);
                    yield item;
                }
            }
            return;
        }

        const otherSet = new Set<T>(other);
        const yielded = new Set<T>();
        for (const item of self) {
            if (!otherSet.has(item) && !yielded.has(item)) {
                yielded.add(item);
                yield item;
            }
        }
    });
}

/**
 * Yields values that exist in exactly one input, preserving source-local order.
 *
 * @param other Iterable to compare against.
 * @param opts Optional equality strategy.
 * @returns A lazy iterable of symmetric difference values.
 */
export function symmetricDifference<T>(this: LazyIterable<T>, other: Iterable<T>): ILazyIterable<T>;
export function symmetricDifference<T, K>(this: LazyIterable<T>, other: Iterable<T>, opts: { keyExtractor: (item: T) => K }): ILazyIterable<T>;
export function symmetricDifference<T>(this: LazyIterable<T>, other: Iterable<T>, opts: { equalityComparer: (a: T, b: T) => boolean }): ILazyIterable<T>;
export function symmetricDifference<T, K>(this: LazyIterable<T>, other: Iterable<T>, opts?: SetOpOptions<T, K>): ILazyIterable<T> {
    const strategy = createEqualityStrategy(opts);
    return extendLazyIterable(this, function* genSymmetricDifference(self) {
        if (strategy.mode === 'key') {
            const otherKeys = new Set<K>();
            for (const item of other) {
                otherKeys.add(strategy.getKey(item));
            }

            const thisKeys = new Set<K>();
            const yieldedKeys = new Set<K>();
            for (const item of self) {
                const key = strategy.getKey(item);
                thisKeys.add(key);
                if (!otherKeys.has(key) && !yieldedKeys.has(key)) {
                    yieldedKeys.add(key);
                    yield item;
                }
            }

            for (const item of other) {
                const key = strategy.getKey(item);
                if (!thisKeys.has(key) && !yieldedKeys.has(key)) {
                    yieldedKeys.add(key);
                    yield item;
                }
            }
            return;
        }

        if (strategy.mode === 'comparer') {
            const otherItems = [...other];
            const thisUniqueItems: T[] = [];
            const yieldedItems: T[] = [];

            for (const item of self) {
                if (!containsByComparer(thisUniqueItems, item, strategy.equals)) {
                    thisUniqueItems.push(item);
                }

                const isInOther = containsByComparer(otherItems, item, strategy.equals);
                if (!isInOther && !containsByComparer(yieldedItems, item, strategy.equals)) {
                    yieldedItems.push(item);
                    yield item;
                }
            }

            for (const item of other) {
                const isInLeft = containsByComparer(thisUniqueItems, item, strategy.equals);
                if (!isInLeft && !containsByComparer(yieldedItems, item, strategy.equals)) {
                    yieldedItems.push(item);
                    yield item;
                }
            }
            return;
        }

        const otherSet = new Set<T>(other);
        const thisSet = new Set<T>();
        const yielded = new Set<T>();

        for (const item of self) {
            thisSet.add(item);
            if (!otherSet.has(item) && !yielded.has(item)) {
                yielded.add(item);
                yield item;
            }
        }

        for (const item of other) {
            if (!thisSet.has(item) && !yielded.has(item)) {
                yielded.add(item);
                yield item;
            }
        }
    });
}

export const setAlgebraPrototypeMethods = {
    union,
    intersection,
    difference,
    symmetricDifference,
} as const;
