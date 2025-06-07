import { LazyIterable } from '../src';
import { ShiftableArray } from '../src/internal/ShiftableArray';

describe('ShiftableArray', () => {
    const createTestArray = () => new ShiftableArray<number>([1, 2, 3]);

    it('should shift elements correctly', () => {
        const arr = createTestArray();

        expect(arr.shift()).toBe(1);
        expect(arr.shift()).toBe(2);
        expect(arr.shift()).toBe(3);
        expect(arr.shift()).toBeUndefined();
    });

    it('should maintain correct length after shifts', () => {
        const arr = createTestArray();

        expect(arr.size).toBe(3);
        arr.shift();
        expect(arr.size).toBe(2);
        arr.shift();
        expect(arr.size).toBe(1);
        arr.shift();
        expect(arr.size).toBe(0);
    });

    it('should iterate correctly after shifts', () => {
        const arr = createTestArray();

        const iteratedValues: number[] = [];
        for (const value of arr.forwardIter()) {
            iteratedValues.push(value);
        }

        expect(iteratedValues).toEqual([1, 2, 3]);

        arr.shift();
        iteratedValues.length = 0;

        for (const value of arr.forwardIter()) {
            iteratedValues.push(value);
        }

        expect(iteratedValues).toEqual([2, 3]);
    });

    it('should clear the array correctly', () => {
        const arr = createTestArray();

        expect(arr.size).toBe(3);
        arr.clear();
        expect(arr.size).toBe(0);
        expect(arr.head()).toBeUndefined();
    });

    it('should maintain correct head after shifts', () => {
        const arr = createTestArray();

        expect(arr.head()).toBe(1);
        arr.shift();
        expect(arr.head()).toBe(2);
        arr.shift();
        expect(arr.head()).toBe(3);
        arr.shift();
        expect(arr.head()).toBeUndefined();
        arr.push(4);
        expect(arr.head()).toBe(4);
    });

    it('should return the specified empty result when shifting from an empty array', () => {
        const falsyValues = [0, null, undefined, false, ''];
        const arr = new ShiftableArray(falsyValues);

        const empty = Symbol('empty');
        let shiftedCount = 0;
        while (arr.shift(empty) !== empty) {
            shiftedCount++;
        }

        expect(arr.size).toBe(0);
        expect(shiftedCount).toBe(falsyValues.length);
    });

    it('should return the specified empty result for head when the array is empty', () => {
        const arr = new ShiftableArray();
        expect(arr.head('foo')).toBe('foo');
    });

    it('should maintain correct length after clearing', () => {
        const arr = new ShiftableArray<number>();
        arr.push(1);
        expect(arr.size).toBe(1);
        arr.clear();
        expect(arr.size).toBe(0);
    });

    it('should reverse iterate correctly', () => {
        const arr = createTestArray();

        const reversedValues: number[] = [];
        for (const value of arr.reverseIter()) {
            reversedValues.push(value);
        }
        expect(reversedValues).toEqual([3, 2, 1]);
        arr.shift();
        reversedValues.length = 0; // Clear the array
        for (const value of arr.reverseIter()) {
            reversedValues.push(value);
        }
        expect(reversedValues).toEqual([3, 2]);
    });

    it('should compact the array correctly', () => {
        const arr = createTestArray();
        const actualArray = arr as unknown as Array<number>;

        arr.shift();
        expect(actualArray.length).toBe(3);
        expect(arr.size).toBe(2);
        expect(arr.head()).toBe(2);
        arr.compact();

        expect(actualArray.length).toBe(2);
        expect(arr.head()).toBe(2);
        expect([...arr.forwardIter()]).toEqual([2, 3]);
    });

    it('should be able to shift elements of large arrays faster than native array', () => {
        const shiftAndMeasure = (shiftImpl: () => number | undefined) => {
            let shifted = 0;
            const start = performance.now();
            while (shiftImpl()) {
                shifted++;
            }
            return { shifted, duration: performance.now() - start };
        };
        const range = LazyIterable.fromRange(1, 20_000);
        const nativeArr = [...range];
        const shiftableArr = new ShiftableArray<number>(range);
        const shiftableResult = shiftAndMeasure(() => shiftableArr.shift());
        const nativeResult = shiftAndMeasure(() => nativeArr.shift());

        expect(shiftableResult.shifted).toBe(nativeResult.shifted);
        expect(shiftableResult.duration).toBeLessThan(nativeResult.duration);
    });
});
