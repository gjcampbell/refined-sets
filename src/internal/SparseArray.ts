import { RefinedSetsError } from '../errors/RefinedSetsError';
import { BaseArray } from './BaseArray';
import { IArray, VOID } from './IArray';

type Void = typeof VOID;

interface ISparseArray<T> extends IArray<T | Void> {
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

export const SparseArray: ISparseArrayConstructor = SparseArrayImpl as any;
