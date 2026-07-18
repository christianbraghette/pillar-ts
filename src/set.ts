import { Set, SortedSet, Collection, Stack } from "./collections";
import { Comparator, TriFunctional } from "./functional";
import { Optional } from "./optional";
import { Stream } from "./stream";
import { NativeSet } from "./native";
import { ArrayList } from "./list";

export class HashSet<T> extends Set<T> {
    #set: NativeSet<T>;

    /**
     * Creates a new HashSet.
     * @param iterable An optional iterable of elements to initialize the set with.
     */
    constructor(iterable?: Iterable<T>) {
        super();
        this.#set = new NativeSet(iterable);
    }

    /**
     * Gets the number of elements in the set.
     */
    public get size(): number {
        return this.#set.size;
    }

    /**
     * Adds a new value to the set.
     * @param items The values to add.
     * @returns The HashSet instance for method chaining.
     */
    public add(...items: T[]): number {
        const size = this.#set.size;
        for (const value of items)
            this.#set.add(value);
        return this.#set.size - size;
    }

    /**
     * Checks if a value exists in the set.
     * @param key The value to search for.
     * @returns True if the value exists, false otherwise.
     */
    public has(...items: T[]): boolean {
        if (items.length === 0) return false;
        for (const item of items)
            if (!this.#set.has(item))
                return false;
        return true;
    }

    /**
     * Removes a value from the set.
     * @param key The value to remove.
     * @returns True if the element was successfully removed, false if it didn't exist.
     */
    public delete(...items: T[]): number {
        const size = this.#set.size;
        for (const item of items)
            this.#set.delete(item);
        return size - this.#set.size;
    }

    /**
     * Removes all elements from the set.
     */
    public clear(): void {
        this.#set.clear();
    }

    /**
     * Executes a provided function once for each element in the set.
     * @param callbackfn Function to execute for each element.
     */
    public forEach(callbackfn: (value: T, index: number, obj: this) => void): void {
        let i = 0;
        for (const value of this.#set) {
            callbackfn(value, i++, this);
        }
    }

    public map<S>(fn: TriFunctional<T, number, this, S>): HashSet<S> {
        const self = this;
        return new HashSet(function* () {
            let i = 0;
            for (const value of self)
                yield fn(value, i++, self);
        }());
    }

    public flatMap<S>(fn: TriFunctional<T, number, this, S | Collection<S>>): HashSet<S> {
        const self = this;
        return new HashSet(function* () {
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

    /**
     * Combines the current set with another iterable to create a new set containing all unique elements from both.
     * @param other An iterable of elements to join with.
     * @returns A new HashSet containing the union.
     */
    public union(other: Set<T>): HashSet<T> {
        const result = new HashSet<T>(this);
        for (const item of other) result.add(item);
        return result;
    }

    /**
     * Creates a new set containing only the elements present in both the current set and the provided set.
     * @param other The HashSet to intersect with.
     * @returns A new HashSet containing the intersection.
     */
    public intersection(other: Set<T>): HashSet<T> {
        const result = new HashSet<T>();
        for (const item of this)
            if (other.has(item)) result.add(item);
        return result;
    }

    /**
     * Creates a new set containing elements that are in the current set but not in the provided set.
     * @param other The HashSet to compare against.
     * @returns A new HashSet containing the difference.
     */
    public difference(other: Set<T>): HashSet<T> {
        const result = new HashSet<T>();
        for (const item of this)
            if (!other.has(item)) result.add(item);
        return result;
    }

    /**
     * Determines whether the current set is a subset of another set.
     * @param other The potential superset.
     * @returns True if all elements of the current set are in the other set.
     */
    public isSubsetOf(other: Set<T>): boolean {
        if (this.size > other.size) return false;
        return this.stream().every(value => other.has(value));
    }

    public stream(): Stream<T> {
        return new Stream(() => this);
    };

    public get [Symbol.toStringTag](): string { return "HashSet"; }

    [Symbol.iterator](): IterableIterator<T> {
        return this.#set.values();
    }

    public static from<S>(iterable: Iterable<S>): HashSet<S> {
        return new HashSet(iterable);
    }

    public static of<S>(...items: S[]): HashSet<S> {
        return new HashSet(items);
    }
}

export class CacheSet<T> extends HashSet<T> {

    public override add(...items: T[]): number {
        const size = this.size;
        for (const item of items) {
            super.delete(item);
            super.add(item);
        }
        return this.size - size;
    }

    public override map<S>(fn: TriFunctional<T, number, this, S>): CacheSet<S> {
        const self = this;
        return new CacheSet(function* () {
            let i = 0;
            for (const item of self.iterator())
                yield fn(item, i++, self);
        }())
    }

    public override flatMap<S>(fn: TriFunctional<T, number, this, S | Collection<S>>): CacheSet<S> {
        const self = this;
        return new CacheSet(function* () {
            let i = 0;
            for (const item of self.iterator()) {
                const result = fn(item, i++, self);
                if (result instanceof Set)
                    yield* result.iterator();
                else
                    yield result;
            }
        }())
    }

    override get [Symbol.toStringTag](): string { return "CacheSet"; }

    public static override from<S>(iterable: Iterable<S>): CacheSet<S> {
        return new CacheSet(iterable);
    }

    public static override of<S>(...items: S[]): CacheSet<S> {
        return new CacheSet(items);
    }
}

enum Color {
    RED,
    BLACK
}

class TreeNode {
    public left?: TreeNode;
    public right?: TreeNode;
    public parent?: TreeNode;
    public color: Color = Color.RED;
}

export class TreeSet<T> extends SortedSet<T> {
    #size: number = 0;
    #data = new WeakMap<TreeNode, T>();
    #root?: TreeNode;
    #compareFn: Comparator<T>;

    /**
     * Creates a new TreeSet.
     * @param compareFn A function used to determine the order of the elements. 
     * It should return -1 if a < b, 1 if a > b, and 0 if they are equal.
     * @param iterable An optional iterable of elements to initialize the set with.
     */
    constructor(compareFn: Comparator<T>, iterable?: Iterable<T>) {
        super();
        this.#compareFn = compareFn;
        for (const data of iterable ?? [])
            this.add(data);
    }

    /**
     * Gets the number of elements in the set.
     */
    public get size(): number {
        return this.#size;
    }

    /**
     * Adds a new value to the set while maintaining sorted order.
     * If the value is already present, the set remains unchanged.
     * @param value The value to add.
     * @returns added elements count.
     */
    public add(...items: T[]): number {
        const size = this.#size;
        for (const value of items) {
            let y: TreeNode | undefined = undefined;
            let x = this.#root;

            let duplicate = false;
            while (x) {
                y = x;
                const comparison = this.#compareFn(value, this.#data.get(x)!);
                if (comparison === 0) {
                    duplicate = true;
                    break;
                }
                x = comparison < 0 ? x.left : x.right;
            }
            if (duplicate)
                continue;

            const z = new TreeNode();
            this.#data.set(z, value);
            z.parent = y;

            if (!y) {
                this.#root = z;
            } else if (this.#compareFn(value, this.#data.get(y)!) < 0) {
                y.left = z;
            } else {
                y.right = z;
            }

            this.#size++;
            this.#fixInsert(z);
        }
        return this.size - size;
    }

    /**
     * Checks if a value exists in the set using the comparison function.
     * @param value The value to search for.
     * @returns True if the value exists, false otherwise.
     */
    public has(...items: T[]): boolean {
        if (items.length === 0) return false;
        let i = items.length;
        for (const item of items) {
            let current = this.#root;
            while (current) {
                const currentVal = this.#data.get(current)!;
                const comparison = this.#compareFn(item, currentVal);
                if (comparison === 0) {
                    i--;
                    break;
                }
                current = comparison < 0 ? current.left : current.right;
            }
        }
        return i <= 0;
    }

    /**
     * Removes a value from the set and rebalances the tree structure.
     * @param value The value to remove.
     * @returns True if the element was successfully removed, false if it didn't exist.
     */
    public delete(...items: T[]): number {
        const size = this.#size;
        for (const item of items) {
            const z = this.#findNode(item);
            if (!z) continue;

            let y = z;
            let x: TreeNode | undefined;
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
     * Removes all elements from the set.
     */
    public clear(): void {
        this.#root = undefined;
        this.#size = 0;
    }

    #findNode(value: T): TreeNode | undefined {
        let current = this.#root;
        while (current) {
            const comparison = this.#compareFn(value, this.#data.get(current)!);
            if (comparison === 0) return current;
            current = comparison < 0 ? current.left : current.right;
        }
        return undefined;
    }

    #minimum(node: TreeNode): TreeNode {
        while (node.left) node = node.left;
        return node;
    }

    #transplant(u: TreeNode, v?: TreeNode): void {
        if (!u.parent) this.#root = v;
        else if (u === u.parent.left) u.parent.left = v;
        else u.parent.right = v;
        if (v) v.parent = u.parent;
    }

    #rotateLeft(x: TreeNode): void {
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

    #rotateRight(y: TreeNode): void {
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

    #fixInsert(z: TreeNode): void {
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

    #fixDelete(x: TreeNode | undefined, xParent: TreeNode | undefined): void {
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
     * Executes a provided function once for each element in sorted order.
     * @param callbackfn Function to execute for each element.
     */
    public forEach(callbackfn: (value: T, index: number, obj: this) => void): void {
        let i = 0;
        for (const value of this) {
            callbackfn(value, i++, this);
        }
    }

    public first(): Optional<T> {
        if (!this.#root) {
            return Optional.empty();
        }
        const minNode = this.#minimum(this.#root);
        return Optional.of(this.#data.get(minNode)!);
    }

    public last(): Optional<T> {
        if (!this.#root) {
            return Optional.empty();
        }
        let node = this.#root;
        while (node.right) {
            node = node.right;
        }
        return Optional.of(this.#data.get(node)!);
    }

    public comparator(): Comparator<T> {
        return this.#compareFn;
    }

    public head(item: T): TreeSet<T> {
        return this.#createSubSet(undefined, item);
    }

    public tail(item: T): TreeSet<T> {
        return this.#createSubSet(item, undefined);
    }

    public slice(fromItem: T, toItem: T): TreeSet<T> {
        if (this.#compareFn(fromItem, toItem) > 0) {
            return new TreeSet(this.#compareFn);
        }
        return this.#createSubSet(fromItem, toItem);
    }

    #createSubSet(fromItem?: T, toItem?: T): TreeSet<T> {
        const subSet = new TreeSet<T>(this.#compareFn);
        for (const value of this) {
            if (fromItem !== undefined && this.#compareFn(value, fromItem) < 0) {
                continue;
            }
            if (toItem !== undefined && this.#compareFn(value, toItem) >= 0) {
                continue;
            }
            subSet.add(value);
        }
        return subSet;
    }

    /**
     * Combines the current set with another iterable to create a new sorted set.
     */
    public union(other: Set<T>): TreeSet<T> {
        const result = new TreeSet<T>(this.#compareFn, this);
        for (const item of other) result.add(item);
        return result;
    }

    /**
     * Creates a new set containing elements present in both this set and the provided set.
     */
    public intersection(other: Set<T>): TreeSet<T> {
        const result = new TreeSet<T>(this.#compareFn);
        for (const item of this) {
            if (other.has(item)) result.add(item);
        }
        return result;
    }

    /**
     * Creates a new set containing elements present in this set but not in the other.
     */
    public difference(other: Set<T>): TreeSet<T> {
        const result = new TreeSet<T>(this.#compareFn);
        for (const item of this) {
            if (!other.has(item)) result.add(item);
        }
        return result;
    }

    /**
     * Determines whether all elements of this set are present in the other set.
     */
    public isSubsetOf(other: Set<T>): boolean {
        if (this.size > other.size) return false;
        for (const value of this) {
            if (!other.has(value)) return false;
        }
        return true;
    }

    public map<S>(fn: TriFunctional<T, number, this, S>): Set<S> {
        const self = this;
        return new HashSet(function* () {
            let i = 0;
            for (const value of self)
                yield fn(value, i++, self);
        }());
    }

    public flatMap<S>(fn: TriFunctional<T, number, this, S | Collection<S>>): Set<S> {
        const self = this;
        return new HashSet(function* () {
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

    public stream(): Stream<T> {
        return new Stream(() => this);
    };

    /**
     * Default iterator that returns values in sorted order.
     */
    *[Symbol.iterator](): IterableIterator<T> {
        const stack: Stack<TreeNode> = new ArrayList<TreeNode>();
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
            yield this.#data.get(current)!;
            current = current.right;
        }
    }

    get [Symbol.toStringTag](): string { return "TreeSet"; }

    public static from<S>(compareFn: Comparator<S>, iterable: Iterable<S>): TreeSet<S> {
        return new TreeSet(compareFn, iterable);
    }

    public static of<S>(compareFn: Comparator<S>, ...items: S[]): TreeSet<S> {
        return new TreeSet(compareFn, items);
    }
}