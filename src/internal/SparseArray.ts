import { RefinedSetsError } from '../errors/RefinedSetsError';
import { BaseArray } from './BaseArray';
import { IArray, VOID } from './IArray';

type Void = typeof VOID;

interface ISparseArray<T> extends IArray<T> {
    forwardIter(): IterableIterator<T>;
    forwardIter(yieldHoles: true): IterableIterator<T | Void>;
    reverseIter(): IterableIterator<T>;
    reverseIter(yieldHoles: true): IterableIterator<T | Void>;
    remove(item: T): boolean;
}
interface ISparseArrayConstructor {
    new <T>(initial?: Iterable<T>): ISparseArray<T>;
}

class SparseArrayImpl<T> extends BaseArray<T | Void> implements ISparseArray<T> {
    public get size(): number {
        return this.length;
    }

    public pop(): T | undefined {
        while (this.length > 0) {
            const result = super.pop();
            if (result !== VOID) {
                return result as T;
            }
        }
        return undefined;
    }

    public removeAt(index: number): T | Void {
        const result = this.getAt(index);
        this[index] = VOID;
        return result;
    }
    public clear() {
        this.splice(0, Infinity);
    }

    public remove(item: T) {
        let found = false;

        for (let i = 0; i < this.length; i++) {
            if (this[i] === item) {
                this[i] = VOID;
                found = true;
            }
        }

        return found;
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
}

/**
 * Array implementation that wraps native array and reimplements methods
 * that would normally be O(>1) so that they run in O(1) time complexity.
 */
export const SparseArray: ISparseArrayConstructor = SparseArrayImpl as any;
