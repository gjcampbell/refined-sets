import { RefinedSetsError } from '../errors/RefinedSetsError';

export type SetOpOptions<T, K = unknown> = {
    keyExtractor?: (item: T) => K;
    equalityComparer?: (a: T, b: T) => boolean;
};

export type SortDirective<T, S = unknown> =
    | {
          sortKeyAccessor: (item: T) => S;
          comparer?: (a: S, b: S) => number;
          descending?: boolean;
      }
    | {
          comparer: (a: T, b: T) => number;
          descending?: boolean;
      };

export interface ILazyIterable<T> extends LazyIterable<T> {
    union(other: Iterable<T>): ILazyIterable<T>;
    union<K>(other: Iterable<T>, opts: { keyExtractor: (item: T) => K }): ILazyIterable<T>;
    union(other: Iterable<T>, opts: { equalityComparer: (a: T, b: T) => boolean }): ILazyIterable<T>;

    intersection(other: Iterable<T>): ILazyIterable<T>;
    intersection<K>(other: Iterable<T>, opts: { keyExtractor: (item: T) => K }): ILazyIterable<T>;
    intersection(other: Iterable<T>, opts: { equalityComparer: (a: T, b: T) => boolean }): ILazyIterable<T>;

    difference(other: Iterable<T>): ILazyIterable<T>;
    difference<K>(other: Iterable<T>, opts: { keyExtractor: (item: T) => K }): ILazyIterable<T>;
    difference(other: Iterable<T>, opts: { equalityComparer: (a: T, b: T) => boolean }): ILazyIterable<T>;

    symmetricDifference(other: Iterable<T>): ILazyIterable<T>;
    symmetricDifference<K>(other: Iterable<T>, opts: { keyExtractor: (item: T) => K }): ILazyIterable<T>;
    symmetricDifference(other: Iterable<T>, opts: { equalityComparer: (a: T, b: T) => boolean }): ILazyIterable<T>;

    sort(...directives: Array<SortDirective<T, unknown>>): ILazyIterable<T>;
}

type EqualityStrategy<T, K> =
    | { mode: 'default' }
    | {
          mode: 'key';
          getKey: (item: T) => K;
      }
    | {
          mode: 'comparer';
          equals: (a: T, b: T) => boolean;
      };

/**
 * Represents a lazy-evaluated sequence.
 * Provides lazy evaluated implementations of standard Array methods (map, filter, flatMap, etc.).
 *
 * @template T Type of elements in the sequence.
 */
export abstract class LazyIterable<T> implements Iterable<T> {
    //#region Inner Classes

    /**
     * Concrete implementation backing class for LazyIterable.
     * This constructor is protected to ensure that only this class can instantiate it.
     */
    private static LazyIterableImpl = class LazyIterableImpl<T> extends LazyIterable<T> {
        public constructor(private readonly generator: () => IterableIterator<T>) {
            super();
        }
        protected getIterator(): Iterator<T> {
            return this.generator();
        }
    };

    //#endregion

    private static createEqualityStrategy<T, K>(opts?: SetOpOptions<T, K>): EqualityStrategy<T, K> {
        if (!opts) {
            return { mode: 'default' };
        }

        if (opts.keyExtractor && opts.equalityComparer) {
            throw RefinedSetsError.invalidArgument('Set operation options cannot include both keyExtractor and equalityComparer.');
        }

        if (opts.keyExtractor) {
            return {
                mode: 'key',
                getKey: opts.keyExtractor,
            };
        }

        if (opts.equalityComparer) {
            return {
                mode: 'comparer',
                equals: opts.equalityComparer,
            };
        }

        return { mode: 'default' };
    }

    private static containsByComparer<T>(items: T[], target: T, equals: (a: T, b: T) => boolean): boolean {
        for (let i = 0; i < items.length; i++) {
            if (equals(items[i], target)) {
                return true;
            }
        }
        return false;
    }

