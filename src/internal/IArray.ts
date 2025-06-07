interface INativeArraySubset<T> {
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
     * Returns an iterator that yields items in insertion order.
     * @returns {IterableIterator<T>} An iterator for the array.
     */
    forwardIter(): IterableIterator<T>;
    /**
     * Returns an iterator that yields items in reverse insertion order.
     * @returns {IterableIterator<T>} An iterator for the array.
     */
    reverseIter(): IterableIterator<T>;
    /**
     * O(n) Removes all items from the array.
     */
    clear(): void;
    /**
     * The number of items in the array.
     * @returns {number} The size of the array.
     */
    get size(): number;
}
