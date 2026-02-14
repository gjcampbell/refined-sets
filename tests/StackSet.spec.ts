import { StackSet } from '../src/collections/StackSet';

describe('StackSet', () => {
    it('should initialize in insertion order and deduplicate by default', () => {
        const stack = new StackSet<number>([1, 2, 1, 3, 2]);
        expect([...stack]).toEqual([1, 2, 3]);
    });

    it('should peek and pop in LIFO order', () => {
        const stack = new StackSet<number>();
        stack.push(10).push(20).push(30);

        expect(stack.peek()).toBe(30);
        expect(stack.pop()).toBe(30);
        expect(stack.peek()).toBe(20);
        expect(stack.pop()).toBe(20);
        expect(stack.pop()).toBe(10);
        expect(stack.pop()).toBeUndefined();
    });

    it('should ignore duplicate pushes when deduplicate is true', () => {
        const stack = new StackSet<number>([1, 2]);
        stack.push(2).push(3).push(3);

        expect([...stack]).toEqual([1, 2, 3]);
        expect(stack.pop()).toBe(3);
        expect(stack.pop()).toBe(2);
    });
});
