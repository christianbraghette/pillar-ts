import { Queue, EmptyStructureError } from "./collections";
import { Comparator, TriConsumer } from "./functional";
import { ArrayList } from "./list";
import { Throwable } from "./result";
import { Stream } from "./stream";

export class PriorityQueue<T> implements Queue<T> {
    #array = new ArrayList<T>();
    #compareFn: Comparator<T>;

    constructor(compareFn: Comparator<T>, iterable?: Iterable<T>) {
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

    public first(): Throwable<T, EmptyStructureError> {
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

            const last = this.#array.removeLast()!;
            if (index < this.size) {
                this.#array.set(index, last);
                this.#bubbleDown(index);
                this.#bubbleUp(index);
            }
        }
        return size - this.#array.size;
    }

    public remove(): Throwable<T, EmptyStructureError> {
        if (this.size === 0)
            throw new Error("PriorityQueue is empty");
        if (this.size === 1)
            return this.#array.removeLast();

        const top = this.#array.first();
        this.#array.set(0, this.#array.removeLast());
        this.#bubbleDown(0);

        return top;
    }

    #bubbleUp(index: number): void {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.#compareFn(this.#array.get(index), this.#array.get(parentIndex)) < 0) {
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

            if (left < this.size && this.#compareFn(this.#array.get(left), this.#array.get(smallest)) < 0) {
                smallest = left;
            }
            if (right < this.size && this.#compareFn(this.#array.get(right), this.#array.get(smallest)) < 0) {
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
        this.#array.set(i, this.#array.get(j));
        this.#array.set(j, aux);
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

    public stream(): Stream<T> {
        return Stream.from(this);
    }

    *[Symbol.iterator](): IterableIterator<T> {
        if (this.size === 0) return;

        const indexHeap: number[] = [0];

        const compareIndices = (i: number, j: number) => {
            return this.#compareFn(this.#array.get(indexHeap[i]), this.#array.get(indexHeap[j]));
        };

        while (indexHeap.length > 0) {
            // 1. Estraiamo la radice dell'indexHeap (contiene l'indice del valore minimo corrente)
            const currentIndex = indexHeap[0];

            // Fai lo yield del valore reale corrispondente
            yield this.#array.get(currentIndex);

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