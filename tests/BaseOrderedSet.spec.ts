import { BaseOrderedSet, BaseOrderedSetOptions, CompactionMode } from '../src/collections/BaseOrderedSet';

class TestOrderedSet<T, K = T> extends BaseOrderedSet<T, K> {
    public constructor(initial?: Iterable<T>, options?: BaseOrderedSetOptions<T, K>) {
        super(initial, options);
    }

    public add(value: T): this {
        return this.addInternal(value);
    }

    public remove(value: T): boolean {
        return this.removeInternal(value);
    }

    public removeCount(value: T, count: number): boolean {
        return this.removeInternal(value, count);
    }

    public holeCount(): number {
        return (this as any).items.holeCount as number;
    }
}

describe('BaseOrderedSet', () => {
    it('should initialize from iterable and deduplicate by default', () => {
        const set = new TestOrderedSet<number>([1, 2, 1, 3, 2]);

        expect([...set]).toEqual([1, 2, 3]);
        expect(set.has(1)).toBe(true);
        expect(set.has(9)).toBe(false);
    });

    it('should preserve duplicates when deduplicate is false', () => {
        const set = new TestOrderedSet<number>([1, 2, 1, 3, 1], { deduplicate: false, compaction: CompactionMode.Manual });

        expect([...set]).toEqual([1, 2, 1, 3, 1]);
        expect(set.removeCount(1, 2)).toBe(true);
        expect([...set]).toEqual([1, 2, 3]);
    });

    it('should support clear and explicit compact', () => {
        const set = new TestOrderedSet<number>([1, 2, 3], { compaction: CompactionMode.Manual });

        set.remove(2);
        expect(set.holeCount()).toBe(1);

        set.compact();
        expect(set.holeCount()).toBe(0);
        expect([...set]).toEqual([1, 3]);

        set.clear();
        expect(set.holeCount()).toBe(0);
        expect([...set]).toEqual([]);
    });

    it('should compact automatically in auto mode when hole threshold is reached', () => {
        const set = new TestOrderedSet<number>([1, 2, 3], { compaction: CompactionMode.Auto, holeThreshold: 1 });

        expect(set.remove(2)).toBe(true);
        expect(set.holeCount()).toBe(0);
        expect([...set]).toEqual([1, 3]);
    });

    it('should use thresholdBytes when provided', () => {
        const set = new TestOrderedSet<number>([1, 2, 3], { compaction: CompactionMode.Auto, holeThreshold: 999, thresholdBytes: 8 });

        set.remove(2);
        expect(set.holeCount()).toBe(0);
        expect([...set]).toEqual([1, 3]);
    });

    it('should compact on every removal in guaranteed mode', () => {
        const set = new TestOrderedSet<number>([1, 2, 3], { compaction: CompactionMode.Guaranteed, holeThreshold: 999 });

        set.remove(2);
        expect(set.holeCount()).toBe(0);
    });

    it('should compact before iteration in eager mode', () => {
        const set = new TestOrderedSet<number>([1, 2, 3], { compaction: CompactionMode.Eager, holeThreshold: 999 });
        set.remove(2);

        expect(set.holeCount()).toBe(1);

        const iter = set[Symbol.iterator]();
        expect(set.holeCount()).toBe(1);

        expect(iter.next().value).toBe(1);
        expect(set.holeCount()).toBe(0);
    });

    it('should compact only after full iteration in lazy mode', () => {
        const set = new TestOrderedSet<number>([1, 2, 3, 4], { compaction: CompactionMode.Lazy, holeThreshold: 999 });
        set.remove(2);

        expect(set.holeCount()).toBe(1);

        const iter = set[Symbol.iterator]();
        expect(iter.next().value).toBe(1);
        expect(set.holeCount()).toBe(1);

        expect([...set]).toEqual([1, 3, 4]);
        expect(set.holeCount()).toBe(0);
    });

    it('should not auto compact in manual mode', () => {
        const set = new TestOrderedSet<number>([1, 2, 3, 4], { compaction: CompactionMode.Manual, holeThreshold: 1 });
        set.remove(2);
        set.remove(3);

        expect(set.holeCount()).toBe(2);
        expect([...set]).toEqual([1, 4]);
        expect(set.holeCount()).toBe(2);
    });

    it('should return an immutable snapshot iterator after enumeration starts', () => {
        const set = new TestOrderedSet<number>([1, 2, 3], { compaction: CompactionMode.Manual });
        const snapshot = set.snapshotIterator();

        expect(snapshot.next().value).toBe(1);

        set.remove(2);
        set.add(4);

        expect([...snapshot]).toEqual([2, 3]);
        expect([...set]).toEqual([1, 3, 4]);
    });

    it('should use keyExtractor for dedupe and has/remove lookups', () => {
        type User = { id: number; name: string };
        const set = new TestOrderedSet<User, number>(
            [
                { id: 1, name: 'alpha-v1' },
                { id: 1, name: 'alpha-v2' },
                { id: 2, name: 'bravo' },
            ],
            { keyExtractor: (x) => x.id },
        );

        expect([...set]).toEqual([
            { id: 1, name: 'alpha-v1' },
            { id: 2, name: 'bravo' },
        ]);
        expect(set.has({ id: 1, name: 'anything' })).toBe(true);
        expect(set.has({ id: 9, name: 'missing' })).toBe(false);
        expect(set.remove({ id: 1, name: 'temp' })).toBe(true);
        expect([...set]).toEqual([{ id: 2, name: 'bravo' }]);
    });

    it('should remove by key with count when deduplicate is false and keyExtractor is provided', () => {
        type User = { id: number; rev: number };
        const set = new TestOrderedSet<User, number>(
            [
                { id: 1, rev: 1 },
                { id: 1, rev: 2 },
                { id: 1, rev: 3 },
                { id: 2, rev: 1 },
            ],
            { deduplicate: false, compaction: CompactionMode.Manual, keyExtractor: (x) => x.id },
        );

        expect(set.removeCount({ id: 1, rev: 999 }, 2)).toBe(true);
        expect([...set]).toEqual([{ id: 1, rev: 1 }, { id: 2, rev: 1 }]);
    });
});
