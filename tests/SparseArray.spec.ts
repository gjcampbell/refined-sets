import { VOID } from '../src/internal/IArray';
import { SparseArray } from '../src/internal/SparseArray';

describe('SparseArray', () => {
    it('should initialize with correct size', () => {
        const sparseArray = new SparseArray([1, 2, 3]);
        expect(sparseArray.size).toBe(3);
    });

    it('should push items correctly', () => {
        const sparseArray = new SparseArray<number>();
        sparseArray.push(1, 2, 3);
        expect(sparseArray.size).toBe(3);
        expect([...sparseArray.forwardIter()]).toEqual([1, 2, 3]);
    });

    it('should pop items correctly', () => {
        const sparseArray = new SparseArray<number>([1, 2, 3]);
        expect(sparseArray.pop()).toBe(3);
        expect(sparseArray.size).toBe(2);
        expect([...sparseArray.forwardIter()]).toEqual([1, 2]);
    });

    it('should remove at index by creating a hole', () => {
        const sparseArray = new SparseArray<number>([1, 2, 3]);

        expect(sparseArray.removeAt(1)).toBe(2);
        expect(sparseArray.size).toBe(2);
        expect([...sparseArray.forwardIter()]).toEqual([1, 3]);
        expect([...sparseArray.forwardIter(true)]).toEqual([1, VOID, 3]);
    });

    it('should return VOID when removeAt gets an invalid negative index', () => {
        const sparseArray = new SparseArray<number>([1, 2, 3]);

        expect(sparseArray.removeAt(-1)).toBe(VOID);
        expect(sparseArray.size).toBe(3);
        expect([...sparseArray.forwardIter()]).toEqual([1, 2, 3]);
    });

    it('should remove all matching items', () => {
        const sparseArray = new SparseArray<number>([1, 2, 3, 2, 4]);

        expect(sparseArray.remove(2)).toBe(2);
        expect(sparseArray.size).toBe(3);
        expect([...sparseArray.forwardIter()]).toEqual([1, 3, 4]);
        expect([...sparseArray.forwardIter(true)]).toEqual([1, VOID, 3, VOID, 4]);
    });

    it('should return 0 when remove does not find item', () => {
        const sparseArray = new SparseArray<number>([1, 2, 3]);

        expect(sparseArray.remove(9)).toBe(0);
        expect([...sparseArray.forwardIter()]).toEqual([1, 2, 3]);
    });

    it('should remove only count occurrences when count is provided', () => {
        const sparseArray = new SparseArray<number>([1, 2, 3, 2, 4]);

        expect(sparseArray.remove(2, 1)).toBe(1);
        expect(sparseArray.size).toBe(4);
        expect([...sparseArray.forwardIter()]).toEqual([1, 3, 2, 4]);
        expect([...sparseArray.forwardIter(true)]).toEqual([1, VOID, 3, 2, 4]);
    });

    it('should pop past trailing holes', () => {
        const sparseArray = new SparseArray<number>([1, 2, 3, 4]);

        expect(sparseArray.removeAt(3)).toBe(4);
        expect(sparseArray.pop()).toBe(3);
        expect(sparseArray.size).toBe(2);
        expect([...sparseArray.forwardIter()]).toEqual([1, 2]);
    });

    it('should support reverse iteration with and without holes', () => {
        const sparseArray = new SparseArray<number>([1, 2, 3, 4]);
        sparseArray.removeAt(1);
        sparseArray.removeAt(3);

        expect([...sparseArray.reverseIter()]).toEqual([3, 1]);
        expect([...sparseArray.reverseIter(true)]).toEqual([VOID, 3, VOID, 1]);
    });

    it('should clear all items', () => {
        const sparseArray = new SparseArray<number>([1, 2, 3]);
        sparseArray.removeAt(1);

        sparseArray.clear();

        expect(sparseArray.size).toBe(0);
        expect([...sparseArray.forwardIter()]).toEqual([]);
        expect([...sparseArray.forwardIter(true)]).toEqual([]);
    });

    it('should compact holes and preserve order', () => {
        const sparseArray = new SparseArray<number>([1, 2, 3, 4]);
        sparseArray.removeAt(1);
        sparseArray.removeAt(3);

        expect(sparseArray.compact()).toBe(2);
        expect(sparseArray.size).toBe(2);
        expect([...sparseArray.forwardIter()]).toEqual([1, 3]);
        expect([...sparseArray.forwardIter(true)]).toEqual([1, 3]);
    });
});
