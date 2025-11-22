import { BaseArray } from './BaseArray';
import { VOID } from './IArray';

export class NativeArray<T> extends BaseArray<T> {
    public forwardIter(): IterableIterator<T> {
        return this.internalFwdIter();
    }
    public reverseIter(): IterableIterator<T> {
        return this.internalRevIter();
    }
    public removeAt(index: number): T | typeof VOID {
        const result = this.getAt(index);
        this.splice(index, 1);
        return result;
    }
}
