import type { LazyIterable } from '../../iterable/LazyIterable';
import { aggregatePrototypeMethods } from './aggregate';
import { createStaticMethods } from './create';
import { interopPrototypeMethods } from './interop';
import { queryPrototypeMethods } from './query';
import { setAlgebraPrototypeMethods } from './setAlgebra';
import { transformPrototypeMethods } from './transform';

const APPLIED = Symbol('refinedsets.lazy.operations.applied');

type MethodMap = Record<PropertyKey, (...args: any[]) => unknown>;

function defineMethods(target: object, methods: MethodMap): void {
    for (const key of Reflect.ownKeys(methods)) {
        const method = methods[key];
        Object.defineProperty(target, key, {
            value: method,
            configurable: true,
            writable: true,
        });
    }
}

export function applyLazyIterableOperations(LazyIterableCtor: typeof LazyIterable): void {
    const ctor = LazyIterableCtor as typeof LazyIterable & { [APPLIED]?: boolean };
    if (ctor[APPLIED]) {
        return;
    }

    defineMethods(LazyIterableCtor.prototype, interopPrototypeMethods);
    defineMethods(LazyIterableCtor, createStaticMethods);
    defineMethods(LazyIterableCtor.prototype, transformPrototypeMethods);
    defineMethods(LazyIterableCtor.prototype, setAlgebraPrototypeMethods);
    defineMethods(LazyIterableCtor.prototype, queryPrototypeMethods);
    defineMethods(LazyIterableCtor.prototype, aggregatePrototypeMethods);

    Object.defineProperty(ctor, APPLIED, {
        value: true,
        configurable: false,
        enumerable: false,
        writable: false,
    });
}