    private static normalizeComparerResult(value: number): number {
        if (Number.isNaN(value) || value === 0) {
            return 0;
        }
        return value < 0 ? -1 : 1;
    }

    private static compareSortKeys(a: unknown, b: unknown): number {
        if (Object.is(a, b)) {
            return 0;
        }

        if (a === null || a === undefined) {
            return 1;
        }
        if (b === null || b === undefined) {
            return -1;
        }

        if (typeof a === 'number' && typeof b === 'number') {
            if (Number.isNaN(a) && Number.isNaN(b)) {
                return 0;
            }
            if (Number.isNaN(a)) {
                return 1;
            }
            if (Number.isNaN(b)) {
                return -1;
            }
            return a < b ? -1 : 1;
        }

        if (typeof a === 'string' && typeof b === 'string') {
            return a < b ? -1 : 1;
        }

        if (typeof a === 'bigint' && typeof b === 'bigint') {
            return a < b ? -1 : 1;
        }

        if (a instanceof Date && b instanceof Date) {
            const timeA = a.getTime();
            const timeB = b.getTime();
            return LazyIterable.normalizeComparerResult(timeA - timeB);
        }

        try {
            if (a < b) {
                return -1;
            }
            if (a > b) {
                return 1;
            }
            return 0;
        } catch {
            return 0;
        }
    }

    private static buildComparer<T>(directives: Array<SortDirective<T, unknown>>): (a: T, b: T) => number {
        if (directives.length === 0) {
            throw RefinedSetsError.invalidArgument('sort requires at least one sort directive.');
        }

        const comparers = directives.map((directive) => {
            if ('sortKeyAccessor' in directive) {
                const keyAccessor = directive.sortKeyAccessor;
                const keyComparer = directive.comparer ?? ((a: unknown, b: unknown) => LazyIterable.compareSortKeys(a, b));
                return (a: T, b: T): number => {
                    const result = LazyIterable.normalizeComparerResult(keyComparer(keyAccessor(a), keyAccessor(b)));
                    return directive.descending ? -result : result;
                };
            }

            return (a: T, b: T): number => {
                const result = LazyIterable.normalizeComparerResult(directive.comparer(a, b));
                return directive.descending ? -result : result;
            };
        });

        return (a: T, b: T): number => {
            for (let i = 0; i < comparers.length; i++) {
                const result = comparers[i](a, b);
                if (result !== 0) {
                    return result;
                }
            }
            return 0;
        };
    }

    /**
     * Returns a fresh iterator over the sequence.
     *
     * @returns Iterator of elements in this sequence.
     */
    protected abstract getIterator(): Iterator<T>;

    /**
     * Convenience method to extend the current sequence with a new generator.
     *
     * @param generator A generator function that yields elements of type U.
     * @returns A new ILazyIterable of type U.
     */
    protected extend<U>(generator: (self: ILazyIterable<T>) => IterableIterator<U>): ILazyIterable<U> {
        const self = this;
        return new LazyIterable.LazyIterableImpl<U>(() => generator(self));
    }

    /**
     * Returns a new iterator for this sequence.
     * This method is used to implement the iterable protocol.
     *
     * @returns An iterator that can be used to iterate over the elements.
     *
     */
    public [Symbol.iterator](): Iterator<T> {
        return this.getIterator();
    }

    //#region Array-like Methods

    /**
     * Projects each element of the sequence into a new form.
     *
     * @template U Type of elements in the result sequence.
     * @param mapper Function to transform each element.
     * @returns A new ILazyIterable of type U.
     */
    public map<U>(mapper: (item: T, index: number) => U): ILazyIterable<U> {
        return this.extend(function* genMap(self) {
            let index = 0;
            for (const x of self) {
                yield mapper(x, index++);
            }
        });
    }

