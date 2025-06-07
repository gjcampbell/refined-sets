import { RefinedSetsError } from '../errors/RefinedSetsError';
import { BaseArray } from './BaseArray';
import { IArray } from './IArray';

/**
 * Unique placeholder used to mark logical deletions in the dense backing array.
 * A `Symbol` (rather than `null`) guarantees zero collision with user‑supplied
 * values and offers O(1) identity checks.
 */
const HOLE: unique symbol = Symbol('hole');
type THole = typeof HOLE;

interface ISparseArray<T> extends IArray<T | THole> {
    [index: number]: T | typeof HOLE | undefined;
    forwardIter(skipHoles?: true): IterableIterator<T>;
    reverseIter(skipHoles?: true): IterableIterator<T>;
}
interface ISparseArrayConstructor {
    new <T>(initial?: Iterable<T>): ISparseArray<T>;
}

class SparseArrayImpl<T> extends BaseArray<T | THole> implements ISparseArray<T> {
    public get size(): number {
        return this.length;
    }
    public *forwardIter(skipHoles?: true) {
        return this.switchIter(this.internalIter(), skipHoles);
    }
    public *reverseIter(skipHoles?: true) {
        return this.switchIter(this.internalIter(this.length - 1, 0, -1), skipHoles);
    }

    public clear() {
        this.splice(0, Infinity);
    }

    private *switchIter(
        iter: IterableIterator<T | THole>,
        skipHoles: undefined | true,
    ): typeof skipHoles extends true ? IterableIterator<T> : IterableIterator<T | THole> {
        if (!skipHoles) {
            return yield* iter;
        } else {
            for (const item of iter) {
                if (item !== HOLE) {
                    yield item;
                }
            }
        }
    }
}

export const SparseArray: ISparseArrayConstructor = SparseArrayImpl as any;
