import { OrderedSet } from '../src/collections/OrderedSet';

describe('OrderedSet', () => {
    it('should initialize from iterable in insertion order', () => {
        const set = new OrderedSet<number>([1, 2, 3]);
        expect([...set]).toEqual([1, 2, 3]);
    });

    it('should deduplicate values by default', () => {
        const set = new OrderedSet<number>([1, 2, 1, 3, 2]);
        expect([...set]).toEqual([1, 2, 3]);
    });

    it('should remove and keep order of remaining values', () => {
        const set = new OrderedSet<number>([1, 2, 3, 4]);
        expect(set.remove(2)).toBe(true);
        expect([...set]).toEqual([1, 3, 4]);
        expect(set.remove(9)).toBe(false);
    });
});
