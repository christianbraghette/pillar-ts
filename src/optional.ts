import { Predicate, Supplier, Functional } from "./functional";
import { Throwable } from "./result";

class EmptyOptional extends Error {
    constructor() {
        super(`EmptyOptional`);
        this.name = "EmptyOptional";
    }
}

export class Optional<T> {
    #value?: T;
    #present: boolean;

    constructor(present: boolean, value?: T) {
        this.#present = present;
        this.#value = value;
    }

    public get(): Throwable<T, EmptyOptional> {
        if (!this.#present)
            throw new EmptyOptional();
        return this.#value!;
    }

    public ok(): boolean {
        return this.#present;
    }

    public or(other: T): T {
        if (this.#present)
            return this.#value!;
        return other;
    }

    public orGet(supplier: Supplier<T>): T {
        if (this.#present)
            return this.#value!;
        return supplier();
    }

    public orThrow<E extends Error>(error: E): Throwable<T, E> {
        if (this.#present)
            return this.#value!;
        throw error;
    }

    public filter(predicate: Predicate<T>): Optional<T> {
        if (this.#present && predicate(this.#value!))
            return this;
        return Optional.empty();
    }

    public map<S>(fn: Functional<T, S>): Optional<S> {
        if (this.#present) {
            return Optional.ofNullable(fn(this.#value!));
        }
        return Optional.empty();
    }

    public flatMap<S>(fn: Functional<T, Optional<S>>): Optional<S> {
        if (this.#present) {
            return fn(this.#value!);
        }
        return Optional.empty();
    }

    public static empty(): Optional<never> {
        return new Optional(false);
    }

    public static of<S>(value: S): Optional<S> {
        return new Optional(true, value);
    }

    public static ofNullable<S>(value: S): Optional<S> {
        return new Optional(value !== null && value !== undefined, value);
    }
}

