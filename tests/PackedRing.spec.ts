import { IndexRing } from '../pkg/node/refined_sets_wasm';

describe('IndexRing (24-bit indices)', () => {
    test('basic push, get, and len', () => {
        const ring = new IndexRing(4); // capacity = 4 slots
        ring.push(0x010203);
        ring.push(0xffffff);
        ring.push(0x000001);

        expect(ring.len()).toBe(3);
        expect(ring.get(0)).toBe(0x010203);
        expect(ring.get(1)).toBe(0xffffff);
        expect(ring.get(2)).toBe(0x000001);
    });

    test('push all the numbers with a ring', () => {
        const max = Math.pow(2, 23) - 1; // max 24-bit value
        const ring = new IndexRing(4); // capacity = 4 slots
        for (let i = 0; i < max; i++) {
            ring.push(i);
        }
    });

    test('push all the numbers with an array', () => {
        const max = Math.pow(2, 24) - 1; // max 24-bit value
        const array: number[] = []; // capacity = 4 slots
        for (let i = 0; i < max; i++) {
            array.push(i);
        }
    });

    test('pop removes in FIFO order and adjusts len', () => {
        const ring = new IndexRing(4);
        ring.push(10);
        ring.push(20);
        ring.push(30);

        expect(ring.len()).toBe(3);
        expect(ring.pop()).toBe(10);
        expect(ring.len()).toBe(2);

        // remaining order: [20, 30]
        expect(ring.get(0)).toBe(20);
        expect(ring.get(1)).toBe(30);

        expect(ring.pop()).toBe(20);
        expect(ring.pop()).toBe(30);
        expect(ring.len()).toBe(0);
        expect(ring.pop()).toBeUndefined();
    });

    test('auto-resize when exceeding initial capacity', () => {
        const ring = new IndexRing(2); // capacity = 2 slots
        ring.push(1);
        ring.push(2);
        // next push should trigger a resize (e.g. capacity doubles)
        ring.push(3);

        expect(ring.len()).toBe(3);
        expect(ring.get(0)).toBe(1);
        expect(ring.get(1)).toBe(2);
        expect(ring.get(2)).toBe(3);

        // pop and push again to test wrap behavior
        expect(ring.pop()).toBe(1);
        expect(ring.len()).toBe(2);
        // now push a fourth value
        ring.push(4);
        expect(ring.len()).toBe(3);

        // expected sequence now: [2, 3, 4]
        expect(ring.get(0)).toBe(2);
        expect(ring.get(1)).toBe(3);
        expect(ring.get(2)).toBe(4);
    });
});
