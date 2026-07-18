import { Comparator, Supplier, TriConsumer, TriFunctional } from "./functional";
import { Stream } from "./stream";
import { NativeMap } from "./native";
import { FunctionalObject, IterableObject } from "./objects";
import { Optional } from "./optional";
import { ArrayList, Stack } from "./collections";

export abstract class Map<K, V> extends IterableObject<[K, V]> implements FunctionalObject {
    abstract readonly size: number;

    abstract clear(): void;
    abstract set(key: K, value: V): this;
    abstract add(...entries: [K, V][]): number;
    abstract has(...keys: K[]): boolean;
    abstract delete(...keys: K[]): number;
    abstract get(key: K): Optional<V>;
    abstract forEach(consumer: TriConsumer<V, K, this>): void;

    abstract keys(): Stream<K>
    abstract values(): Stream<V>;
    abstract entries(): Stream<[K, V]>

    public pipe(): Supplier<this> {
        return () => this;
    }

    abstract map<S>(fn: TriFunctional<V, K, this, S>): Map<K, S>;
    abstract flatMap<S>(fn: TriFunctional<V, K, this, S | Map<K, S>>): Map<K, S>

    abstract [Symbol.iterator](): IterableIterator<[K, V]>;
}

export abstract class SortedMap<K, V> extends Map<K, V> {
    abstract first(): Optional<K>;
    abstract last(): Optional<K>;
    abstract comparator(): Comparator<K>;
    abstract head(key: K): SortedMap<K, V>;
    abstract tail(key: K): SortedMap<K, V>;
    abstract slice(fromKey: K, toKey: K): SortedMap<K, V>;
}

export class HashMap<K, V> extends Map<K, V> {
    #map: NativeMap<K, V>;

    /**
     * @param iterable An optional iterable of key-value pairs to initialize the map.
     */
    constructor(iterable?: Iterable<[K, V]>) {
        super();
        this.#map = new NativeMap(iterable);
    }

    /**
     * Gets the number of elements in the map.
     */
    get size(): number {
        return this.#map.size;
    }

    /**
     * Adds or updates an element with a specified key and value.
     * @param key The key of the element to add.
     * @param value The value of the element to add.
     * @returns The HashMap instance for method chaining.
     */
    public set(key: K, value: V): this {
        this.#map.set(key, value);
        return this;
    }

    public add(...entries: [K, V][]): number {
        const size = this.#map.size;
        for (const [key, value] of entries)
            this.#map.set(key, value);
        return this.#map.size - size;
    }

