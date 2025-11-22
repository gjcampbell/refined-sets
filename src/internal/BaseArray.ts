import { IArray, VOID } from './IArray';

export abstract class BaseArray<T> extends Array<T> implements IArray<T> {
    public abstract forwardIter(): IterableIterator<T>;
    public abstract reverseIter(): IterableIterator<T>;
    public abstract removeAt(index: number): T | typeof VOID;

    public constructor(initial?: Iterable<T>) {
        super();
        if (initial && typeof initial === 'object' && Symbol.iterator in initial) {
            for (const item of initial) {
                this.push(item);
            }
        }
    }

    public get size(): number {
        return this.length;
    }

    protected *internalFwdIter(startIdx: number = 0, stopIdx?: number, step: number = 1): IterableIterator<T> {
        stopIdx ??= this.length;
        for (let i = startIdx; i < stopIdx; i += step) {
            yield this[i];
        }
    }
    protected *internalRevIter(startIdx?: number, stopIdx: number = 0, step: number = -1): IterableIterator<T> {
        startIdx ??= this.length - 1;
        for (let i = startIdx; i >= stopIdx; i += step) {
            yield this[i];
        }
    }

    public clear() {
        this.splice(0, Infinity);
    }

    public getAt(index: number): T | typeof VOID {
        if (index < 0 || index >= this.length) {
            return VOID;
        }
        return this[index];
    }
}
