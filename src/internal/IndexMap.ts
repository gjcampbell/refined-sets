import { RefinedSetsError } from '../errors/RefinedSetsError';
import { IArray, IMaterializedIterator, VOID } from './IArray';
import { SparseArray } from './SparseArray';

interface IKeyExtractor<V, K> {
    (value: V): K;
}

export interface IMapArray<K, V> extends IArray<V> {
    containsKey(key: K): boolean;
    containsValue(value: V): boolean;
    removeByKey(key: K, index?: number, count?: number): V[] | V | typeof VOID;
    rebuild(items: Iterable<V>): void;
    forwardIter(key?: K): IterableIterator<V>;
    reverseIter(key?: K): IterableIterator<V>;
    get keyExtractor(): IKeyExtractor<V, K>;
}

interface IKeyIndices extends IMaterializedIterator<number> {
    /**
     * O(1) Adds an index to the set of indices.
     */
    add(index: number): void;
    /**
     * Removes an index from the set of indices.
     * O(?) Time complexity is implementation-specific
     * @returns {number} Number of removed indices.
     */
    remove(index: number): number;
    /**
     * O(1) The number of indices in the set.
     */
    get size(): number;
}

class SparseArrayKeyIndices extends SparseArray<number> implements IKeyIndices {
    public add(index: number): void {
        this.push(index);
    }

    public isEmpty(): boolean {
        return this.size === 0;
    }
}

export class MultiItemMappedArray<K, V> implements IMapArray<K, V> {
    private readonly valueArrayCtor: () => IArray<V>;
    private readonly indexArrayCtor: () => IKeyIndices;
    private readonly indexMap = new Map<K, IKeyIndices>();

    private values: IArray<V>;
    private _size: number = 0;
    private _holeCount: number = 0;

    private get storageLength(): number {
        return (this.values as unknown as { length: number }).length;
    }

    private isIndexSetEmpty(indexSet: IKeyIndices): boolean {
        return indexSet.forwardIter().next().done === true;
    }

    public get size(): number {
        return this._size;
    }
    public get holeCount(): number {
        return this._holeCount;
    }

    public readonly keyExtractor: IKeyExtractor<V, K>;

    constructor(keyExtractor: IKeyExtractor<V, K>, valueArrayCtor: () => IArray<V>, initialValues?: Iterable<V>, indexArrayCtor?: () => IKeyIndices) {
        this.keyExtractor = keyExtractor;
        this.valueArrayCtor = valueArrayCtor;
        this.values = this.valueArrayCtor();
        this.indexArrayCtor = indexArrayCtor ?? (() => new SparseArrayKeyIndices());
        if (initialValues) {
            this.rebuild(initialValues);
        }
    }

    public clear(): void {
        this.values = this.valueArrayCtor();
        this.indexMap.clear();
        this._size = 0;
        this._holeCount = 0;
    }
    public removeAt(index: number): V | typeof VOID {
        const value = this.values.getAt(index);
        if (value !== VOID) {
            const key = this.keyExtractor(value);
            return this.removeByKey(key, index, 1);
        }
        return value;
    }

    public removeByKey(key: K): V[];
    public removeByKey(key: K, index: number): V | typeof VOID;
    public removeByKey(key: K, index: number, count: number): V | typeof VOID;
    public removeByKey(key: K, index: undefined, count: number): V[];
    public removeByKey(key: K, index?: number, count?: number) {
        const indexSet = this.indexMap.get(key);
        if (index !== undefined) {
            let result: V | typeof VOID = VOID;
            if (indexSet && indexSet.remove(index) > 0 && (count === undefined || count > 0)) {
                result = this.values.removeAt(index);
                if (result !== VOID) {
                    this._size--;
                    this._holeCount++;
                    if (this.isIndexSetEmpty(indexSet)) {
                        this.indexMap.delete(key);
                    }
                }
            }
            return result;
        } else {
            return this.removeByKeyInternal(key, indexSet, count);
        }
    }

    private removeByKeyInternal(key: K, indexSet: undefined | IKeyIndices, count?: number) {
        const result: V[] = [];
        if (!indexSet) {
            return result;
        }

        const limit = count === undefined ? Number.POSITIVE_INFINITY : Math.max(0, count);
        if (limit === 0) {
            return result;
        }

        for (const idx of indexSet.reverseIter()) {
            if (result.length >= limit) {
                break;
            }
            if (indexSet.remove(idx) <= 0) {
                continue;
            }

            const value = this.values.removeAt(idx);
            if (value !== VOID) {
                result.push(value);
                this._size--;
                this._holeCount++;
            }
        }
        if (this.isIndexSetEmpty(indexSet)) {
            this.indexMap.delete(key);
        }
        return result;
    }

    public getAt(index: number): V | typeof VOID {
        return this.values.getAt(index);
    }

    public push(...item: V[]): number {
        for (const value of item) {
            this.addToIndexSet(value, this.storageLength);
            this.values.push(value);
            this._size++;
        }
        return this._size;
    }

    public pop(): V | undefined {
        if (this._size === 0) {
            return undefined;
        }

        const previousStorageLength = this.storageLength;
        const value = this.values.pop() as V | typeof VOID | undefined;
        if (value === undefined || value === VOID) {
            return undefined;
        }

        const removedStorageSlots = previousStorageLength - this.storageLength;
        if (removedStorageSlots > 1) {
            this._holeCount = Math.max(0, this._holeCount - (removedStorageSlots - 1));
        }

        const key = this.keyExtractor(value);
        const indexSet = this.indexMap.get(key);
        if (indexSet) {
            indexSet.remove(this.storageLength);
            if (this.isIndexSetEmpty(indexSet)) {
                this.indexMap.delete(key);
            }
        }
        this._size--;
        return value;
    }

    public containsKey(key: K): boolean {
        return this.indexMap.has(key);
    }
    public containsValue(value: V): boolean {
        const key = this.keyExtractor(value);
        return this.containsKey(key);
    }

    public rebuild(items: Iterable<V>) {
        this.values = this.valueArrayCtor();
        this.indexMap.clear();
        let idx = 0;
        for (const item of items) {
            this.addToIndexSet(item, idx++);
            this.values.push(item);
        }
        this._size = this.values.size;
        this._holeCount = 0;
    }

    public compact(): number {
        const removedHoles = this.holeCount;
        if (removedHoles <= 0) {
            return 0;
        }

        const snapshot = Array.from(this.forwardIter());
        this.rebuild(snapshot);
        return removedHoles;
    }

    private addToIndexSet(value: V, idx: number) {
        const key = this.keyExtractor(value);
        let indexSet = this.indexMap.get(key);
        if (!indexSet) {
            this.indexMap.set(key, (indexSet = this.indexArrayCtor()));
        }
        indexSet.add(idx);
    }

    public forwardIter(key?: K): IterableIterator<V> {
        return this.switchIter(false, arguments.length > 0, key);
    }

    public reverseIter(key?: K): IterableIterator<V> {
        return this.switchIter(true, arguments.length > 0, key);
    }

    private *switchIter(reverse: boolean, keyPassed: boolean, key?: K) {
        if (!keyPassed) {
            yield* reverse ? this.values.reverseIter() : this.values.forwardIter();
        } else {
            const indices = this.indexMap.get(key!);
            if (indices) {
                const idxIter = reverse ? indices.reverseIter() : indices.forwardIter();
                for (const idx of idxIter) {
                    const result = this.values.getAt(idx);
                    if (result !== VOID) {
                        yield result;
                    }
                }
            }
        }
    }
}
