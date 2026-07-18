import { Predicate, Supplier, Functional, } from "./functional";
import { FunctionalObject, IterableObject } from "./objects";
import { Throwable } from "./result";

class EmptyOptionalError extends Error {
    constructor() {
        super(`EmptyOptional`);
        this.name = "EmptyOptional";
    }
}

export function Some<T>(optional: Optional<T>): boolean {
    return optional.isSome();
}

export function None<T>(optional: Optional<T>): boolean {
    return optional.isNone();
}

export class Optional<T> extends IterableObject<T> implements FunctionalObject {
    #value?: T;
    #present: boolean;

    constructor(present: boolean, value?: T) {
        super();
        this.#present = present;
        this.#value = value;
    }

    public get(): Throwable<T, EmptyOptionalError> {
        if (!this.#present)
            throw new EmptyOptionalError();
        return this.#value!;
    }

    public isSome(): boolean {
        return this.#present;
    }

    public isNone(): boolean {
        return !this.#present;
    }

    public or<S>(other: S): S | T {
        if (this.#present)
            return this.#value!;
        return other;
    }

    public orGet<S>(supplier: Supplier<S>): S | T {
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
            return Optional.of(fn(this.#value!));
        }
        return Optional.empty();
    }

    public flatMap<S>(fn: Functional<T, S | Optional<S>>): Optional<S> {
        if (this.#present) {
            const value = fn(this.#value!);
            if (value instanceof Optional)
                return value
            else
                return new Optional(true, value);
        }
        return Optional.empty();
    }

    public pipe(): Supplier<T> {
        return () => this.orThrow(new Error("Optional is void"));
    }

    public *[Symbol.iterator](): IterableIterator<T> {
        if (this.#present)
            yield this.#value!;
    }

    public static empty(): Optional<never> {
        return new Optional(false);
    }

    public static of<S>(value: S): Optional<S> {
        return new Optional(true, value);
    }

    public static ofNullable<S>(value: S): Optional<NonNullable<S>> {
        return new Optional(value !== null && value !== undefined, value as NonNullable<S>);
    }
}

