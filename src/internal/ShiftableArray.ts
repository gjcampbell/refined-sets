import { BaseArray } from './BaseArray';
import { IArray } from './IArray';

interface IShiftableArray<T> extends IArray<T> {
    /**
     * O(1) Get the first element of the array without removing it.
     * If the array is empty, returns the given `emptyResult`.
     * @param emptyResult Value to return if the array is empty.
     * @returns The first element or `emptyResult` if the array is empty.
     */
    head<TEmpty = undefined>(emptyResult?: TEmpty): T | TEmpty;
    /**
     * O(1) Removes the first element from the array and returns it.
     * If the array is empty, returns the given `emptyResult`.
     * @param emptyResult Value to return if the array is empty.
     * @returns The first element or `emptyResult` if the array is empty.
     */
    shift<TEmpty = undefined>(emptyResult?: TEmpty): T | TEmpty;
    /**
     * O(n) Clean up waste left by many shifts.
     * This is useful to reclaim memory after many shifts.
     * @returns The number of elements that were removed.
     */
    compact(): number;
}
interface IShiftableArrayConstructor {
    new <T>(initial?: Iterable<T>): IShiftableArray<T>;
}

class ShiftableArrayImpl<T> extends BaseArray<T> implements IShiftableArray<T> {
    private headIdx: number = 0;

    public get size(): number {
        return this.length - this.headIdx;
    }

    public pop(): T | undefined {
        return this.size > 0 ? super.pop() : undefined;
    }

    public head<TEmpty>(emptyResult?: TEmpty): T | TEmpty {
        return this.headIdx < this.length ? this[this.headIdx] : (emptyResult as T | TEmpty);
    }

    public shift<TEmpty>(emptyResult?: TEmpty): T | TEmpty {
        if (this.headIdx < this.length) {
            const result = this[this.headIdx];
            this[this.headIdx] = undefined as unknown as T;
            this.headIdx++;
            return result;
        } else {
            return emptyResult as T | TEmpty;
        }
    }

    public forwardIter(): IterableIterator<T> {
        return this.internalIter(this.headIdx);
    }

    public reverseIter(): IterableIterator<T> {
        return this.internalIter(this.length - 1, this.headIdx, -1);
    }

    public clear(): void {
        super.clear();
        this.headIdx = 0;
    }

    public compact(): number {
        const headSize = this.headIdx;
        if (headSize > 0) {
            this.splice(0, headSize);
            this.headIdx = 0;
        }
        return headSize;
    }
}

export const ShiftableArray: IShiftableArrayConstructor = ShiftableArrayImpl as unknown as IShiftableArrayConstructor;
