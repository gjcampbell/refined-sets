import { MultiItemMappedArray } from '../src/internal/IndexMap';
import { VOID } from '../src/internal/IArray';
import { SparseArray } from '../src/internal/SparseArray';

describe('MultiItemMappedArray', () => {
    const createTestMap = () =>
        new MultiItemMappedArray<number, string>(
            (v) => v.length,
            () => new SparseArray<string>(),
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

    it('should iterate all values when no key is provided', () => {
        const map = createTestMap();

        expect([...map.forwardIter()]).toEqual(['apple', 'banana', 'cherry', 'date']);
        expect([...map.reverseIter()]).toEqual(['date', 'cherry', 'banana', 'apple']);
    });

    it('should correctly add and remove values', () => {
        const map = createTestMap();

        map.push('fig');
        expect([...map.forwardIter(3)]).toEqual(['fig']);

        map.removeByKey(3);
        expect([...map.forwardIter(3)]).toEqual([]);
    });

    it('should maintain correct key mappings after removeAt shifts indices', () => {
        const map = createTestMap();

        expect(map.removeAt(1)).toBe('banana');
        expect(map.size).toBe(3);

        expect([...map.forwardIter()]).toEqual(['apple', 'cherry', 'date']);
        expect([...map.forwardIter(6)]).toEqual(['cherry']);
        expect([...map.forwardIter(4)]).toEqual(['date']);
    });

    it('should maintain correct key mappings after removeByKey shifts indices', () => {
        const map = createTestMap();

        expect(map.removeByKey(6)).toEqual(['cherry', 'banana']);
        expect(map.size).toBe(2);

        expect([...map.forwardIter()]).toEqual(['apple', 'date']);
        expect([...map.forwardIter(5)]).toEqual(['apple']);
        expect([...map.forwardIter(4)]).toEqual(['date']);
        expect(map.containsKey(6)).toBe(false);
    });

    it('should remove only the specified index when both key and index are provided', () => {
        const map = createTestMap();

        expect(map.removeByKey(6, 2)).toBe('cherry');
        expect([...map.forwardIter(6)]).toEqual(['banana']);
        expect([...map.forwardIter()]).toEqual(['apple', 'banana', 'date']);
    });

    it('should do nothing when removeByKey is called with the wrong index', () => {
        const map = createTestMap();

        expect(map.removeByKey(4, 0)).toBe(VOID);
        expect(map.size).toBe(4);
        expect([...map.forwardIter()]).toEqual(['apple', 'banana', 'cherry', 'date']);
    });

    it('should pop the last value and remove its key when it was the last entry for that key', () => {
        const map = createTestMap();

        expect(map.pop()).toBe('date');
        expect(map.size).toBe(3);
        expect(map.containsKey(4)).toBe(false);
        expect([...map.forwardIter(4)]).toEqual([]);
        expect([...map.forwardIter()]).toEqual(['apple', 'banana', 'cherry']);
    });

    it('should delete the key when the last item for that key is removed by index', () => {
        const map = createTestMap();

        expect(map.removeByKey(4, 3)).toBe('date');
        expect(map.containsKey(4)).toBe(false);
        expect([...map.forwardIter(4)]).toEqual([]);
        expect(map.size).toBe(3);
    });

    it('should pop past trailing holes', () => {
        const map = createTestMap();

        expect(map.removeAt(3)).toBe('date');
        expect(map.size).toBe(3);

        expect(map.pop()).toBe('cherry');
        expect(map.size).toBe(2);
        expect([...map.forwardIter()]).toEqual(['apple', 'banana']);
    });

    it('should index new items by storage index, not logical size', () => {
        const map = createTestMap();

        expect(map.removeAt(1)).toBe('banana');
        expect(map.size).toBe(3);

        map.push('fig');
        expect(map.size).toBe(4);
        expect([...map.forwardIter(3)]).toEqual(['fig']);
        expect([...map.forwardIter()]).toEqual(['apple', 'cherry', 'date', 'fig']);
    });

    it('should rebuild and clear correctly', () => {
        const map = createTestMap();

        map.rebuild(['a', 'bb', 'cc', 'ddd']);
        expect(map.size).toBe(4);
        expect([...map.forwardIter(2)]).toEqual(['bb', 'cc']);

        map.clear();
        expect(map.size).toBe(0);
        expect([...map.forwardIter()]).toEqual([]);
        expect(map.containsKey(1)).toBe(false);
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
