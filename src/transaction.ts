import { Functional } from "./functional";

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