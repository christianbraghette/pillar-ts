import { Stream } from "./stream";

class KeyNotFoundError extends Error {
    constructor(key: string | number | symbol, structure: string) {
        super(`Key '${String(key)}' does not exist in '${structure}'.`);
        this.name = "KeyNotFoundError";
    }
}

export class Dictionary<T> {
    [key: string | number]: T;

    #data: { [key: string]: T };

    constructor(iterable?: Iterable<[keyof any, T]>) {
        this.#data = Object.fromEntries(Stream.from(iterable ?? []).map(([key, value]) => [String(key), value]))
        return new Proxy(this, {
            get(target, prop) {
                if (typeof prop === 'symbol' && prop in target) {
                    const value = Reflect.get(target, prop, target);
                    if (typeof value === 'function') {
                        return value.bind(target);
                    }
                    return value;
                }

                if (!(prop in target.#data)) {
                    throw new KeyNotFoundError(prop, Dictionary.name);
                }

                return target.#data[prop as string];
            },
            set(target, prop, value) {
                target.#data[prop as string] = value;
                return true;
            },
            has(target, prop) {
                if (Reflect.has(target, prop)) {
                    return true;
                }
                return prop in target.#data;
            },
            ownKeys(target) {
                return Object.getOwnPropertyNames(target.#data);
            },
            getOwnPropertyDescriptor(target, prop) {
                if (prop in target.#data) {
                    return {
                        enumerable: true,
                        configurable: true,
                        value: target.#data[prop as string]
                    };
                }
                return Reflect.getOwnPropertyDescriptor(target, prop);
            },
            deleteProperty(target, prop) {
                if (prop in target.#data) {
                    return delete target.#data[prop as string];
                }
                return Reflect.deleteProperty(target, prop);
            },
            defineProperty(target, prop, descriptor) {
                if ('value' in descriptor) {
                    target.#data[prop as string] = descriptor.value;
                    return true;
                }
                return Reflect.defineProperty(target, prop, descriptor);
            }
        });
    }

    public [Symbol.iterator](): IterableIterator<[string, T]> {
        return Object.entries(this.#data)[Symbol.iterator]();
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