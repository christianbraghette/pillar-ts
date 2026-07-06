import { Consumer, Executor, Predicate, Supplier, Functional } from "./functional";
import { Optional } from "./optional";

export type Throwable<T, E extends Error = Error> = T & { readonly __error?: E };
export type Try<T> = T extends Throwable<infer U> ? U : T;
export type Catch<T> = T extends Throwable<any, infer E> ? E : T;

export class Result<T, E extends Error = Error> {
    #value: Optional<T>;
    #error: E;

    constructor(value: Optional<T>, error: E = new Error("Throwed result") as E) {
        this.#value = value;
        this.#error = error;
    }

    public get(): Throwable<T, E> {
        if (!this.#value.ok())
            throw this.#error;
        return this.#value.orThrow(this.#error);
    }

    public ok(): boolean {
        return this.#value.ok();
    }

    public catch(catcher: Consumer<E>): this {
        if (!this.#value.ok())
            catcher(this.#error!);
        return this;
    }

    public then(consumer: Consumer<T>): this {
        if (this.#value.ok())
            consumer(this.#value.get());
        return this;
    }

    public throw(): Throwable<void, E> {
        if (!this.#value.ok())
            throw this.#error;
    };

    public finally(executor: Executor): void {
        executor();
    }

    public or(other: T): T {
        return this.#value.or(other);
    }

    public orGet(supplier: Supplier<T>): T {
        return this.#value.orGet(supplier);
    }

    public orThrow<E extends Error>(error: E): Throwable<T, E> {
        return this.#value.orThrow(error);
    }

    public filter(predicate: Predicate<T>): Result<T, E> {
        return new Result(this.#value.filter(predicate), this.#error);
    }

    public map<S>(fn: Functional<T, S>): Result<S, E> {
        return new Result(this.#value.map(fn), this.#error);
    }

    public flatMap<S, M extends Error>(fn: Functional<T, Result<S, M>>): Result<S, E | M> {
        if (this.#value.ok())
            return fn(this.#value.get());
        return Result.empty(this.#error);

    }

    public static empty<M extends Error = Error>(error?: M): Result<never, M> {
        return new Result(Optional.empty(), error);
    }

    public static of<T extends Throwable<any>>(supplier: Supplier<T>): Result<Try<T>, Catch<T>> {
        try {
            return new Result(new Optional(true, supplier() as Try<T>));
        } catch (error) {
            return Result.empty(error as Catch<T>);
        }
    }
}