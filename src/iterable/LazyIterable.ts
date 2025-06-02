import { RefinedSetsError } from '../errors/RefinedSetsError';

interface ILazyIterable<T> extends LazyIterable<T> {}

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
        const self = this;
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
     * @param predicate Function invoked on each element.
     * @returns The index of the first matching element, or -1 if none matched.
     */
    public distinct(distinctBy?: (item: T) => any): ILazyIterable<T> {
        distinctBy ??= (x: T) => x;
        return this.extend(function* genDistint(self) {
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
