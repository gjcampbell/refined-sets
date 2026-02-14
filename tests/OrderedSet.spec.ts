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

    it('should use identity key extractor by default', () => {
        const set = new OrderedSet<number>([1, 1, 2]);
        expect(set.has(1)).toBe(true);
        expect(set.has(3)).toBe(false);
        expect([...set]).toEqual([1, 2]);
    });

    it('should support custom keyExtractor for object identity by key', () => {
        type Item = { id: number; label: string };
        const set = new OrderedSet<Item, number>(
            [
                { id: 1, label: 'first' },
                { id: 1, label: 'second' },
                { id: 2, label: 'third' },
            ],
            { keyExtractor: (x) => x.id },
        );

        expect([...set]).toEqual([
            { id: 1, label: 'first' },
            { id: 2, label: 'third' },
        ]);
        expect(set.has({ id: 2, label: 'x' })).toBe(true);
        expect(set.remove({ id: 1, label: 'y' })).toBe(true);
        expect([...set]).toEqual([{ id: 2, label: 'third' }]);
    });
});
