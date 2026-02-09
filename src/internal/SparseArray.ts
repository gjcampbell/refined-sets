import { BaseArray } from './BaseArray';
import { IArray, VOID } from './IArray';

type Void = typeof VOID;

interface ISparseArray<T> extends IArray<T> {
    forwardIter(): IterableIterator<T>;
    forwardIter(yieldHoles: true): IterableIterator<T | Void>;
    reverseIter(): IterableIterator<T>;
    reverseIter(yieldHoles: true): IterableIterator<T | Void>;
    /** O(n) Removes holes by compacting the underlying array. Returns the number of removed holes. */
    compact(): number;
    /** remove *count* occurrences of *item* from the array and return the number of removed items. if no count is undefined, remove all occurrences */
    remove(item: T, count?: number): number;
}
interface ISparseArrayConstructor {
    new <T>(initial?: Iterable<T>): ISparseArray<T>;
}

class SparseArrayImpl<T> extends BaseArray<T | Void> implements ISparseArray<T> {
    private _size: number = 0;

    public constructor(initial?: Iterable<T>) {
        super();
        if (initial && typeof initial === 'object' && Symbol.iterator in initial) {
            for (const item of initial) {
                this.push(item);
            }
        }
    }

    public get size(): number {
        return this._size;
    }

    public push(...item: T[]): number {
        this._size += item.length;
        return super.push(...item);
    }

    public pop(): T | undefined {
        while (this.length > 0) {
            const result = super.pop();
            if (result !== VOID) {
                this._size--;
                return result as T;
            }
        }
        return undefined;
    }

    public removeAt(index: number): T | Void {
        const result = this.getAt(index);
        if (result !== VOID) {
            this[index] = VOID;
            this._size--;
        }
        return result;
    }

    public clear() {
        this.splice(0, Infinity);
        this._size = 0;
    }

    public compact(): number {
        if (this._size === this.length) {
            return 0;
        }

        let writeIdx = 0;
        for (let readIdx = 0; readIdx < this.length; readIdx++) {
            const item = this[readIdx];
            if (item !== VOID) {
                this[writeIdx++] = item;
            }
        }

        const removedHoles = this.length - this._size;
        this.length = this._size;
        return removedHoles;
    }

    public remove(item: T, count?: number): number {
        if (count !== undefined && count <= 0) {
            return 0;
        }

        let removed = 0;
        for (let i = 0; i < this.length; i++) {
            const current = this[i];
            if (current !== VOID && this.sameValueZero(current, item)) {
                this[i] = VOID;
                this._size--;
                removed++;
                if (count !== undefined && removed >= count) {
                    break;
                }
            }
        }

        return removed;
    }

    public forwardIter(): IterableIterator<T>;
    public forwardIter(yieldHoles: true): IterableIterator<T | Void>;
    public forwardIter(yieldHoles?: true): IterableIterator<T | Void> | IterableIterator<T> {
        return !yieldHoles ? this.filterHoles(this.internalFwdIter()) : this.internalFwdIter();
    }

    public reverseIter(): IterableIterator<T>;
    public reverseIter(yieldHoles: true): IterableIterator<T | Void>;
    public reverseIter(yieldHoles?: true): IterableIterator<T | Void> | IterableIterator<T> {
        return !yieldHoles ? this.filterHoles(this.internalRevIter()) : this.internalRevIter();
    }

    private *filterHoles(iter: IterableIterator<T | Void>): IterableIterator<T> {
        for (const item of iter) {
            if (item !== VOID) {
                yield item;
            }
        }
    }

    private sameValueZero(left: T | Void, right: T): boolean {
        return left === right || (left !== left && right !== right);
    }
}

/**
 * Array implementation that wraps native array and reimplements methods
 * that would normally be O(>1) so that they run in O(1) time complexity.
 */
export const SparseArray: ISparseArrayConstructor = SparseArrayImpl as any;
