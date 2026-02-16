import { LazyIterable } from '../src/index';

describe('LazyIterable', () => {
    beforeEach(() => {});

    test('should be able to create from an array', () => {
        const array = [1, 3, 5];
        const result = LazyIterable.from(array).toArray();
        expect(result).toEqual(array);
    });

    test('should return a fresh iterator', () => {
        const subject = TrackedTestIterable.from([1, 2, 3]);
        const iterator1 = subject[Symbol.iterator]();
        const iterator2 = subject[Symbol.iterator]();
        expect(iterator1).not.toBe(iterator2);
    });

    test('should iterate from the start for each iterator call', () => {
        const subject = new TrackedTestIterable([1, 2, 3]);
        const results1 = [...subject];
        const results2 = [...subject];
        expect(results1).toEqual(results2);
        expect(subject.itemsYielded).toBe(6);
    });

    test('should be able to create from a number range', () => {
        const range = LazyIterable.fromRange(1, 5).toArray();
        expect(range).toEqual([1, 2, 3, 4, 5]);
    });

    test('should be able to create a range where the elements are in descending order', () => {
        const range = LazyIterable.fromRange(5, 1);
        expect(range.toArray()).toEqual([5, 4, 3, 2, 1]);
    });

    test('should throw an error if the fromRange incrementBy is zero or directionally opposite of start to end', () => {
        expect(() => LazyIterable.fromRange(1, 5, 0)).toThrow();
        expect(() => LazyIterable.fromRange(5, 1, 1)).toThrow();
    });

    test('should be able to increment by an arbitrary value if specified in fromRange', () => {
        const rangeWithEndExceeded = LazyIterable.fromRange(1, 10, 2).toArray();
        expect(rangeWithEndExceeded).toEqual([1, 3, 5, 7, 9]);

        const rangeWithIncludedEnd = LazyIterable.fromRange(1, 11, 2).toArray();
        expect(rangeWithIncludedEnd).toEqual([1, 3, 5, 7, 9, 11]);
    });

    test('should be able to create a range from 0 to some length', () => {
        const range = LazyIterable.fromLength(5);
        expect(range.toArray()).toEqual([0, 1, 2, 3, 4]);
    });

    test('typical array methods chained yield minimally', () => {
        const subject = new TrackedTestIterable<number>([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        const result = subject
            .map((x) => x * 2)
            .filter((x) => x >= 10)
            .map((x) => x + 1)
            .toArray();

        expect(result).toEqual([11, 13, 15, 17, 19]);
        expect(subject.itemsYielded).toBe(9);
    });

    test('should be able to get the first item', () => {
        const subject = LazyIterable.fromRange(2, 10);
        const result = subject.skip(2).first();
        expect(result).toBe(4);
    });

    test('should return undefined if first is called on an empty iterable', () => {
        const subject = LazyIterable.fromRange(2, 10);
        const result = subject.skip(10).first();
        expect(result).toBeUndefined();
    });

    test('should be able to get the last item', () => {
        const subject = LazyIterable.fromRange(2, 10);
        const result = subject.take(5).last();
        expect(result).toBe(6);
    });

    test('should return undefined if last is called on an empty iterable', () => {
        const subject = LazyIterable.fromRange(2, 10);
        const result = subject.skip(10).last();
        expect(result).toBeUndefined();
    });

    test('skip should skip the first n items', () => {
        const result = LazyIterable.fromLength(1000000).skip(999995).take(5).toArray();

        expect(result).toEqual([999995, 999996, 999997, 999998, 999999]);
    });

    test('take should take the first n items', () => {
        const result = LazyIterable.fromLength(1000000).take(5).toArray();

        expect(result).toEqual([0, 1, 2, 3, 4]);
    });

    test('take should yield nothing if the value is count <= 0', () => {
        const takeZero = LazyIterable.fromLength(10).take(0).toArray();
        expect(takeZero).toEqual([]);

        const takeNeg = LazyIterable.fromLength(10).take(-1).toArray();
        expect(takeNeg).toEqual([]);
    });

    test('map calls callback no more than necessary', () => {
        const callback = jest.fn((x: number) => x * 2);
        const result = LazyIterable.fromRange(1, 105).skip(100).take(5).map(callback).toArray();

        expect(result).toEqual([202, 204, 206, 208, 210]);
        expect(callback).toHaveBeenCalledTimes(5);
    });

    test('filter calls callback no more than necessary', () => {
        const callback = jest.fn((x: number) => x % 2 === 0);
        const result = LazyIterable.fromRange(1, 105).take(7).filter(callback).toArray();

        expect(result).toEqual([2, 4, 6]);
        expect(callback).toHaveBeenCalledTimes(7);
    });

    test('should be able to create a LazyIterable from an iterable', () => {
        const iterable = new TrackedTestIterable([1, 2, 3]);
        const lazyIterable = LazyIterable.from(iterable);
        expect([...lazyIterable]).toEqual([1, 2, 3]);
        expect(iterable.itemsYielded).toBe(3);
    });

    test('can create an empty LazyIterable', () => {
        const emptyIterable = LazyIterable.empty<number>();
        expect([...emptyIterable]).toEqual([]);
    });

    test('should be able to concatenate with other iterables', () => {
        let tracked: TrackedTestIterable<number>;
        const result = LazyIterable.from([1, 2, 3])
            .concat(LazyIterable.from([4, 5, 6]), (tracked = new TrackedTestIterable([7, 8, 9])), [10, 11, 12], new Set([13, 14, 15]))
            .toArray();

        expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
        expect(tracked.itemsYielded).toBe(3);
    });

    test('should be able to flatten nested iterables', () => {
        const nested = LazyIterable.from([LazyIterable.from([1, 2]), LazyIterable.from([3, 4])]);
        const result = nested.flatMap((l) => l).toArray();

        expect(result).toEqual([1, 2, 3, 4]);
    });

    test('should be able to flatten mapped nested iterables', () => {
        const itemSets = [{ items: [1, 2] }, { items: new Set([3, 4]) }, { items: LazyIterable.from([5, 6]) }];
        const result = LazyIterable.from(itemSets)
            .flatMap((s) => s.items)
            .toArray();

        expect(result).toEqual([1, 2, 3, 4, 5, 6]);
    });

    test('should be able to arbitrarily reduce', () => {
        const iterable = LazyIterable.from([1, 2, 3, 4, 5]);
        const result = iterable.reduce(
            (acc, val) => {
                acc.value += val;
                return acc;
            },
            { value: 0 },
        );

        expect(result.value).toBe(15);
    });

    test('should be able to get distinct values', () => {
        const iterable = LazyIterable.from([1, 2, 2, 3, 4, 4, 5]);
        const result = iterable.distinct().toArray();
        expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    test('should be able to get distinct values by arbitrary criteria', () => {
        const iterable = LazyIterable.fromRange(1, 10);
        const result = iterable.distinct((v) => v % 2).toArray();

        expect(result).toEqual([1, 2]);
    });

    test('should be able to lazily group values by key selector', () => {
        const iterable = LazyIterable.from([1, 2, 3, 4, 5, 6]);
        const groups = iterable.groupBy((value) => value % 2);
        const result = groups.map(([key, values]) => [key, values.toArray()]).toArray();

        expect(result).toEqual([
            [1, [1, 3, 5]],
            [0, [2, 4, 6]],
        ]);
    });

    test('groupBy should not enumerate until groups or values are consumed', () => {
        const iterable = new TrackedTestIterable([1, 2, 3, 4, 5]);
        const groups = iterable.groupBy((value) => value % 2);

        expect(iterable.itemsYielded).toBe(0);

        const firstGroup = groups.first();
        expect(firstGroup?.[0]).toBe(1);
        expect(iterable.itemsYielded).toBe(1);
    });

    test('groupBy should buffer incidentally discovered groups and values', () => {
        const iterable = new TrackedTestIterable(['a1', 'b1', 'a2', 'c1', 'b2']);
        const groups = iterable.groupBy((value) => value[0]);
        const groupIterator = groups[Symbol.iterator]();

        const first = groupIterator.next().value;
        expect(first?.[0]).toBe('a');
        expect(iterable.itemsYielded).toBe(1);

        const aValues = first?.[1].take(2).toArray();
        expect(aValues).toEqual(['a1', 'a2']);
        expect(iterable.itemsYielded).toBe(3);

        const second = groupIterator.next().value;
        expect(second?.[0]).toBe('b');
        expect(iterable.itemsYielded).toBe(3);
        expect(second?.[1].first()).toBe('b1');
        expect(iterable.itemsYielded).toBe(3);

        expect(second?.[1].toArray()).toEqual(['b1', 'b2']);
        expect(iterable.itemsYielded).toBe(5);

        const third = groupIterator.next().value;
        expect(third?.[0]).toBe('c');
        expect(third?.[1].toArray()).toEqual(['c1']);
        expect(iterable.itemsYielded).toBe(5);
    });

    test('groupBy should provide item index to the key selector', () => {
        const selector = jest.fn((_: number, index: number) => (index < 3 ? 'head' : 'tail'));
        const iterable = LazyIterable.from([10, 20, 30, 40, 50]);
        const groups = iterable.groupBy(selector);
        const result = groups.map(([key, values]) => [key, values.toArray()]).toArray();

        expect(result).toEqual([
            ['head', [10, 20, 30]],
            ['tail', [40, 50]],
        ]);
        expect(selector).toHaveBeenCalledTimes(5);
        expect(selector.mock.calls).toEqual([
            [10, 0],
            [20, 1],
            [30, 2],
            [40, 3],
            [50, 4],
        ]);
    });

    test('should be able to count number of items', () => {
        const iterable = LazyIterable.fromLength(10);

        const fullCount = iterable.count();
        const filteredCount = iterable.filter((x) => x % 2 === 0).count();

        expect(fullCount).toBe(10);
        expect(filteredCount).toBe(5);
    });

    test('should be able to check if any items match a condition and should exit early if possible', () => {
        const iterable = new TrackedTestIterable([1, 2, 3, 4, 5]);

        const hasEven = iterable.some((x) => x % 2 === 0);
        expect(hasEven).toBe(true);
        expect(iterable.itemsYielded).toBe(2);

        const hasGreaterThanFive = iterable.some((x) => x > 5);
        expect(hasGreaterThanFive).toBe(false);
    });

    test('should be able to check if all items match a condition and should exit early if possible', () => {
        const iterable = new TrackedTestIterable([1, 2, 3, 4, 5]);
        const allLessLteOne = iterable.every((x) => x <= 1);
        expect(allLessLteOne).toBe(false);
        expect(iterable.itemsYielded).toBe(2);

        const allLessThanFour = iterable.every((x) => x < 6);
        expect(allLessThanFour).toBe(true);
    });

    test('should be able to find an item that matches a condition and exit early when item is found', () => {
        const iterable = new TrackedTestIterable([1, 2, 3, 4, 5]);
        const foundItem = iterable.find((x) => x === 3);
        expect(foundItem).toBe(3);
        expect(iterable.itemsYielded).toBe(3);

        const notFoundItem = iterable.find((x) => x === 6);
        expect(notFoundItem).toBeUndefined();
    });

    test('should be able to do an array-like forEach', () => {
        const iterable = LazyIterable.from([1, 2, 3, 4, 5]);
        const results: number[] = [];
        iterable.forEach((x) => results.push(x));
        expect(results).toEqual([1, 2, 3, 4, 5]);
    });

    test('should be able to yield a tuple of items and their index', () => {
        const iterable = LazyIterable.from([10, 20, 30]);
        const results = iterable.entries().toArray();

        expect(results).toEqual([
            [0, 10],
            [1, 20],
            [2, 30],
        ]);
    });

    test('should be able to materialize a chained iterable and evaluation is not repeated', () => {
        const callback = jest.fn((x: number) => x % 2 === 0);
        const iterable = new TrackedTestIterable([1, 2, 3, 4, 5]);
        const materialized = iterable
            .filter((x) => x < 5)
            .map((x) => x * 2)
            .filter(callback)
            .materialize();

        expect(materialized.toArray()).toEqual([2, 4, 6, 8]);
        expect(iterable.itemsYielded).toBe(5);
        expect(callback).toHaveBeenCalledTimes(4);

        const postMaterialized = materialized.filter((x) => x > 5).map((x) => x + 1);

        expect(postMaterialized.toArray()).toEqual([7, 9]);
        expect(iterable.itemsYielded).toBe(5);
        expect(callback).toHaveBeenCalledTimes(4);
    });

    test('union should de-duplicate with default set semantics, including NaN', () => {
        const result = LazyIterable.from([1, NaN, NaN, 2]).union([NaN, 3, 2]).toArray();
        expect(result).toEqual([1, NaN, 2, 3]);
    });

    test('union should preserve object reference identity by default', () => {
        const shared = { id: 1 };
        const leftOnly = { id: 1 };
        const rightOnly = { id: 1 };

        const result = LazyIterable.from([shared, leftOnly]).union([shared, rightOnly]).toArray();
        expect(result).toEqual([shared, leftOnly, rightOnly]);
    });

    test('union should support keyExtractor semantics and stable first-seen ordering', () => {
        const left = [{ id: 1, value: 'L1' }, { id: 2, value: 'L2' }, { id: 2, value: 'L2-dup' }];
        const right = [{ id: 2, value: 'R2' }, { id: 3, value: 'R3' }];

        const result = LazyIterable.from(left)
            .union(right, { keyExtractor: (item) => item.id })
            .toArray();

        expect(result).toEqual([
            { id: 1, value: 'L1' },
            { id: 2, value: 'L2' },
            { id: 3, value: 'R3' },
        ]);
    });

    test('intersection should support equalityComparer semantics', () => {
        const left = [{ id: 1, label: 'A' }, { id: 2, label: 'B' }, { id: 2, label: 'B2' }, { id: 3, label: 'C' }];
        const right = [{ id: 2, label: 'R2' }, { id: 4, label: 'R4' }];

        const result = LazyIterable.from(left)
            .intersection(right, { equalityComparer: (a, b) => a.id === b.id })
            .toArray();

        expect(result).toEqual([{ id: 2, label: 'B' }]);
    });

    test('difference should support keyExtractor semantics', () => {
        const left = [{ id: 1 }, { id: 2 }, { id: 2 }, { id: 3 }];
        const right = [{ id: 2 }, { id: 4 }];

        const result = LazyIterable.from(left)
            .difference(right, { keyExtractor: (item) => item.id })
            .toArray();

        expect(result).toEqual([{ id: 1 }, { id: 3 }]);
    });

    test('symmetricDifference should emit left-unique then right-unique values', () => {
        const left = [1, 2, 2, 3, 5];
        const right = [2, 4, 4, 5, 6];

        const result = LazyIterable.from(left).symmetricDifference(right).toArray();
        expect(result).toEqual([1, 3, 4, 6]);
    });

    test('set operations should reject conflicting keyExtractor and equalityComparer options', () => {
        const opts = {
            keyExtractor: (item: { id: number }) => item.id,
            equalityComparer: (a: { id: number }, b: { id: number }) => a.id === b.id,
        };

        expect(() => LazyIterable.from([{ id: 1 }]).union([{ id: 1 }], opts as any)).toThrow('cannot include both keyExtractor and equalityComparer');
        expect(() => LazyIterable.from([{ id: 1 }]).intersection([{ id: 1 }], opts as any)).toThrow('cannot include both keyExtractor and equalityComparer');
        expect(() => LazyIterable.from([{ id: 1 }]).difference([{ id: 1 }], opts as any)).toThrow('cannot include both keyExtractor and equalityComparer');
        expect(() => LazyIterable.from([{ id: 1 }]).symmetricDifference([{ id: 1 }], opts as any)).toThrow(
            'cannot include both keyExtractor and equalityComparer',
        );
    });

    test('sort should support key accessor ascending', () => {
        const result = LazyIterable.from([4, 1, 3, 2])
            .sort({ sortKeyAccessor: (item) => item })
            .toArray();
        expect(result).toEqual([1, 2, 3, 4]);
    });

    test('sort should support multiple directives', () => {
        const items = [
            { category: 'b', value: 2 },
            { category: 'a', value: 3 },
            { category: 'a', value: 1 },
            { category: 'b', value: 1 },
        ];

        const result = LazyIterable.from(items)
            .sort(
                { sortKeyAccessor: (item) => item.category },
                { sortKeyAccessor: (item) => item.value },
            )
            .toArray();

        expect(result).toEqual([
            { category: 'a', value: 1 },
            { category: 'a', value: 3 },
            { category: 'b', value: 1 },
            { category: 'b', value: 2 },
        ]);
    });

    test('sort should support direct comparer and descending', () => {
        const result = LazyIterable.from(['aaa', 'b', 'cc'])
            .sort(
                { comparer: (a: string, b: string) => a.length - b.length, descending: true },
                { sortKeyAccessor: (item) => item },
            )
            .toArray();

        expect(result).toEqual(['aaa', 'cc', 'b']);
    });

    test('sort should be stable when directives consider values equal', () => {
        const items = [
            { id: 1, group: 'x' },
            { id: 2, group: 'x' },
            { id: 3, group: 'x' },
        ];

        const result = LazyIterable.from(items)
            .sort({ sortKeyAccessor: (item) => item.group })
            .map((item) => item.id)
            .toArray();

        expect(result).toEqual([1, 2, 3]);
    });

    test('sort should throw when no directives are provided', () => {
        expect(() => LazyIterable.from([3, 1, 2]).sort()).toThrow('at least one sort directive');
    });

    test('should be able to create an iterable that yields indefinitely', () => {
        const stopAfter = 2 ** 20 - 1;
        const result = LazyIterable.infinite()
            .map((_, i) => i)
            .skip(stopAfter)
            .take(1)
            .toArray();
        expect(result).toEqual([stopAfter]);
    });
});

class TrackedTestIterable<T> extends LazyIterable<T> {
    private _itemsYielded = 0;
    public get itemsYielded() {
        return this._itemsYielded;
    }
    public constructor(private data: T[]) {
        super();
    }
    protected *getIterator() {
        for (const item of this.data) {
            this._itemsYielded++;
            yield item;
        }
    }
}
