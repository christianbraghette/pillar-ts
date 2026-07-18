import { Consumer, Executor, Predicate, Supplier, Functional } from "./functional";
import { FunctionalObject, IterableObject } from "./objects";
import { Optional } from "./optional";

export type Throwable<T, E extends Error = Error> = T & { readonly __error?: E };
export type Try<T> = T extends Throwable<infer U> ? U : T;
export type Catch<T> = T extends Throwable<any, infer E> ? E : never;

export class Result<T extends Throwable<any>> extends IterableObject<Try<T>> implements FunctionalObject {
    #value: Optional<Try<T>>;
    #error: Catch<T>;

    constructor(supplier: Supplier<T>) {
        super();
        try {
            this.#value = Optional.of(supplier() as Try<T>);
            this.#error = new Error("Result is empty without an explicit error") as any;
        } catch (error) {
            this.#value = Optional.empty();
            this.#error = error as Catch<T>;
        }
    }

    static #createRaw<T extends Throwable<any>>(value: Optional<Try<T>>, error?: Catch<T>): Result<T> {
        const result = Object.create(Result.prototype);
        result.#value = value;
        result.#error = error;
        return result;
    }

    public get(): T {
        const fallbackError = this.#error as any;
        return this.#value.orThrow(fallbackError) as T;
    }

    public ok(): boolean {
        return this.#value.isSome();
    }

    public catch(catcher: Consumer<Catch<T>>): this {
        if (!this.#value.isSome()) {
            catcher(this.#error ?? (new Error("Unknown error") as Catch<T>));
        }
        return this;
    }

    public then(consumer: Consumer<Try<T>>): this {
        if (this.#value.isSome()) {
            consumer(this.#value.get());
        }
        return this;
    }

    // Ora restituisce "this" per non interrompere la catena funzionale
    public finally(executor: Executor): this {
        executor();
        return this;
    }

    public or(other: Try<T>): Try<T> {
        return this.#value.or(other);
    }

    public orGet(supplier: Supplier<Try<T>>): Try<T> {
        return this.#value.orGet(supplier);
    }

    public orThrow<E extends Error>(error: E): Throwable<Try<T>, E> {
        return this.#value.orThrow(error);
    }

    public filter(predicate: Predicate<Try<T>>): Result<T> {
        if (!this.#value.isSome()) {
            return this;
        }
        const filteredValue = this.#value.filter(predicate);
        if (!filteredValue.isSome()) {
            const filterError = new Error("Value did not match predicate") as Catch<T>;
            return Result.#createRaw<T>(Optional.empty(), filterError);
        }
        return this;
    }

    public map<S>(fn: Functional<Try<T>, S>): Result<Throwable<Try<S>, Catch<T>>> {
        if (!this.#value.isSome()) {
            // Short-circuit: restituiamo un nuovo Result fallito istantaneamente
            return Result.#createRaw<any>(Optional.empty(), this.#error);
        }
        try {
            const mapped = fn(this.#value.get());
            return Result.#createRaw<any>(Optional.of(mapped), undefined);
        } catch (error) {
            return Result.#createRaw<any>(Optional.empty(), error as any);
        }
    }

    public flatMap<S extends Throwable<any>>(fn: Functional<Try<T>, S | Result<S>>): Result<Throwable<Try<S>, Catch<S> | Catch<T>>> {
        if (!this.#value.isSome()) {
            return Result.#createRaw<any>(Optional.empty(), this.#error);
        }
        try {
            const mapped = fn(this.#value.get());
            if (mapped instanceof Result) {
                return mapped as any;
            }
            return Result.#createRaw<any>(Optional.of(mapped), undefined);
        } catch (error) {
            return Result.#createRaw<any>(Optional.empty(), error as any);
        }
    }

    public pipe(): Supplier<this> {
        return () => this;
    }

    public [Symbol.iterator](): IterableIterator<Try<T>> {
        return this.#value.iterator();
    }

    public static empty<M extends Error = Error>(error: M): Result<Throwable<never, M>> {
        return Result.#createRaw<any>(Optional.empty(), error) as any;
    }

    public static of<T extends Throwable<any>>(supplier: Supplier<T>): Result<T> {
        return new Result(supplier);
    }
}