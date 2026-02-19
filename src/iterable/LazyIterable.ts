import { RefinedSetsError } from '../errors/RefinedSetsError';
import { applyLazyIterableOperations } from '../internal/operations';

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

export interface ILazyIterable<T> extends LazyIterable<T> {}

function throwUninitialized(): never {
    throw RefinedSetsError.uninitialized('LazyIterable operations have not been applied.');
}

/**
 * Represents a lazy-evaluated sequence.
 * Provides lazy evaluated implementations of standard Array methods (map, filter, flatMap, etc.).
 *
 * @template T Type of elements in the sequence.
 */
export abstract class LazyIterable<T> implements Iterable<T> {
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
     */
    public [Symbol.iterator](): Iterator<T> {
        return throwUninitialized();
    }

    /**
     * Projects each element of the sequence into a new form.
     *
     * @template U Type of elements in the result sequence.
     * @param mapper Function to transform each element.
     * @returns A new ILazyIterable of type U.
     */
    public map<U>(mapper: (item: T, index: number) => U): ILazyIterable<U> {
        return throwUninitialized();
    }

    /**
     * Returns the elements of a sequence that meet the condition specified in a callback function.
     *
     * @param predicate Predicate function called once per element.
     * @returns A new ILazyIterable containing only elements that satisfy predicate.
     */
    public filter(predicate: (item: T, index: number) => boolean): ILazyIterable<T> {
        return throwUninitialized();
    }

    /**
     * Projects each element into an iterable and flattens the resulting sequences.
     *
     * @template U Type of elements in the flattened sequence.
     * @param mapper Function that maps each element to an iterable.
     * @returns A new ILazyIterable containing all values from the iterables returned by mapper.
     */
    public flatMap<U>(mapper: (item: T, index: number) => Iterable<U>): ILazyIterable<U> {
        return throwUninitialized();
    }

    /**
     * Invokes a side-effecting callback for each element in the sequence.
     * Enumeration occurs immediately when this method is called.
     *
     * @param callback Function to execute for each element.
     */
    public forEach(callback: (item: T, index: number) => void): void {
        throwUninitialized();
    }

    /**
     * Determines whether any element satisfies the predicate.
     *
     * @param predicate Predicate function evaluated for each element until a match is found.
     * @returns True if at least one element passes the test; otherwise, false.
     */
    public some(predicate: (item: T, index: number) => boolean): boolean {
        return throwUninitialized();
    }

    /**
     * Determines whether all elements satisfy the predicate.
     *
     * @param predicate Predicate function evaluated for each element until one fails.
     * @returns True if every element passes the test; otherwise, false.
     */
    public every(predicate: (item: T, index: number) => boolean): boolean {
        return throwUninitialized();
    }

    /**
     * Returns the first element for which predicate returns true.
     *
     * @param predicate Predicate function to evaluate each element.
     * @returns The first matching element, or `undefined` if none matched.
     */
    public find(predicate: (item: T, index: number) => boolean): T | undefined {
        return throwUninitialized();
    }

    /**
     * Calls the specified callback function for all elements and returns the final accumulated result.
     *
     * @param reducer Reducer function.
     * @param initial Initial accumulator value.
     * @returns The final accumulated value.
     */
    public reduce<U>(reducer: (accumulator: U, item: T, index: number) => U, initial: U): U {
        return throwUninitialized();
    }

    /**
     * Yields every element in the current sequence concatenated with the elements from the provided iterables.
     *
     * @param iterables Additional iterables to append.
     * @returns A new lazy iterable that yields concatenated values.
     */
    public concat<U>(...iterables: Iterable<U>[]): ILazyIterable<T | U> {
        return throwUninitialized();
    }

    /**
     * Yields a tuple of [index, element] for each element in the sequence.
     *
     * @returns A lazy iterable of [index, value] tuples.
     */
    public entries(): ILazyIterable<[number, T]> {
        return throwUninitialized();
    }

    /**
     * Returns a sequence containing only the first `count` elements.
     *
     * @param count Number of elements to take.
     * @returns A new ILazyIterable containing up to `count` elements from the start.
     */
    public take(count: number): ILazyIterable<T> {
        return throwUninitialized();
    }

    /**
     * Skips the first `count` elements and returns the remainder of the sequence.
     *
     * @param count Number of elements to skip.
     * @returns A new ILazyIterable starting after the first `count` elements.
     */
    public skip(count: number): ILazyIterable<T> {
        return throwUninitialized();
    }

    /**
     * Yields deduplicated elements, optionally based on a key.
     *
     * @returns A new ILazyIterable containing only distinct elements.
     */
    public distinct(): ILazyIterable<T>;
    public distinct<K>(distinctBy: (item: T) => K): ILazyIterable<T>;
    public distinct<K>(distinctBy?: (item: T) => K): ILazyIterable<T> {
        return throwUninitialized();
    }

    /**
     * Yields unique values from this iterable followed by unique values from `other`, preserving first-seen order.
     *
     * @param other Iterable of additional values.
     * @param opts Optional equality strategy; `keyExtractor` and `equalityComparer` are mutually exclusive.
     * @returns A lazy iterable of unioned values.
     */
    public union(other: Iterable<T>): ILazyIterable<T>;
    public union<K>(other: Iterable<T>, opts: { keyExtractor: (item: T) => K }): ILazyIterable<T>;
    public union(other: Iterable<T>, opts: { equalityComparer: (a: T, b: T) => boolean }): ILazyIterable<T>;
    public union<K>(other: Iterable<T>, opts?: SetOpOptions<T, K>): ILazyIterable<T> {
        return throwUninitialized();
    }

