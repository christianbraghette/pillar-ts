import { KeyNotFoundError } from "./collections";
import { TriConsumer } from "./functional";
import { HashMap, Map } from "./map";
import { Mutex, Lock } from "./mutex";
import { Throwable } from "./result";
import { Stream } from "./stream";

export class HashTable<K, V> {
    #map: HashMap<K, V>;
    #mutex = new Mutex();

    constructor (iterable?: Iterable<[K, V]>) {
        this.#map = new HashMap(iterable);
    }

    public async open(): Promise<HashTableAccessor<K, V>> {
        return new HashTableAccessor(this.#map, await this.#mutex.acquire());
    }
}

class HashTableAccessor<K, V> implements Map<K, V> {
    #map: HashMap<K, V>;
    #lock?: Lock;

    constructor(map: HashMap<K, V>, lock?: Lock) {
        this.#map = map;
        this.#lock = lock;
    }

    #check(): Throwable<void> {
        if (!this.#lock?.locked)
            throw new Error();
    }

    public close() {
        this.#lock?.release();
    }

    public get size(): number {
        this.#check();
        return this.#map.size;
    }

    public set(key: K, value: V): this {
        this.#check();
        this.#map.set(key, value);
        return this;
    }

    public add(...entries: [K, V][]): number {
        this.#check();
        return this.#map.add(...entries);
    }

    public get(key: K): Throwable<V, KeyNotFoundError> {
        this.#check();
        return this.#map.get(key);
    }

    public has(...keys: K[]): boolean {
        this.#check();
        return this.#map.has(...keys);
    }

    public delete(...keys: K[]): number {
        this.#check();
        return this.#map.delete(...keys);
    }

    public clear(): void {
        this.#check();
        return this.#map.clear();
    }

    public forEach(callbackfn: TriConsumer<V, K, this>): void {
        this.#check();
        return this.#map.forEach((value, key) => callbackfn(value, key, this));
    }

    public keys(): Stream<K> {
        this.#check();
        return this.#map.keys();
    }

    public values(): Stream<V> {
        this.#check();
        return this.#map.values();
    }

    public entries(): Stream<[K, V]> {
        this.#check();
        return this.#map.entries();
    }

    public [Symbol.iterator](): IterableIterator<[K, V]> {
        this.#check();
        return this.#map[Symbol.iterator]();
    }

    public get [Symbol.toStringTag](): string { return "HashTableAccessor" }
}