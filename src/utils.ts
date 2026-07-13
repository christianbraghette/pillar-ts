import { SortedQueue } from "./collections";
import { Comparator, Supplier } from "./functional";
import { TreeList } from "./list";
import { Result } from "./result";

export { Optional } from "./optional";
export { Result } from "./result";
export { Dictionary } from "./dictionary";
export { BitSet } from "./bitset";
export * from "./functional";


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
        const index = Result.of(() => this.#free.remove()).orGet(() => {
            if (this.#index < this.#maxIndex)
                return ++this.#index;
            else
                throw new IndexOutOfBound()
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

    free(): number {
        try {
            return this.#free.first();
        } catch {
            return this.#index + 1;
        }
    }
}