    /**
     * Returns a specified element from the map.
     * @param key The key of the element to return.
     * @returns The element associated with the specified key, or undefined if not found.
     */
    public get(key: K): Optional<V> {
        if (!this.#map.has(key))
            return Optional.empty()
        return Optional.of(this.#map.get(key)!);
    }

    /**
     * Returns a boolean indicating whether an element with the specified key exists or not.
     * @param key The key to test for presence.
     */
    public has(...keys: K[]): boolean {
        if (keys.length === 0) return false;
        for (const key of keys)
            if (!this.#map.has(key))
                return false;
        return true;
    }

    /**
     * Removes the specified element from the map.
     * @param key The key of the element to remove.
     * @returns true if the element existed and was removed; false otherwise.
     */
    public delete(...keys: K[]): number {
        const size = this.#map.size;
        for (const key of keys)
            this.#map.delete(key)
        return size - this.#map.size;
    }

    /**
     * Removes all elements from the map.
     */
    public clear(): void {
        this.#map.clear();
    }

    /**
     * Executes a provided function once per each key/value pair in the map.
     * @param callbackfn Function to execute for each element.
     */
    public forEach(callbackfn: TriConsumer<V, K, this>): void {
        for (const [key, value] of this.entries()) {
            callbackfn(value, key, this);
        }
    }

    public map<S>(fn: TriFunctional<V, K, this, S>): HashMap<K, S> {
        const self = this;
        return new HashMap(function* () {
            for (const [key, value] of self)
                yield [key, fn(value, key, self)];
        }())
    }

    public flatMap<S>(fn: TriFunctional<V, K, this, S | Map<K, S>>): HashMap<K, S> {
        const self = this;
        return new HashMap(function* () {
            for (const [key, value] of self.iterator()) {
                const result = fn(value, key, self);
                if (result instanceof Map)
                    yield* result.iterator();
                else
                    yield [key, result];
            }
        }())
    }

    /**
     * Returns a new Iterator object that contains the keys for each element in the map.
     */
    public keys(): Stream<K> {
        return Stream.from(this.#map.keys());
    }

    /**
     * Returns a new Iterator object that contains the values for each element in the map.
     */
    public values(): Stream<V> {
        return Stream.from(this.#map.values());
    }

    /**
     * Returns a new Iterator object that contains the [key, value] pairs for each element in the map.
     */
    public entries(): Stream<[K, V]> {
        return Stream.from(this.#map.entries());
    }

    /**
     * Default iterator for the class, allowing usage in for...of loops.
     */
    [Symbol.iterator](): IterableIterator<[K, V]> {
        return this.#map.entries();
    }

    get [Symbol.toStringTag](): string { return "HashMap"; }

    public static from<R, S>(iterable: Iterable<[R, S]>): HashMap<R, S> {
        return new HashMap(iterable);
    }

    public static of<R, S>(...items: [R, S][]): HashMap<R, S> {
        return new HashMap(items);
    }
}

export class CacheMap<K, V> extends HashMap<K, V> {
    public override set(key: K, value: V): this {
        super.delete(key);
        super.set(key, value);
        return this;
    }

    public override add(...entries: [K, V][]): number {
        const size = this.size;
        for (const [key, value] of entries) {
            super.delete(key);
            super.set(key, value);
        }
        return this.size - size;
    }

    public map<S>(fn: TriFunctional<V, K, this, S>): CacheMap<K, S> {
        const self = this;
        return new CacheMap(function* () {
            for (const [key, value] of self)
                yield [key, fn(value, key, self)];
        }())
    }

    public flatMap<S>(fn: TriFunctional<V, K, this, S | Map<K, S>>): CacheMap<K, S> {
        const self = this;
        return new CacheMap(function* () {
            for (const [key, value] of self.iterator()) {
                const result = fn(value, key, self);
                if (result instanceof Map)
                    yield* result.iterator();
                else
                    yield [key, result];
            }
        }())
    }

    override get [Symbol.toStringTag](): string { return "CacheMap"; }

    public static override from<R, S>(iterable: Iterable<[R, S]>): CacheMap<R, S> {
        return new CacheMap(iterable);
    }

    public static override of<R, S>(...items: [R, S][]): CacheMap<R, S> {
        return new CacheMap(items);
    }
}

enum Color { RED, BLACK }

class BSTNode {
    public left?: BSTNode;
    public right?: BSTNode;
    public parent?: BSTNode;
    public color: Color = Color.RED;
}

export class TreeMap<K, V> extends SortedMap<K, V> {
    #size: number = 0;
    #values = new WeakMap<BSTNode, V>();
    #keys = new WeakMap<BSTNode, K>();
    #root?: BSTNode;
    #compareFn: Comparator<K>

    /**
     * Creates an instance of TreeMap.
     * @param compareFn A function used to determine the order of the keys. It is expected to return
     * a negative value if first argument is less than second, zero if equal, and a positive value otherwise.
     * @param iterable An optional iterable (e.g., an Array of [key, value] pairs) to initialize the map.
     */
    constructor(compareFn: Comparator<K>, iterable?: Iterable<[K, V]>) {
        super();
        this.#compareFn = compareFn;
        for (const [key, value] of iterable ?? [])
            this.set(key, value);
    }

    /**
     * Returns the number of key-value pairs in the map.
     */
    get size(): number {
        return this.#size;
    };

    /**
     * Associates the specified value with the specified key in this map.
     * If the map previously contained a mapping for the key, the old value is replaced.
     * * 
     * * @param key Key with which the specified value is to be associated.
     * @param value Value to be associated with the specified key.
     * @returns The TreeMap instance for method chaining.
     */
    public set(key: K, value: V): this {
        let y: BSTNode | undefined = undefined;
        let x = this.#root;
        let comparison = 0;

        while (x) {
            y = x;
            comparison = this.#compareFn(key, this.#keys.get(x)!);
            if (comparison === 0) {
                this.#values.set(x, value);
                return this;
            }
            x = comparison < 0 ? x.left : x.right;
        }

        const z = new BSTNode();
        this.#keys.set(z, key);
        this.#values.set(z, value);
        z.parent = y;

        if (!y) {
            this.#root = z;
        } else if (this.#compareFn(key, this.#keys.get(y)!) < 0) {
            y.left = z;
        } else {
            y.right = z;
        }

        z.color = Color.RED;
        this.#size++;
        this.#fixInsert(z);
        return this;
    }

    public add(...entries: [K, V][]): number {
        const size = this.#size;
        for (const [key, value] of entries)
            this.set(key, value);
        return this.#size - size;
    }

    /**
     * Returns the value to which the specified key is mapped, 
     * or undefined if this map contains no mapping for the key.
     * @param key The key whose associated value is to be returned.
     * @returns The value associated with the key, or undefined.
     */
    public get(key: K): Optional<V> {
        const node = this.#findNode(key);
        if (node && this.#values.has(node))
            return Optional.of(this.#values.get(node)!);
        return Optional.empty();
    }

    /**
     * Returns true if this map contains a mapping for the specified key.
     * @param key The key whose presence in this map is to be tested.
     * @returns Boolean indicating if the key exists.
     */
    public has(...keys: K[]): boolean {
        if (keys.length === 0) return false;
        for (const key of keys)
            if (this.#findNode(key) === undefined)
                return false;
        return true;
    }

    /**
     * Removes the mapping for a key from this map if it is present.
     * * 
     * * @param key Key whose mapping is to be removed from the map.
     * @returns True if the key was found and removed; false otherwise.
     */
    public delete(...keys: K[]): number {
        const size = this.#size;
        for (const key of keys) {
            const z = this.#findNode(key);
            if (!z) continue;

            let y = z;
            let x: BSTNode | undefined;
            let yOriginalColor = y.color;

            if (!z.left) {
                x = z.right;
                this.#transplant(z, z.right);
            } else if (!z.right) {
                x = z.left;
                this.#transplant(z, z.left);
            } else {
                y = this.#minimum(z.right);
                yOriginalColor = y.color;
                x = y.right;
                if (y.parent === z) {
                    if (x) x.parent = y;
                } else {
                    this.#transplant(y, y.right);
                    y.right = z.right;
                    if (y.right) y.right.parent = y;
                }
                this.#transplant(z, y);
                y.left = z.left;
                if (y.left) y.left.parent = y;
                y.color = z.color;
            }

            this.#size--;
            if (yOriginalColor === Color.BLACK) {
                this.#fixDelete(x, x?.parent);
            }
        }
        return size - this.#size;
    }

    /**
     * Removes all of the mappings from this map.
     */
    public clear(): void {
        this.#root = undefined;
        this.#size = 0;
    }

    #findNode(key: K): BSTNode | undefined {
        let current = this.#root;
        while (current) {
            const currentKey = this.#keys.get(current)!;
            const comparison = this.#compareFn(key, currentKey);
            if (comparison === 0) return current;
            current = comparison < 0 ? current.left : current.right;
        }
        return undefined;
    }

    #minimum(node: BSTNode): BSTNode {
        while (node.left) node = node.left;
        return node;
    }

    #transplant(u: BSTNode, v?: BSTNode): void {
        if (!u.parent) this.#root = v;
        else if (u === u.parent.left) u.parent.left = v;
        else u.parent.right = v;
        if (v) v.parent = u.parent;
    }

    #rotateLeft(x: BSTNode): void {
        const y = x.right!;
        x.right = y.left;
        if (y.left) y.left.parent = x;
        y.parent = x.parent;
        if (!x.parent) this.#root = y;
        else if (x === x.parent.left) x.parent.left = y;
        else x.parent.right = y;
        y.left = x;
        x.parent = y;
    }

    #rotateRight(y: BSTNode): void {
        const x = y.left!;
        y.left = x.right;
        if (x.right) x.right.parent = y;
        x.parent = y.parent;
        if (!y.parent) this.#root = x;
        else if (y === y.parent.right) y.parent.right = x;
        else y.parent.left = x;
        x.right = y;
        y.parent = x;
    }

    #fixInsert(z: BSTNode): void {
        while (z.parent && z.parent.color === Color.RED) {
            if (z.parent === z.parent.parent?.left) {
                const uncle = z.parent.parent.right;
                if (uncle && uncle.color === Color.RED) {
                    z.parent.color = Color.BLACK;
                    uncle.color = Color.BLACK;
                    z.parent.parent.color = Color.RED;
                    z = z.parent.parent;
                } else {
                    if (z === z.parent.right) {
                        z = z.parent;
                        this.#rotateLeft(z);
                    }
                    z.parent!.color = Color.BLACK;
                    z.parent!.parent!.color = Color.RED;
                    this.#rotateRight(z.parent!.parent!);
                }
            } else {
                const uncle = z.parent.parent?.left;
                if (uncle && uncle.color === Color.RED) {
                    z.parent.color = Color.BLACK;
                    uncle.color = Color.BLACK;
                    z.parent.parent!.color = Color.RED;
                    z = z.parent.parent!;
                } else {
                    if (z === z.parent.left) {
                        z = z.parent;
                        this.#rotateRight(z);
                    }
                    z.parent!.color = Color.BLACK;
                    z.parent!.parent!.color = Color.RED;
                    this.#rotateLeft(z.parent!.parent!);
                }
            }
        }
        if (this.#root) this.#root.color = Color.BLACK;
    }

    #fixDelete(x: BSTNode | undefined, xParent: BSTNode | undefined): void {
        while (x !== this.#root && (!x || x.color === Color.BLACK)) {
            if (xParent && x === xParent.left) {
                let w = xParent.right;
                if (w?.color === Color.RED) {
                    w.color = Color.BLACK;
                    xParent.color = Color.RED;
                    this.#rotateLeft(xParent);
                    w = xParent.right;
                }
                if ((!w?.left || w.left.color === Color.BLACK) && (!w?.right || w.right.color === Color.BLACK)) {
                    if (w) w.color = Color.RED;
                    x = xParent;
                    xParent = x.parent;
                } else {
                    if (!w?.right || w.right.color === Color.BLACK) {
                        if (w?.left) w.left.color = Color.BLACK;
                        if (w) w.color = Color.RED;
                        if (w) this.#rotateRight(w);
                        w = xParent.right;
                    }
                    if (w) w.color = xParent.color;
                    xParent.color = Color.BLACK;
                    if (w?.right) w.right.color = Color.BLACK;
                    this.#rotateLeft(xParent);
                    x = this.#root;
                }
            } else if (xParent) {
                let w = xParent.left;
                if (w?.color === Color.RED) {
                    w.color = Color.BLACK;
                    xParent.color = Color.RED;
                    this.#rotateRight(xParent);
                    w = xParent.left;
                }
                if ((!w?.right || w.right.color === Color.BLACK) && (!w?.left || w.left.color === Color.BLACK)) {
                    if (w) w.color = Color.RED;
                    x = xParent;
                    xParent = x.parent;
                } else {
                    if (!w?.left || w.left.color === Color.BLACK) {
                        if (w?.right) w.right.color = Color.BLACK;
                        if (w) w.color = Color.RED;
                        if (w) this.#rotateLeft(w);
                        w = xParent.left;
                    }
                    if (w) w.color = xParent.color;
                    xParent.color = Color.BLACK;
                    if (w?.left) w.left.color = Color.BLACK;
                    this.#rotateRight(xParent);
                    x = this.#root;
                }
            } else break;
        }
        if (x) x.color = Color.BLACK;
    }


    /**
     * Performs the specified action for each entry in this map in sorted order.
     * @param callbackfn Function to execute for each entry.
     */
    public forEach(callbackfn: (value: V, key: K, obj: this) => void): void {
        for (const [key, value] of this.entries()) {
            callbackfn(value, key, this);
        }
    }

    public first(): Optional<K> {
        if (!this.#root) {
            return Optional.empty();
        }
        return Optional.of(this.#keys.get(this.#minimum(this.#root))!);
    }

    public last(): Optional<K> {
        if (!this.#root) {
            return Optional.empty();
        }
        let current = this.#root;
        while (current.right) {
            current = current.right;
        }
        return Optional.of(this.#keys.get(current)!);
    }

    public comparator(): Comparator<K> {
        return this.#compareFn;
    }

    public head(toKey: K): TreeMap<K, V> {
        const subMap = new TreeMap<K, V>(this.#compareFn);
        for (const [key, value] of this.entries()) {
            if (this.#compareFn(key, toKey) >= 0) break;
            subMap.set(key, value);
        }
        return subMap;
    }

    public tail(fromKey: K): TreeMap<K, V> {
        const subMap = new TreeMap<K, V>(this.#compareFn);
        let startAdding = false;
        for (const [key, value] of this.entries()) {
            if (!startAdding && this.#compareFn(key, fromKey) >= 0) {
                startAdding = true;
            }
            if (startAdding) {
                subMap.set(key, value);
            }
        }
        return subMap;
    }

    public slice(fromKey: K, toKey: K): TreeMap<K, V> {
        if (this.#compareFn(fromKey, toKey) > 0)
            return new TreeMap(this.#compareFn);

        const subMap = new TreeMap<K, V>(this.#compareFn);
        for (const [key, value] of this.entries()) {
            const cmpFrom = this.#compareFn(key, fromKey);
            const cmpTo = this.#compareFn(key, toKey);

            if (cmpFrom >= 0 && cmpTo < 0) {
                subMap.set(key, value);
            } else if (cmpTo >= 0) {
                break;
            }
        }
        return subMap;
    }

    public map<S>(fn: TriFunctional<V, K, this, S>): TreeMap<K, S> {
        const self = this;
        return new TreeMap(this.#compareFn, function* () {
            for (const [key, value] of self)
                yield [key, fn(value, key, self)];
        }())
    }

    public flatMap<S>(fn: TriFunctional<V, K, this, S | Map<K, S>>): TreeMap<K, S> {
        const self = this;
        return new TreeMap(this.#compareFn, function* () {
            for (const [key, value] of self.iterator()) {
                const result = fn(value, key, self);
                if (result instanceof Map)
                    yield* result.iterator();
                else
                    yield [key, result];
            }
        }())
    }

    /**
     * Returns a new Iterator object that contains the keys for each element in the map in sorted order.
     */
    public keys(): Stream<K> {
        return Stream.from(this).map(([key]) => key);
    }

    /**
     * Returns a new Iterator object that contains the values for each element in the map in sorted order of their keys.
     */
    public values(): Stream<V> {
        return Stream.from(this).map(([_, value]) => value);
    }

    /**
     * Returns a new Iterator object that contains the [key, value] pairs for each element in the map in sorted order.
     */
    public entries(): Stream<[K, V]> {
        return Stream.from(this);
    }

    /**
     * Default iterator for the TreeMap, yielding [key, value] pairs in sorted order.
     */
    *[Symbol.iterator](): IterableIterator<[K, V]> {
        const stack: Stack<BSTNode> = new ArrayList<BSTNode>();
        let current = this.#root;

        while (stack.size > 0 || current) {
            while (current) {
                stack.add(current);
                current = current.left;
            }

            const last = stack.removeLast();

            if (!last.isSome())
                return;

            current = last.get();
            yield [this.#keys.get(current)!, this.#values.get(current)!];

            current = current.right;
        }
    }

    /**
     * Tag used by Object.prototype.toString.
     */
    get [Symbol.toStringTag](): string { return "TreeMap"; }

    public static from<R, S>(compareFn: Comparator<R>, iterable: Iterable<[R, S]>): TreeMap<R, S> {
        return new TreeMap(compareFn, iterable);
    }

    public static of<R, S>(compareFn: Comparator<R>, ...items: [R, S][]): TreeMap<R, S> {
        return new TreeMap(compareFn, items);
    }
}