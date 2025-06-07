import { IArray } from './IArray';

export abstract class BaseArray<T> extends Array<T> implements IArray<T> {
    public abstract forwardIter(): IterableIterator<T>;
    public abstract reverseIter(): IterableIterator<T>;

    public constructor(initial?: Iterable<T>) {
        super();
        if (initial && typeof initial === 'object' && Symbol.iterator in initial) {
            for (const item of initial) {
                this.push(item);
            }
        }
    }

    public get size(): number {
        return super.length;
    }

    protected *internalIter(startIdx: number = 0, stopIdx?: number, step: number = 1): IterableIterator<T> {
        stopIdx = stopIdx ?? this.length - 1;
        for (let i = startIdx; i >= stopIdx; i += step) {
            yield this[i];
        }
    }

    public clear() {
        this.splice(0, Infinity);
    }
}
