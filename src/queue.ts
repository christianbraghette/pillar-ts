import { Queue, Collection } from "./collections";
import { Comparator, Supplier, TriConsumer, TriFunctional } from "./functional";
import { ArrayList, LinkedList } from "./list";
import { IterableObject } from "./objects";
import { Optional } from "./optional";
import { Stream } from "./stream";

export class PriorityQueue<T> extends IterableObject<T> implements Queue<T> {
    #array = new ArrayList<T>();
    #compareFn: Comparator<T>;

    constructor(compareFn: Comparator<T>, iterable?: Iterable<T>) {
        super();
        this.#compareFn = compareFn;
        for (const data of iterable ?? [])
            this.add(data);
    }

    public comparator(): Comparator<T> {
        return this.#compareFn;
    };

    public get size() {
        return this.#array.size;
    }

    public first(): Optional<T> {
        return this.#array.first();
    }

    public add(...items: T[]): number {
        const size = this.#array.size;
        for (const item of items) {
            this.#array.add(item);
            this.#bubbleUp(this.size - 1);
        }
        return this.size - size;
    }

    public has(...items: T[]): boolean {
        return this.#array.has(...items);
    }

    public delete(...items: T[]): number {
        const size = this.#array.size;
        for (const item of items) {
            const index = this.#array.indexOf(item);
            if (index === -1) continue;

            const last = this.#array.removeLast().get();
            if (index < this.size) {
                this.#array.set(index, last);
                this.#bubbleDown(index);
                this.#bubbleUp(index);
            }
        }
        return size - this.#array.size;
    }

    public remove(): Optional<T> {
        if (this.size === 0)
            return Optional.empty();
        if (this.size === 1)
            return this.#array.removeLast();

        const top = this.#array.first();
        this.#array.set(0, this.#array.removeLast().get());
        this.#bubbleDown(0);

        return top;
    }

    #bubbleUp(index: number): void {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.#compareFn(this.#array.get(index).get(), this.#array.get(parentIndex).get()) < 0) {
                this.#swap(index, parentIndex);
                index = parentIndex;
            } else {
                break;
            }
        }
    }

    #bubbleDown(index: number): void {
        while (true) {
            let smallest = index;
            const left = 2 * index + 1;
            const right = 2 * index + 2;

            if (left < this.size && this.#compareFn(this.#array.get(left).get(), this.#array.get(smallest).get()) < 0) {
                smallest = left;
            }
            if (right < this.size && this.#compareFn(this.#array.get(right).get(), this.#array.get(smallest).get()) < 0) {
                smallest = right;
            }

            if (smallest !== index) {
                this.#swap(index, smallest);
                index = smallest;
            } else {
                break;
            }
        }
    }

    #swap(i: number, j: number): void {
        const aux = this.#array.get(i);
        this.#array.set(i, this.#array.get(j).get());
        this.#array.set(j, aux.get());
    }

    public clear(): void {
        this.#array = new ArrayList();
    }

    public forEach(consumer: TriConsumer<T, number, this>): void {
        let i = 0;
        for (const item of this) {
            consumer(item, i++, this);
        };
    }

    public toArray(): T[] {
        return Array.from(this);
    }

    public map<S>(fn: TriFunctional<T, number, this, S>): LinkedList<S> {
        const self = this;
        return new LinkedList(function* () {
            let i = 0;
            for (const value of self)
                yield fn(value, i++, self);
        }());
    }

    public flatMap<S>(fn: TriFunctional<T, number, this, S | Collection<S>>): LinkedList<S> {
        const self = this;
        return new LinkedList(function* () {
            let i = 0;
            for (const value of self.iterator()) {
                const result = fn(value, i++, self);
                if (result instanceof Collection)
                    yield* result.iterator();
                else
                    yield result;
            }
        }());
    }

    public pipe(): Supplier<this> {
        return () => this;
    }

    public stream(): Stream<T> {
        return Stream.from(this);
    }

    *[Symbol.iterator](): IterableIterator<T> {
        if (this.size === 0) return;

        const indexHeap: number[] = [0];

        const compareIndices = (i: number, j: number) => {
            return this.#compareFn(this.#array.get(indexHeap[i]).get(), this.#array.get(indexHeap[j]).get());
        };

        while (indexHeap.length > 0) {
            // 1. Estraiamo la radice dell'indexHeap (contiene l'indice del valore minimo corrente)
            const currentIndex = indexHeap[0];

            // Fai lo yield del valore reale corrispondente
            yield this.#array.get(currentIndex).get();

            // 2. Rimuoviamo la radice dall'indexHeap e riassestiamo (classico pop da heap)
            const lastIndex = indexHeap.pop()!;
            if (indexHeap.length > 0) {
                indexHeap[0] = lastIndex;

                // Bubble Down nell'indexHeap
                let idx = 0;
                while (true) {
                    let smallest = idx;
                    const left = 2 * idx + 1;
                    const right = 2 * idx + 2;

                    if (left < indexHeap.length && compareIndices(left, smallest) < 0) smallest = left;
                    if (right < indexHeap.length && compareIndices(right, smallest) < 0) smallest = right;

                    if (smallest !== idx) {
                        const temp = indexHeap[idx];
                        indexHeap[idx] = indexHeap[smallest];
                        indexHeap[smallest] = temp;
                        idx = smallest;
                    } else {
                        break;
                    }
                }
            }

            // 3. Generiamo i figli del nodo appena estratto nell'heap originale
            const leftChild = 2 * currentIndex + 1;
            const rightChild = 2 * currentIndex + 2;

            // Se i figli esistono nell'heap originale, inseriamo i loro indici nell'indexHeap
            for (const child of [leftChild, rightChild]) {
                if (child < this.size) {
                    indexHeap.push(child);

                    // Bubble Up nell'indexHeap
                    let idx = indexHeap.length - 1;
                    while (idx > 0) {
                        const parent = Math.floor((idx - 1) / 2);
                        if (compareIndices(idx, parent) < 0) {
                            const temp = indexHeap[idx];
                            indexHeap[idx] = indexHeap[parent];
                            indexHeap[parent] = temp;
                            idx = parent;
                        } else {
                            break;
                        }
                    }
                }
            }
        }
    }
}