    /**
     * Yields unique values from this iterable that also exist in `other`, preserving this iterable's order.
     *
     * @param other Iterable used as membership source.
     * @param opts Optional equality strategy; `keyExtractor` and `equalityComparer` are mutually exclusive.
     * @returns A lazy iterable of intersection values.
     */
    public intersection(other: Iterable<T>): ILazyIterable<T>;
    public intersection<K>(other: Iterable<T>, opts: { keyExtractor: (item: T) => K }): ILazyIterable<T>;
    public intersection(other: Iterable<T>, opts: { equalityComparer: (a: T, b: T) => boolean }): ILazyIterable<T>;
    public intersection<K>(other: Iterable<T>, opts?: SetOpOptions<T, K>): ILazyIterable<T> {
        return throwUninitialized();
    }

    /**
     * Yields unique values from this iterable that do not exist in `other`, preserving this iterable's order.
     *
     * @param other Iterable used as exclusion source.
     * @param opts Optional equality strategy; `keyExtractor` and `equalityComparer` are mutually exclusive.
     * @returns A lazy iterable of left-only values.
     */
    public difference(other: Iterable<T>): ILazyIterable<T>;
    public difference<K>(other: Iterable<T>, opts: { keyExtractor: (item: T) => K }): ILazyIterable<T>;
    public difference(other: Iterable<T>, opts: { equalityComparer: (a: T, b: T) => boolean }): ILazyIterable<T>;
    public difference<K>(other: Iterable<T>, opts?: SetOpOptions<T, K>): ILazyIterable<T> {
        return throwUninitialized();
    }

    /**
     * Yields values that exist in exactly one input, preserving source-local order.
     *
     * @param other Iterable to compare against.
     * @param opts Optional equality strategy; `keyExtractor` and `equalityComparer` are mutually exclusive.
     * @returns A lazy iterable of symmetric difference values.
     */
    public symmetricDifference(other: Iterable<T>): ILazyIterable<T>;
    public symmetricDifference<K>(other: Iterable<T>, opts: { keyExtractor: (item: T) => K }): ILazyIterable<T>;
    public symmetricDifference(other: Iterable<T>, opts: { equalityComparer: (a: T, b: T) => boolean }): ILazyIterable<T>;
    public symmetricDifference<K>(other: Iterable<T>, opts?: SetOpOptions<T, K>): ILazyIterable<T> {
        return throwUninitialized();
    }

    /**
     * Returns a new iterable sorted by one or more directives.
     *
     * @param directives Ordered list of sort directives; at least one is required.
     * @returns A lazy iterable that yields the sorted values.
     */
    public sort(...directives: Array<SortDirective<T, unknown>>): ILazyIterable<T> {
        return throwUninitialized();
    }

    /**
     * Lazily groups elements by a selected key.
     *
     * @template K Type of the grouping key.
     * @param keySelector Function to derive a key for each element.
     * @returns A lazy sequence of [key, grouped values] pairs.
     */
    public groupBy<K>(keySelector: (item: T, index: number) => K): ILazyIterable<[K, ILazyIterable<T>]> {
        return throwUninitialized();
    }

    /**
     * Returns the number of elements in the sequence.
     *
     * @returns The count of elements in this sequence.
     */
    public count(): number {
        return throwUninitialized();
    }

    /**
     * Returns the first element in the sequence, or undefined if the sequence is empty.
     *
     * @returns The first element, or undefined if the sequence is empty.
     */
    public first(): T | undefined {
        return throwUninitialized();
    }

    /**
     * Returns the last element in the sequence, or undefined if the sequence is empty.
     *
     * @returns The last element, or undefined if the sequence is empty.
     */
    public last(): T | undefined {
        return throwUninitialized();
    }

    /**
     * Evaluates the iterable immediately and returns a new ILazyIterable containing the materialized elements.
     * This method is useful when you want to ensure that the sequence is fully evaluated and stored in memory.
     * It can be used to avoid re-evaluating the sequence multiple times.
     *
     * @returns A new ILazyIterable containing all elements from this sequence.
     */
    public materialize(): ILazyIterable<T> {
        return throwUninitialized();
    }

    /**
     * Collects all elements into an array.
     * Enumeration occurs immediately when this method is called.
     *
     * @returns An array containing all elements from this sequence.
     */
    public toArray(): T[] {
        return throwUninitialized();
    }

    /**
     * Creates a standard JS iterable which yields each element from this sequence.
     *
     * @returns An iterable that yields each element from this sequence.
     */
    public asIterable(): Iterable<T> {
        return throwUninitialized();
    }

    /**
     * Creates a new ILazyIterable from an iterable.
     *
     * @template U Type of elements in the iterable.
     * @param iterable An iterable to convert into an ILazyIterable.
     * @returns A new ILazyIterable containing the elements from the iterable.
     */
    public static from<U>(iterable: Iterable<U>): ILazyIterable<U> {
        return throwUninitialized();
    }

    /**
     * Creates a new ILazyIterable which yields the numbers from zero to `length` (exclusive).
     *
     * @param length A positive integer, the number of numbers to yield.
     * @returns A new ILazyIterable containing the generated numbers.
     */
    public static fromLength(length: number): ILazyIterable<number> {
        return throwUninitialized();
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
        return throwUninitialized();
    }

    /**
     * Creates an empty ILazyIterable.
     *
     * @template U Type of elements in the sequence.
     * @returns An empty ILazyIterable of type U.
     */
    public static empty<U>(): ILazyIterable<U> {
        return throwUninitialized();
    }

    /**
     * Creates a new ILazyIterable which yields an infinite sequence of `undefined` values.
     *
     * @returns A new ILazyIterable that yields indefinitely.
     */
    public static infinite(): ILazyIterable<void> {
        return throwUninitialized();
    }
}

applyLazyIterableOperations(LazyIterable);
