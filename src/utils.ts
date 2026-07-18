import { SortedQueue } from "./collections";
import { Comparator, Functional, Supplier } from "./functional";
import { TreeList } from "./list";

export { Optional } from "./optional";
export { Result } from "./result";
export { Dictionary } from "./dictionary";
export * from "./functional";
export * from "./concurrence";


class IndexOutOfBound extends Error {
    constructor() {
        super("Index out of bound");
    }
}

export class Indexer {
    #maxIndex: number;
    #index = 0;
    #free: SortedQueue<number> = new TreeList<number>(Comparator.natural());

    constructor(max?: number) {
        if (!max || max > Number.MAX_SAFE_INTEGER)
            this.#maxIndex = Number.MAX_SAFE_INTEGER;
        else
            this.#maxIndex = max;
    }

    get(): Supplier<number> {
        const index = this.#free.remove().orGet(() => {
            if (this.#index < this.#maxIndex)
                return ++this.#index;
            else
                throw new IndexOutOfBound();
        });
        return () => index;
    }

    has(index: number): boolean {
        return (index <= this.#index && index > -1) || this.#free.has(index);
    }

    delete(index: number): boolean {
        if (index <= this.#index && index > -1){
            this.#free.add(index);
            return true;
        }
        return false;
    }

    max(): number {
        return this.#index;
    }
}

class StateLockedError extends Error {
    constructor() {
        super("The state is locked");
    }
}

export class Transaction<T, O = never> {
    #lastCommmit?: Transaction<O>;
    #source: T;
    #locked = false;

    constructor(obj: T) {
        this.#source = obj;
    }

    #getSource() {
        if (this.#locked)
            throw new StateLockedError();
        return this.#source;
    }

    #setLastCommit<S extends Transaction<any>>(state?: S): this {
        if (state)
            this.#lastCommmit = state;
        return this;
    }

    public get(): T {
        return this.#source;
    }

    public last(): O | undefined{
        return this.#lastCommmit?.get();
    }

    public map<S>(fn: Functional<T, S>): Transaction<S> {
        return new Transaction(fn(this.#getSource())).#setLastCommit(this.#lastCommmit);
    }

    public flatMap<S>(fn: Functional<T, S | Transaction<S>>): Transaction<S> {
        const mapped = fn(this.#getSource());
        return new Transaction(mapped instanceof Transaction ? mapped.get() : mapped).#setLastCommit(this.#lastCommmit);
    }

    public diff(): [T, O | undefined] {
        return [this.#source, this.#lastCommmit?.get()];
    }

    public commit(): Transaction<T> {
        return new Transaction(this.#source);
    }

    public rollbak(): Transaction<O> | undefined {
        return this.#lastCommmit;
    }
}