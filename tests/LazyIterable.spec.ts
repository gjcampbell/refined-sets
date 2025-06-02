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
