import { Comparator, TriConsumer } from "./functional";
import { Throwable } from "./result";
import { Stream } from "./stream";

export class KeyNotFoundError extends Error {
    constructor(key: string | number | symbol, structure: string) {
        super(`Key '${String(key)}' does not exist in '${structure}'.`);
        this.name = "KeyNotFoundError";
    }
}

export class ValueNotFoundError<T> extends Error {
    constructor(value: T, structure: string) {
        super(`Value '${String(value)}' does not exist in '${structure}'.`);
        this.name = "ValueNotFoundError";
    }
}

export abstract class Collection<T> implements Iterable<T> {
    abstract readonly size: number;

    abstract add(...items: T[]): number;
    abstract has(...items: T[]): boolean;
    abstract delete(...items: T[]): number;
    abstract forEach(consumer: TriConsumer<T, number, this>): void;
    abstract toArray(): T[];

    abstract clear(): void;
    abstract stream(): Stream<T>;

    abstract [Symbol.iterator](): IterableIterator<T>;
}

export abstract class List<T> extends Collection<T> {
    abstract get(index: number): Throwable<T, ValueNotFoundError<T>>;
    abstract set(index: number, item: T): boolean;
    abstract indexOf(item: T, fromIndex?: number): number;
    abstract lastIndexOf(item: T, fromIndex?: number): number;
    abstract slice(start?: number, end?: number): List<T>;
    abstract splice(start: number, deleteCount?: number, ...items: T[]): List<T>;
    abstract sort(comparator: Comparator<T>): this;
    abstract toSortedList(comparator: Comparator<T>): SortedList<T>;
}

export abstract class SortedList<T> extends Collection<T> {
    abstract get(index: number): Throwable<T, ValueNotFoundError<T>>;
    abstract indexOf(item: T, fromIndex?: number): number;
    abstract lastIndexOf(item: T, fromIndex?: number): number;
    abstract first(): Throwable<T>;
    abstract last(): Throwable<T>;
    abstract comparator(): Comparator<T>;
    abstract head(item: T): SortedList<T>;
    abstract tail(item: T): SortedList<T>;
    abstract slice(start?: number, end?: number): SortedList<T>;
    abstract toList(): List<T>;
}

export interface Queue<T> extends Collection<T> {
    first(): Throwable<T>;
    remove(): Throwable<T>;
}

export interface Deque<T> extends Queue<T> {
    last(): Throwable<T>;
    addFirst(...items: T[]): number;
    removeLast(): Throwable<T>;
}

export interface Stack<T> extends Collection<T> {
    removeLast(): Throwable<T>;
}

export abstract class Set<T> extends Collection<T> {
    abstract union(other: Set<T>): Set<T>;
    abstract intersection(other: Set<T>): Set<T>;
    abstract difference(other: Set<T>): Set<T>
    abstract isSubsetOf(other: Set<T>): boolean
}

export abstract class SortedSet<T> extends Set<T> {
    abstract first(): Throwable<T>;
    abstract last(): Throwable<T>;
    abstract comparator(): Comparator<T>;
    abstract head(item: T): SortedSet<T>;
    abstract tail(item: T): SortedSet<T>;
    abstract slice(fromKey: T, toKey: T): SortedSet<T>;
}

export { LinkedList, ArrayList, SortedLinkedList } from "./list";
export { PriorityQueue } from "./queue";
export { HashSet, TreeSet } from "./set";
export { LinkedStack } from "./stack";