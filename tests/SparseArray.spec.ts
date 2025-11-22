import { LazyIterable } from '../src';
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
});
