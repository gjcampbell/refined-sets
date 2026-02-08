export const VOID = Symbol('Void');

export interface IMaterializedIterator<T> {
    /**
     * Returns an iterator that yields items in insertion order.
     * @returns {IterableIterator<T>} An iterator for the array.
     */
    forwardIter(): IterableIterator<T>;
    /**
     * Returns an iterator that yields items in reverse insertion order.
     * @returns {IterableIterator<T>} An iterator for the array.
     */
    reverseIter(): IterableIterator<T>;
}

/**
 * Wrapper for native array that only exposes O(1) methods and properties
 */
interface INativeArraySubset<T> extends IMaterializedIterator<T> {
    /**
     * O(~m) Adds items to the end of the array.
     * @param item Items to add.
     * @returns {number} The new length of the array.
     */
    push(...item: T[]): number;
    /**
     * O(1) Removes the last item from the array and returns it.
     * @returns {T | undefined} The removed item or `undefined` if the array is empty.
     */
    pop(): T | undefined;
}

/**
 * Array interface exposing only O(1) and methods intended for internal implementation.
 * This interface is not intended for public use.
 */
export interface IArray<T> extends INativeArraySubset<T> {
    /**
     * O(n) Removes all items from the array.
     */
    clear(): void;
    /**
     * The number of items in the array.
     * @returns {number} The size of the array.
     */
    get size(): number;
    /**
     * Remove the item at the specified index.
     * O(?) Time complexity is implementation-specific
     * @returns {number} The length of the array.
     */
    removeAt(index: number): T | typeof VOID;
    /**
     * Access an item by index.
     */
    getAt(index: number): T | typeof VOID;
}
