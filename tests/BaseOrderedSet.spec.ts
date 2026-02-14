import { BaseOrderedSet, BaseOrderedSetOptions, CompactionMode } from '../src/collections/BaseOrderedSet';

class TestOrderedSet<T> extends BaseOrderedSet<T> {
    public constructor(initial?: Iterable<T>, options?: BaseOrderedSetOptions) {
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
});