    /**
     * Returns the elements of an array that meet the condition specified in a callback function.
     *
     * @param predicate A function that accepts up to two arguments. The filter method calls the predicate function one time for each element in the array.
     * @returns A new ILazyIterable containing only elements that satisfy predicate.
     */
    public filter(predicate: (item: T, index: number) => boolean): ILazyIterable<T> {
        return this.extend(function* genFilter(self) {
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
     * @param mapper A function that accepts up to two arguments. The flatMap method calls the callback function one time for each element in the array.
     * @returns A new ILazyIterable containing all values from the iterables returned by mapper.
     */
    public flatMap<U>(mapper: (item: T, index: number) => Iterable<U>): ILazyIterable<U> {
        const self = this;
        return this.extend(function* genFlatMap() {
            let index = 0;
            for (const x of self) {
                for (const y of mapper(x, index++)) {
                    yield y;
                }
            }
        });
    }

    /**
     * Invokes a side-effecting callback for each element in the sequence.
     * Enumeration occurs immediately when this method is called.
     *
     * @param callback Function to execute for each element.
     */
    public forEach(callback: (item: T, index: number) => void): void {
        let index = 0;
        for (const x of this) {
            callback(x, index++);
        }
    }

    /**
     * Determines whether any element satisfies the predicate.
     *
     * @param predicate A function that accepts up to twoarguments. The some method calls the predicate function for each element in the array until the
     * predicate returns a value which is coercible to the Boolean value true, or until the end of the array.
     * @returns True if at least one element passes the test; otherwise, false.
     */
    public some(predicate: (item: T, index: number) => boolean): boolean {
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
     * @param predicate A function that accepts up to two arguments. The every method calls the predicate function for each element in the array until the
     * predicate returns a value which is coercible to the Boolean value false, or until the end of the array.
     * @returns True if every element passes the test; otherwise, false.
     */
    public every(predicate: (item: T, index: number) => boolean): boolean {
        let index = 0;
        for (const x of this) {
            if (!predicate(x, index++)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Returns the value of the first element in the array where predicate is true, and undefined otherwise.
     *
     * @param predicate find calls predicate once for each element of the array, in ascending order, until it finds one where predicate returns true. If such
     * an element is found, find immediately returns that element value. Otherwise, find returns undefined.
     * @returns The first matching element, or `undefined` if none matched.
     */
    public find(predicate: (item: T, index: number) => boolean): T | undefined {
        let index = 0;
        for (const x of this) {
            if (predicate(x, index++)) {
                return x;
            }
        }
        return undefined;
    }

    /**
     * Calls the specified callback function for all the elements in an array. The return value of the callback function is the accumulated result, and is
     * provided as an argument in the next call to the callback function.
     *
     * @param reducer - A function that accepts up to four arguments. The reduce method calls the callbackfn function one time for each element in the
     * array.
     * @param initialValue - If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn
     * function provides this value as an argument instead of an array value.
     * @returns The final accumulated value.
     */
    public reduce<U>(reducer: (accumulator: U, item: T, index: number) => U, initial: U): U {
        let result = initial;
        let index = 0;
        for (const x of this) {
            result = reducer(result, x, index++);
        }
        return result;
    }

    /**
     * Yields the every element in the current sequence concatenated with the elements from the provided iterables.
     *
     * @returns The first element, or undefined if the sequence is empty.
     */
    public concat<U>(...iterables: Iterable<U>[]): ILazyIterable<T | U> {
        return this.extend(function* genConcat(self) {
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
     * Yields a tuple of [index, element] for each element in the sequence
     *
     * @returns The first element, or undefined if the sequence is empty.
     */
    public entries(): ILazyIterable<[number, T]> {
        return this.extend(function* genEntries(self): IterableIterator<[number, T]> {
            let index = 0;
            for (const x of self) {
                yield [index++, x];
            }
        });
    }

    //#endregion

    //#region Extended Iterable Methods

    /**
     * Returns a sequence containing only the first `count` elements.
     *
     * @param count Number of elements to take.
     * @returns A new ILazyIterable containing up to `count` elements from the start.
     */
    public take(count: number): ILazyIterable<T> {
        return this.extend(function* genTake(self) {
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
    public skip(count: number): ILazyIterable<T> {
        return this.extend(function* gen(self) {
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
     * Yield deduplicated elements, optionally based on a key.
     *
     * If `distinctBy` is not provided, elements themselves are used for deduplication. Otherwise, the provided function is used to extract a key for each element, and keys are used for deduplication.
     * @param distinctBy Optional function to extract a key for deduplication. If not provided, elements themselves are used as keys.
     * @returns A new ILazyIterable containing only distinct elements.
     */
    public distinct(): ILazyIterable<T>;
    public distinct<K>(distinctBy: (item: T) => K): ILazyIterable<T>;
    public distinct<K>(distinctBy?: (item: T) => K): ILazyIterable<T> {
        distinctBy ??= (x: T) => x as unknown as K;
        return this.extend(function* genDistinct(self) {
            const seen = new Set();
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
     * Yields unique values from this iterable followed by unique values from `other`, preserving first-seen order.
     *
     * Ordering is stable: values are emitted in the order they are first observed when scanning `this` and then `other`.
     *
     * Complexity:
     * - default mode: O(n + m) expected using Set membership.
     * - keyExtractor mode: O(n + m) expected using Set membership on extracted keys.
     * - equalityComparer mode: O((n + m)^2) worst case due to linear membership scans.
     *
     * @param other Iterable of additional values.
     * @param opts Optional equality strategy; `keyExtractor` and `equalityComparer` are mutually exclusive.
     * @returns A lazy iterable of unioned values.
     */
    public union(other: Iterable<T>): ILazyIterable<T>;
    public union<K>(other: Iterable<T>, opts: { keyExtractor: (item: T) => K }): ILazyIterable<T>;
    public union(other: Iterable<T>, opts: { equalityComparer: (a: T, b: T) => boolean }): ILazyIterable<T>;
    public union<K>(other: Iterable<T>, opts?: SetOpOptions<T, K>): ILazyIterable<T> {
        const strategy = LazyIterable.createEqualityStrategy(opts);
        return this.extend(function* genUnion(self) {
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
                    if (!LazyIterable.containsByComparer(seenItems, item, strategy.equals)) {
                        seenItems.push(item);
                        yield item;
                    }
                }
                for (const item of other) {
                    if (!LazyIterable.containsByComparer(seenItems, item, strategy.equals)) {
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
     * Output deduplication is always applied, so repeated matching values are emitted once.
     *
     * Complexity:
     * - default mode: O(n + m) expected.
     * - keyExtractor mode: O(n + m) expected.
     * - equalityComparer mode: O((n + m)^2) worst case due to linear scans.
     *
     * @param other Iterable used as membership source.
     * @param opts Optional equality strategy; `keyExtractor` and `equalityComparer` are mutually exclusive.
     * @returns A lazy iterable of intersection values.
     */
    public intersection(other: Iterable<T>): ILazyIterable<T>;
    public intersection<K>(other: Iterable<T>, opts: { keyExtractor: (item: T) => K }): ILazyIterable<T>;
    public intersection(other: Iterable<T>, opts: { equalityComparer: (a: T, b: T) => boolean }): ILazyIterable<T>;
    public intersection<K>(other: Iterable<T>, opts?: SetOpOptions<T, K>): ILazyIterable<T> {
        const strategy = LazyIterable.createEqualityStrategy(opts);
        return this.extend(function* genIntersection(self) {
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
                    const isInOther = LazyIterable.containsByComparer(otherItems, item, strategy.equals);
                    if (isInOther && !LazyIterable.containsByComparer(yieldedItems, item, strategy.equals)) {
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
     * Complexity:
     * - default mode: O(n + m) expected.
     * - keyExtractor mode: O(n + m) expected.
     * - equalityComparer mode: O((n + m)^2) worst case due to linear scans.
     *
     * @param other Iterable used as exclusion source.
     * @param opts Optional equality strategy; `keyExtractor` and `equalityComparer` are mutually exclusive.
     * @returns A lazy iterable of left-only values.
     */
    public difference(other: Iterable<T>): ILazyIterable<T>;
    public difference<K>(other: Iterable<T>, opts: { keyExtractor: (item: T) => K }): ILazyIterable<T>;
    public difference(other: Iterable<T>, opts: { equalityComparer: (a: T, b: T) => boolean }): ILazyIterable<T>;
    public difference<K>(other: Iterable<T>, opts?: SetOpOptions<T, K>): ILazyIterable<T> {
        const strategy = LazyIterable.createEqualityStrategy(opts);
        return this.extend(function* genDifference(self) {
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
                    const isInOther = LazyIterable.containsByComparer(otherItems, item, strategy.equals);
                    if (!isInOther && !LazyIterable.containsByComparer(yieldedItems, item, strategy.equals)) {
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
     * Ordering is deterministic:
     * - first, left-only values from `this` in encounter order
     * - second, right-only values from `other` in encounter order
     *
     * Complexity:
     * - default mode: O(n + m) expected.
     * - keyExtractor mode: O(n + m) expected.
     * - equalityComparer mode: O((n + m)^2) worst case due to linear scans and materialized lookups.
     *
     * @param other Iterable to compare against.
     * @param opts Optional equality strategy; `keyExtractor` and `equalityComparer` are mutually exclusive.
     * @returns A lazy iterable of symmetric difference values.
     */
    public symmetricDifference(other: Iterable<T>): ILazyIterable<T>;
    public symmetricDifference<K>(other: Iterable<T>, opts: { keyExtractor: (item: T) => K }): ILazyIterable<T>;
    public symmetricDifference(other: Iterable<T>, opts: { equalityComparer: (a: T, b: T) => boolean }): ILazyIterable<T>;
    public symmetricDifference<K>(other: Iterable<T>, opts?: SetOpOptions<T, K>): ILazyIterable<T> {
        const strategy = LazyIterable.createEqualityStrategy(opts);
        return this.extend(function* genSymmetricDifference(self) {
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
                    if (!LazyIterable.containsByComparer(thisUniqueItems, item, strategy.equals)) {
                        thisUniqueItems.push(item);
                    }

                    const isInOther = LazyIterable.containsByComparer(otherItems, item, strategy.equals);
                    if (!isInOther && !LazyIterable.containsByComparer(yieldedItems, item, strategy.equals)) {
                        yieldedItems.push(item);
                        yield item;
                    }
                }

                for (const item of other) {
                    const isInLeft = LazyIterable.containsByComparer(thisUniqueItems, item, strategy.equals);
                    if (!isInLeft && !LazyIterable.containsByComparer(yieldedItems, item, strategy.equals)) {
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

    /**
     * Returns a new iterable sorted by one or more directives.
     *
     * Sorting materializes the entire sequence by design, then performs a stable sort:
     * when all directives compare equal, original input order is preserved.
     *
     * Default key comparison uses:
     * - null/undefined last
     * - number, string, bigint, and Date comparisons when applicable
     * - relational fallback (`<`/`>`) for other comparable key types, otherwise equality
     *
     * @param directives Ordered list of sort directives; at least one is required.
     * @returns A lazy iterable that yields the sorted values.
     */
    public sort(...directives: Array<SortDirective<T, unknown>>): ILazyIterable<T> {
        const comparer = LazyIterable.buildComparer(directives);
        return this.extend(function* genSort(self) {
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
     * Outer iteration yields groups in first-key-seen order. Inner iteration yields each group's values in source order.
     * Source values are only pulled as needed while consuming group keys or group values.
     * Any incidentally scanned values/groups are buffered and reused across subsequent iterations.
     *
     * @template K Type of the grouping key.
     * @param keySelector Function to derive a key for each element.
     * @returns A lazy sequence of [key, grouped values] pairs.
     */
    public groupBy<K>(keySelector: (item: T, index: number) => K): ILazyIterable<[K, ILazyIterable<T>]> {
        return this.extend(function* genGroupBy(self) {
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
                        iterable: new LazyIterable.LazyIterableImpl<T>(function* genGroupValues() {
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

    /**
     * Returns the number of elements in the sequence.
     *
     * @returns The count of elements in this sequence.
     */
    public count(): number {
        let count = 0;
        for (const _ of this) {
            count += 1;
        }
        return count;
    }

    /**
     * Returns the first element in the sequence, or undefined if the sequence is empty.
     *
     * @returns The first element, or undefined if the sequence is empty.
     */
    public first(): T | undefined {
        for (const x of this) {
            return x;
        }
    }

    /**
     * Returns the last element in the sequence, or undefined if the sequence is empty.
     *
     * @returns The last element, or undefined if the sequence is empty.
     */
    public last(): T | undefined {
        let last: T | undefined;
        for (const x of this) {
            last = x;
        }
        return last;
    }

    /**
     * Evaluates the iterable immediately and returns a new ILazyIterable containing the materialized elements.
     * This method is useful when you want to ensure that the sequence is fully evaluated and stored in memory.
     * It can be used to avoid re-evaluating the sequence multiple times.
     *
     * @returns A new ILazyIterable containing all elements from this sequence.
     */
    public materialize(): ILazyIterable<T> {
        const materialized = this.toArray();
        return new LazyIterable.LazyIterableImpl<T>(materialized[Symbol.iterator].bind(materialized));
    }

    //#endregion

    //#region Construct and Convert

    /**
     * Collects all elements into an array.
     * Enumeration occurs immediately when this method is called.
     *
     * @returns An array containing all elements from this sequence.
     */
    public toArray(): T[] {
        return [...this];
    }

    /**
     * Creates an standard JS iterable which yields each element from this sequence
     *
     * @returns An iterable that yields each element from this sequence.
     */
    public *asIterable(): Iterable<T> {
        for (const item of this) {
            yield item;
        }
    }

    /**
     * Creates a new ILazyIterable from an iterable.
     *
     * @template U Type of elements in the iterable.
     * @param iterable An iterable to convert into an ILazyIterable.
     * @returns A new ILazyIterable containing the elements from the iterable.
     */
    public static from<U>(iterable: Iterable<U>): ILazyIterable<U> {
        return new LazyIterable.LazyIterableImpl<U>(function* genFrom() {
            for (const item of iterable) {
                yield item;
            }
        });
    }

    /**
     * Creates a new ILazyIterable which yields the numbers from zero to `length` (exclusive).
     *
     * @param length A positive integer, the number of numbers to yield.
     * @returns A new ILazyIterable containing the elements from the array.
     */
    public static fromLength(length: number): ILazyIterable<number> {
        return new LazyIterable.LazyIterableImpl<number>(function* genFromLength() {
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
    public static fromRange(start: number, end: number, incrementBy?: number): ILazyIterable<number> {
        if (incrementBy === 0) throw RefinedSetsError.invalidArgument('Expected a non-zero value for incrementBy.');

        const difference = end - start;
        const direction = Math.sign(difference);

        if (incrementBy !== undefined && direction !== Math.sign(incrementBy))
            throw RefinedSetsError.invalidArgument(
                `Expected 'incrementBy' to match the sign of (end - start). Received: (end - start) = ${difference}, incrementBy = ${incrementBy}.`,
            );

        incrementBy ??= direction;
        const count = Math.floor(Math.abs(difference) / Math.abs(incrementBy));

        return new LazyIterable.LazyIterableImpl<number>(function* genFromRange() {
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
    public static empty<T>(): ILazyIterable<T> {
        return new LazyIterable.LazyIterableImpl<T>(function* genEmpty() {});
    }

    /**
     * Creates a new ILazyIterable which yields an infinite sequence of `undefined` values.
     *
     * @returns A new ILazyIterable containing the elements from the array.
     */
    public static infinite(): ILazyIterable<void> {
        return new LazyIterable.LazyIterableImpl<void>(function* genInfinite() {
            while (true) {
                yield;
            }
        });
    }

    //#endregion
}
