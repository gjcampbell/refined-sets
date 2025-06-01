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
