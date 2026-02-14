import { CompactionMode } from '../src/collections/BaseOrderedSet';
import { StackSet } from '../src/collections/StackSet';

class TestStackSet<T> extends StackSet<T> {
    public removeValueForTest(value: T, count?: number): boolean {
        return (this as any).removeInternal(value, count) as boolean;
    }

    public holeCountForTest(): number {
        return (this as any).items.holeCount as number;
    }
}

describe('StackSet', () => {
    describe('intended use', () => {
        it('should initialize in insertion order and deduplicate by default', () => {
            const stack = new StackSet<number>([1, 2, 1, 3, 2]);
            expect([...stack]).toEqual([1, 2, 3]);
        });

        it('should push, peek, and pop in LIFO order', () => {
            const stack = new StackSet<number>();
            stack.push(10).push(20).push(30);

            expect(stack.peek()).toBe(30);
            expect(stack.pop()).toBe(30);
            expect(stack.peek()).toBe(20);
            expect(stack.pop()).toBe(20);
            expect(stack.pop()).toBe(10);
            expect(stack.pop()).toBeUndefined();
        });

        it('should retain duplicates when deduplicate is false', () => {
            const stack = new TestStackSet<number>([1, 2, 1], { deduplicate: false, compaction: CompactionMode.Manual });
            expect([...stack]).toEqual([1, 2, 1]);

            expect(stack.pop()).toBe(1);
            expect(stack.pop()).toBe(2);
            expect(stack.pop()).toBe(1);
            expect(stack.pop()).toBeUndefined();
        });
    });

    describe('side-effects', () => {
        it('should not mutate contents on peek', () => {
            const stack = new TestStackSet<number>([1, 2, 3], { compaction: CompactionMode.Manual });
            const before = [...stack];
            const beforeHoles = stack.holeCountForTest();

            expect(stack.peek()).toBe(3);

            expect([...stack]).toEqual(before);
            expect(stack.holeCountForTest()).toBe(beforeHoles);
        });

        it('should avoid forward iteration for tail operations', () => {
            const stack = new TestStackSet<number>([1, 2, 3], { compaction: CompactionMode.Manual });
            const items = (stack as any).items;
            const forwardSpy = jest.spyOn(items, 'forwardIter');
            const reverseSpy = jest.spyOn(items, 'reverseIter');
            const popSpy = jest.spyOn(items, 'pop');

            expect(stack.peek()).toBe(3);
            expect(stack.pop()).toBe(3);

            expect(reverseSpy).toHaveBeenCalledTimes(1);
            expect(popSpy).toHaveBeenCalledTimes(1);
            expect(forwardSpy).not.toHaveBeenCalled();
        });
    });

    describe('performance and memory notes', () => {
        it('should reclaim trailing hole bookkeeping when popping after tail deletion', () => {
            const stack = new TestStackSet<number>([1, 2, 3, 4, 5], { compaction: CompactionMode.Manual });

            expect(stack.removeValueForTest(5)).toBe(true);
            expect(stack.holeCountForTest()).toBe(1);

            expect(stack.pop()).toBe(4);
            expect(stack.holeCountForTest()).toBe(0);
            expect([...stack]).toEqual([1, 2, 3]);
        });
    });

    describe('validation', () => {
        it('should follow SameValueZero deduplication for NaN', () => {
            const stack = new StackSet<number>();
            stack.push(Number.NaN).push(Number.NaN);

            const top = stack.peek();
            expect(Number.isNaN(top as number)).toBe(true);

            const popped = stack.pop();
            expect(Number.isNaN(popped as number)).toBe(true);
            expect(stack.pop()).toBeUndefined();
        });
    });
});
