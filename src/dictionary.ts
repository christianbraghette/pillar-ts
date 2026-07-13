import { KeyNotFoundError } from "./collections";
import { Stream } from "./stream";

export class Dictionary<T> {
    [key: string | number]: T;

    #data: Map<string, T>;

    constructor(iterable?: Iterable<[keyof any, T]>) {
        this.#data = new Map<string, T>(Stream.from(iterable ?? []).map(([key, value]) => [String(key), value]))
        return new Proxy(this, {
            get(target, prop) {
                if (typeof prop === 'symbol' && prop in target) {
                    const value = Reflect.get(target, prop, target);
                    if (typeof value === 'function') {
                        return value.bind(target);
                    }
                    return value;
                }

                if (!target.#data.has(prop as string)) {
                    throw new KeyNotFoundError(prop, Dictionary.name);
                }

                return target.#data.get(prop as string);
            },
            set(target, prop, value) {
                target.#data.set(prop as string, value);
                return true;
            },
            has(target, prop) {
                if (Reflect.has(target, prop)) {
                    return true;
                }
                return target.#data.has(prop as string);
            },
            ownKeys(target) {
                return Array.from(target.#data.keys());
            },
            getOwnPropertyDescriptor(target, prop) {
                if (target.#data.has(prop as string)) {
                    return {
                        enumerable: true,
                        configurable: true,
                        value: target.#data.get(prop as string)
                    };
                }
                return Reflect.getOwnPropertyDescriptor(target, prop);
            },
            deleteProperty(target, prop) {
                if (target.#data.has(prop as string)) {
                    return target.#data.delete(prop as string);
                }
                return Reflect.deleteProperty(target, prop);
            },
            defineProperty(target, prop, descriptor) {
                if ('value' in descriptor) {
                    target.#data.set(prop as string, descriptor.value);
                    return true;
                }
                return Reflect.defineProperty(target, prop, descriptor);
            }
        });
    }

    public [Symbol.iterator](): IterableIterator<[string, T]> {
        return this.#data.entries();
    }

    public get [Symbol.toStringTag](): string {
        return "Dictionary";
    }

    public static of<S>(obj: Record<keyof any, S>): Dictionary<S> {
        return new Dictionary(Object.entries(obj));
    }

    public static from<S>(iterable: Iterable<[keyof any, S]>): Dictionary<S> {
        return new Dictionary(iterable);
    }
}