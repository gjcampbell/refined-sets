import { MultiItemMappedArray } from '../src/internal/IndexMap';
import { NativeArray } from '../src/internal/NativeArray';

describe('MultiItemMappedArray', () => {
    const createTestMap = () =>
        new MultiItemMappedArray<number, string>(
            (v) => v.length,
            () => new NativeArray<string>(),
            ['apple', 'banana', 'cherry', 'date'],
        );

    it('should correctly determine value presence', () => {
        const map = createTestMap();

        expect(map.containsKey(3)).toBe(false);
        expect(map.containsKey(4)).toBe(true);
        expect(map.containsKey(5)).toBe(true);
        expect(map.containsKey(6)).toBe(true);
        expect(map.containsKey(7)).toBe(false);
    });

    it('should correctly retrieve values by key', () => {
        const map = createTestMap();

        expect([...map.forwardIter(3)]).toEqual([]);
        expect([...map.forwardIter(4)]).toEqual(['date']);
        expect([...map.forwardIter(5)]).toEqual(['apple']);
        expect([...map.forwardIter(6)]).toEqual(['banana', 'cherry']);
        expect([...map.forwardIter(7)]).toEqual([]);
    });

    it('should correctly add and remove values', () => {
        const map = createTestMap();

        map.push('fig');
        expect([...map.forwardIter(3)]).toEqual(['fig']);

        map.removeByKey(3);
        expect([...map.forwardIter(3)]).toEqual([]);
    });

    it('should maintain correct size after operations', () => {
        const map = createTestMap();

        expect(map.size).toBe(4);
        map.push('grape');
        expect(map.size).toBe(5);
        map.removeByKey(5);
        expect(map.size).toBe(3);
        map.clear();
        expect(map.size).toBe(0);
    });
});
