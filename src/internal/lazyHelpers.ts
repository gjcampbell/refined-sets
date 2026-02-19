import { RefinedSetsError } from '../errors/RefinedSetsError';
import type { ILazyIterable, LazyIterable, SetOpOptions, SortDirective } from '../iterable/LazyIterable';

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

export function createLazyIterableFromGenerator<T>(LazyIterableCtor: typeof LazyIterable, generator: () => IterableIterator<T>): ILazyIterable<T> {
    const ctor = LazyIterableCtor as unknown as {
        LazyIterableImpl: new <U>(generatorFn: () => IterableIterator<U>) => ILazyIterable<U>;
    };
    return new ctor.LazyIterableImpl<T>(generator);
}

export function extendLazyIterable<T, U>(self: LazyIterable<T>, generator: (self: ILazyIterable<T>) => IterableIterator<U>): ILazyIterable<U> {
    const source = self as unknown as {
        extend: (generatorFn: (selfRef: ILazyIterable<T>) => IterableIterator<U>) => ILazyIterable<U>;
    };
    return source.extend(generator);
}

export function createEqualityStrategy<T, K>(opts?: SetOpOptions<T, K>): EqualityStrategy<T, K> {
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

export function containsByComparer<T>(items: T[], target: T, equals: (a: T, b: T) => boolean): boolean {
    for (let i = 0; i < items.length; i++) {
        if (equals(items[i], target)) {
            return true;
        }
    }
    return false;
}

function normalizeComparerResult(value: number): number {
    if (Number.isNaN(value) || value === 0) {
        return 0;
    }
    return value < 0 ? -1 : 1;
}

function compareSortKeys(a: unknown, b: unknown): number {
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
        return normalizeComparerResult(timeA - timeB);
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

export function buildComparer<T>(directives: Array<SortDirective<T, unknown>>): (a: T, b: T) => number {
    if (directives.length === 0) {
        throw RefinedSetsError.invalidArgument('sort requires at least one sort directive.');
    }

    const comparers = directives.map((directive) => {
        if ('sortKeyAccessor' in directive) {
            const keyAccessor = directive.sortKeyAccessor;
            const keyComparer = directive.comparer ?? ((a: unknown, b: unknown) => compareSortKeys(a, b));
            return (a: T, b: T): number => {
                const result = normalizeComparerResult(keyComparer(keyAccessor(a), keyAccessor(b)));
                return directive.descending ? -result : result;
            };
        }

        return (a: T, b: T): number => {
            const result = normalizeComparerResult(directive.comparer(a, b));
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
