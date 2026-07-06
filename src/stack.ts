import { Stack } from "./collections";
import { TriConsumer } from "./functional";
import { Throwable } from "./result";
import { Stream } from "./stream";
import { NativeSet } from "./native";

class StackNode {
    constructor(public next?: StackNode) { }
}

export class LinkedStack<T> implements Stack<T> {
    #data = new WeakMap<StackNode, T>();
    #head?: StackNode;
    #size = 0;

    constructor(iterable?: Iterable<T>) {
        for (const item of iterable ?? [])
            this.add(item);
    }

    public push(item: T): this {
        this.add(item);
        return this;
    }

    public pop(): Throwable<T> {
        return this.removeLast();
    }

    public get size(): number {
        return this.#size;
    }

    public add(...items: T[]): number {
        const initialSize = this.#size;
        for (const item of items) {
            const node = new StackNode(this.#head);
            this.#data.set(node, item);
            this.#head = node;
            this.#size++;
        }
        return this.#size - initialSize;
    }

    public has(...items: T[]): boolean {
        if (!this.#head || items.length === 0) return false;
        const targets = new NativeSet(items);
        for (const item of this) {
            if (targets.has(item)) {
                targets.delete(item);
            }
            if (targets.size === 0) return true;
        }
        return false;
    }

    public delete(...items: T[]): number {
        if (!this.#head || items.length === 0) return 0;
        const initialSize = this.#size;

        for (const itemToDelete of items) {
            let current: StackNode | undefined = this.#head;
            let previous: StackNode | undefined = undefined;

            while (current) {
                const currentData = this.#data.get(current);

                if (currentData === itemToDelete) {
                    if (previous) {
                        previous.next = current.next;
                    } else {
                        this.#head = current.next;
                    }

                    this.#data.delete(current);
                    this.#size--;
                    break;
                }

                previous = current;
                current = current.next;
            }
        }

        return initialSize - this.#size;
    }

    public removeLast(): Throwable<T> {
        if (!this.#head) throw new Error();
        const node = this.#head;
        this.#head = this.#head.next;
        this.#size--;
        const value = this.#data.get(node)!;
        this.#data.delete(node);
        return value;
    }

    public forEach(consumer: TriConsumer<T, number, this>): void {
        let i = 0;
        for (const item of this)
            consumer(item, i++, this);
    }

    public toArray(): T[] {
        return Array.from(this);
    }

    public clear(): void {
        while (this.#head) {
            const node = this.#head;
            this.#data.delete(node);
            this.#head = node.next;
            node.next = undefined;
        }
        this.#size = 0;
    }

    public stream(): Stream<T> {
        return new Stream(this);
    }

    public *[Symbol.iterator](): IterableIterator<T> {
        for (let node = this.#head; !!node; node = node.next)
            yield this.#data.get(node)!;
    }
}