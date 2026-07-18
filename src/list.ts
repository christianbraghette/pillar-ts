import { Deque, List, SortedList, SortedQueue, Stack, Collection } from "./collections";
import { Comparator, TriConsumer, TriFunctional } from "./functional";
import { Stream } from "./stream";
import { Optional } from "./optional";

export class ArrayList<T> extends List<T> implements Deque<T>, Stack<T> {
    #data: T[];

    constructor(iterable?: Iterable<T>) {
        super();
        this.#data = iterable ? Array.from(iterable) : [];
    }

    get size(): number {
        return this.#data.length;
    }

    public add(...items: T[]): number {
        const length = this.#data.length;
        return this.#data.push(...items) - length;
    }

    public removeLast(): Optional<T> {
        if (this.#data.length > 0)
            return Optional.of(this.#data.pop()!);
        return Optional.empty();

    }

    public remove(): Optional<T> {
        if (this.#data.length > 0)
            return Optional.of(this.#data.shift()!);
        return Optional.empty();

    }

    public addFirst(...items: T[]): number {
        return this.#data.unshift(...items);
    }

    public clear(): void {
        this.#data.length = 0;
    }

    public first(): Optional<T> {
        if (this.#data.length > 0)
            return Optional.of(this.#data[0]!);
        return Optional.empty();

    }

    public last(): Optional<T> {
        if (this.#data.length > 0)
            return Optional.of(this.#data[this.#data.length - 1]!);
        return Optional.empty();

    }

    public has(...items: T[]): boolean {
        return items.length > 0 && items.every(item => this.#data.includes(item));
    }

    public delete(...items: T[]): number {
        const length = this.#data.length;
        for (const item of items) {
            const index = this.#data.indexOf(item);
            if (index === -1)
                continue;
            this.#data.splice(index, 1);
        }
        return length - this.#data.length;
    }

    public get(index: number): Optional<T> {
        if (index < this.#data.length && index >= 0)
            return Optional.of(this.#data[index]!);
        return Optional.empty();
    }

    public indexOf(searchElement: T, fromIndex: number = 0): number {
        return this.#data.indexOf(searchElement, fromIndex);
    }

    public lastIndexOf(searchElement: T, fromIndex: number = 0): number {
        return this.#data.lastIndexOf(searchElement, fromIndex);
    }

    public slice(start?: number, end?: number): ArrayList<T> {
        return new ArrayList<T>(this.#data.slice(start, end));
    }

    public splice(start: number, deleteCount: number, ...items: T[]): ArrayList<T> {
        return new ArrayList<T>(this.#data.splice(start, deleteCount, ...items));
    }

    public sort(comparator: Comparator<T>): this {
        this.#data.sort(comparator);
        return this;
    }

    public set(index: number, item: T): boolean {
        let target = index < 0 ? this.size + index : index;
        if (target < 0 || target >= this.size)
            return false;
        this.#data[target] = item;
        return true;
    }

    public forEach(callbackfn: (value: T, key: number, obj: this) => void): void {
        this.#data.forEach((v: T, i: number) => callbackfn(v, i, this));
    }

    public map<S>(fn: TriFunctional<T, number, this, S>): ArrayList<S> {
        const self = this;
        return new ArrayList(function* () {
            let i = 0;
            for (const value of self)
                yield fn(value, i++, self);
        }())
    }

    public flatMap<S>(fn: TriFunctional<T, number, this, S | Collection<S>>): ArrayList<S> {
        const self = this;
        return new ArrayList(function* () {
            let i = 0;
            for (const value of self.iterator()) {
                const result = fn(value, i++, self);
                if (result instanceof Collection)
                    yield* result.iterator();
                else
                    yield result;
            }
        }())
    }

    public toSorted(comparator: Comparator<T>): TreeList<T> {
        return new TreeList(comparator, this);
    }

    public stream(): Stream<T> {
        return new Stream(() => this);
    }

    [Symbol.iterator](): IterableIterator<T> {
        return this.#data.values();
    }

    get [Symbol.toStringTag](): string { return "ArrayList"; };

    public static from<S>(iterable: Iterable<S>): ArrayList<S> {
        return new ArrayList(iterable);
    }

    public static of<S>(...items: S[]): ArrayList<S> {
        return new ArrayList(items);
    }
}

type NodeColor = "RED" | "BLACK";

class TreeNode {
    constructor(public index: number) {}
    left?: TreeNode;
    right?: TreeNode;
    parent?: TreeNode;
    color: NodeColor = "RED";
    count: number = 1;
}

export class TreeList<T> extends SortedList<T> implements SortedQueue<T> {
    #compareFn: Comparator<T>;
    #data = new Array<T>();
    #root?: TreeNode;
    #size: number = 0;

    constructor(compareFn: Comparator<T>, iterable?: Iterable<T>) {
        super();
        this.#compareFn = compareFn;

        for (const item of iterable ?? []) {
            this.add(item);
        }
    }

    #getColor(node?: TreeNode): NodeColor {
        return node ? node.color : "BLACK";
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

    #rotateRight(x: TreeNode): void {
        const y = x.left!;
        x.left = y.right;

        if (y.right) y.right.parent = x;
        y.parent = x.parent;

        if (!x.parent) this.#root = y;
        else if (x === x.parent.right) x.parent.right = y;
        else x.parent.left = y;

        y.right = x;
        x.parent = y;
    }

    public comparator(): Comparator<T> {
        return this.#compareFn;
    }

    public get size(): number {
        return this.#size;
    }

    public clear(): void {
        this.#root = undefined;
        this.#size = 0;
    }

    public add(...items: T[]): number {
        const initialSize = this.#size;
        for (const item of items) {
            this.#insertItem(item);
        }
        return this.#size - initialSize;
    }

    #insertItem(item: T): void {
        const newNode = new TreeNode(this.#data.push(item) - 1);

        let y: TreeNode | undefined = undefined;
        let x = this.#root;

        while (x) {
            y = x;
            const currentVal = this.#data[x.index];
            const cmp = this.#compareFn(item, currentVal);

            if (cmp === 0) {
                x.count++;
                this.#size++;
                return;
            }
            x = cmp < 0 ? x.left : x.right;
        }

        newNode.parent = y;
        this.#size++;

        if (!y) {
            this.#root = newNode;
        } else {
            const yVal = this.#data[y.index];
            if (this.#compareFn(item, yVal) < 0) y.left = newNode;
            else y.right = newNode;
        }

        this.#fixInsert(newNode);
    }

    #fixInsert(z: TreeNode): void {
        while (z.parent && z.parent.color === "RED") {
            if (z.parent === z.parent.parent?.left) {
                const uncle = z.parent.parent.right;
                if (this.#getColor(uncle) === "RED") {
                    z.parent.color = "BLACK";
                    uncle!.color = "BLACK";
                    z.parent.parent.color = "RED";
                    z = z.parent.parent;
                } else {
                    if (z === z.parent.right) {
                        z = z.parent;
                        this.#rotateLeft(z);
                    }
                    z.parent!.color = "BLACK";
                    z.parent!.parent!.color = "RED";
                    this.#rotateRight(z.parent!.parent!);
                }
            } else {
                const uncle = z.parent.parent?.left;
                if (this.#getColor(uncle) === "RED") {
                    z.parent.color = "BLACK";
                    uncle!.color = "BLACK";
                    z.parent.parent!.color = "RED";
                    z = z.parent.parent!;
                } else {
                    if (z === z.parent.left) {
                        z = z.parent;
                        this.#rotateRight(z);
                    }
                    z.parent!.color = "BLACK";
                    z.parent!.parent!.color = "RED";
                    this.#rotateLeft(z.parent!.parent!);
                }
            }
        }
        this.#root!.color = "BLACK";
    }

    public delete(...items: T[]): number {
        const initialSize = this.#size;
        if (initialSize === 0 || items.length === 0) return 0;

        const itemsToRemove = new Map<T, number>();
        for (const item of items) {
            itemsToRemove.set(item, (itemsToRemove.get(item) ?? 0) + 1);
        }

        for (const [item, countToRem] of itemsToRemove.entries()) {
            let needed = countToRem;
            while (needed > 0) {
                const node = this.#findNode(this.#root, item);
                if (!node) break;

                if (node.count > 1) {
                    node.count--;
                    this.#size--;
                } else {
                    this.#deleteNode(node);
                }
                needed--;
            }
        }

        return initialSize - this.#size;
    }

    #deleteNode(z: TreeNode): void {
        let y = z;
        let yOriginalColor = y.color;
        let x: TreeNode | undefined;

        if (!z.left) {
            x = z.right;
            this.#transplant(z, z.right);
        } else if (!z.right) {
            x = z.left;
            this.#transplant(z, z.left);
        } else {
            // Successore in-order
            y = z.right;
            while (y.left) y = y.left;

            yOriginalColor = y.color;
            x = y.right;

            if (y.parent === z) {
                if (x) x.parent = y;
            } else {
                this.#transplant(y, y.right);
                y.right = z.right;
                y.right.parent = y;
            }

            this.#transplant(z, y);
            y.left = z.left;
            y.left.parent = y;
            y.color = z.color;
        }

        delete this.#data[z.index];
        this.#size--;

        if (yOriginalColor === "BLACK" && x) {
            this.#fixDelete(x);
        }
    }

    #transplant(u: TreeNode, v?: TreeNode): void {
        if (!u.parent) this.#root = v;
        else if (u === u.parent.left) u.parent.left = v;
        else u.parent.right = v;
        if (v) v.parent = u.parent;
    }
    #fixDelete(x: TreeNode): void {
        while (x !== this.#root && x.color === "BLACK") {
            if (x === x.parent!.left) {
                let sibling = x.parent!.right;
                if (this.#getColor(sibling) === "RED") {
                    sibling!.color = "BLACK";
                    x.parent!.color = "RED";
                    this.#rotateLeft(x.parent!);
                    sibling = x.parent!.right;
                }
                if (this.#getColor(sibling?.left) === "BLACK" && this.#getColor(sibling?.right) === "BLACK") {
                    if (sibling) sibling.color = "RED";
                    x = x.parent!;
                } else {
                    if (this.#getColor(sibling?.right) === "BLACK") {
                        if (sibling?.left) sibling.left.color = "BLACK";
                        if (sibling) sibling.color = "RED";
                        this.#rotateRight(sibling!);
                        sibling = x.parent!.right;
                    }
                    if (sibling) sibling.color = x.parent!.color;
                    x.parent!.color = "BLACK";
                    if (sibling?.right) sibling.right.color = "BLACK";
                    this.#rotateLeft(x.parent!);
                    x = this.#root!;
                }
            } else {
                let sibling = x.parent!.left;
                if (this.#getColor(sibling) === "RED") {
                    sibling!.color = "BLACK";
                    x.parent!.color = "RED";
                    this.#rotateRight(x.parent!);
                    sibling = x.parent!.left;
                }
                if (this.#getColor(sibling?.right) === "BLACK" && this.#getColor(sibling?.left) === "BLACK") {
                    if (sibling) sibling.color = "RED";
                    x = x.parent!;
                } else {
                    if (this.#getColor(sibling?.left) === "BLACK") {
                        if (sibling?.right) sibling.right.color = "BLACK";
                        if (sibling) sibling.color = "RED";
                        this.#rotateLeft(sibling!);
                        sibling = x.parent!.left;
                    }
                    if (sibling) sibling.color = x.parent!.color;
                    x.parent!.color = "BLACK";
                    if (sibling?.left) sibling.left.color = "BLACK";
                    this.#rotateRight(x.parent!);
                    x = this.#root!;
                }
            }
        }
        x.color = "BLACK";
    }

    public first(): Optional<T> {
        if (!this.#root) return Optional.empty();
        let curr = this.#root;
        while (curr.left) curr = curr.left;
        return Optional.of(this.#data[curr.index]);
    }

    public last(): Optional<T> {
        if (!this.#root) return Optional.empty();
        let curr = this.#root;
        while (curr.right) curr = curr.right;
        return Optional.of(this.#data[curr.index]);
    }

    public remove(): Optional<T> {
        const val = this.first();
        if (!val.isSome())
            return Optional.empty();
        this.delete(val.get());
        return val;
    }

    public removeLast(): Optional<T> {
        const val = this.last();
        if (!val.isSome())
            return Optional.empty();
        this.delete(val.get());
        return val;
    }

    public has(...items: T[]): boolean {
        if (items.length === 0) return false;
        for (const item of items) {
            if (!this.#findNode(this.#root, item)) return false;
        }
        return true;
    }

    #findNode(node: TreeNode | undefined, item: T): TreeNode | undefined {
        if (!node) return undefined;
        const cmp = this.#compareFn(item, this.#data[node.index]);
        if (cmp === 0) return node;
        return cmp < 0 ? this.#findNode(node.left, item) : this.#findNode(node.right, item);
    }

    public get(index: number): Optional<T> {
        let target = index < 0 ? this.size + index : index;
        if (target < 0 || target >= this.size) return Optional.empty();

        let currIdx = 0;
        for (const val of this) {
            if (currIdx === target)
                return Optional.of(val);
            currIdx++;
        }
        return Optional.empty();
    }

    public indexOf(searchElement: T, fromIndex: number = 0): number {
        let start = fromIndex < 0 ? Math.max(this.size + fromIndex, 0) : fromIndex;
        let i = 0;
        for (const val of this) {
            if (i >= start && val === searchElement) return i;
            i++;
        }
        return -1;
    }

    public lastIndexOf(searchElement: T, fromIndex: number = this.size - 1): number {
        let start = fromIndex < 0 ? this.size + fromIndex : fromIndex;
        let i = 0;
        let lastIdx = -1;
        for (const val of this) {
            if (i <= start && val === searchElement) {
                lastIdx = i;
            }
            i++;
        }
        return lastIdx;
    }

    public slice(start: number = 0, end: number = this.size): TreeList<T> {
        const s = start < 0 ? Math.max(this.size + start, 0) : Math.min(start, this.size);
        const e = end < 0 ? Math.max(this.size + end, 0) : Math.min(end, this.size);

        const self = this;
        const sliceGenerator = function* () {
            let i = 0;
            for (const val of self) {
                if (i >= s && i < e) yield val;
                if (i >= e) break;
                i++;
            }
        };
        return new TreeList<T>(this.#compareFn, sliceGenerator());
    }

    public head(item: T): SortedList<T> {
        const subList = new TreeList<T>(this.#compareFn);
        for (const currentVal of this) {
            if (this.#compareFn(currentVal, item) < 0) {
                subList.add(currentVal);
            } else {
                break;
            }
        }
        return subList;
    }

    public tail(item: T): SortedList<T> {
        const subList = new TreeList<T>(this.#compareFn);
        let startAdding = false;
        for (const currentVal of this) {
            if (!startAdding && this.#compareFn(currentVal, item) >= 0) {
                startAdding = true;
            }
            if (startAdding) {
                subList.add(currentVal);
            }
        }
        return subList;
    }

    public deduplicate(): this {
        const resetCount = (node?: TreeNode) => {
            if (!node) return;
            node.count = 1;
            resetCount(node.left);
            resetCount(node.right);
        };
        resetCount(this.#root);

        let newSize = 0;
        const countNodes = (node?: TreeNode) => {
            if (!node) return;
            newSize++;
            countNodes(node.left);
            countNodes(node.right);
        };
        countNodes(this.#root);
        this.#size = newSize;

        return this;
    }

    public forEach(callbackfn: TriConsumer<T, number, this>): void {
        let i = 0;
        for (const value of this) {
            callbackfn(value, i++, this);
        }
    }

    public map<S>(fn: TriFunctional<T, number, this, S>): List<S> {
        const self = this;
        return new ArrayList(function* () {
            let i = 0;
            for (const value of self)
                yield fn(value, i++, self);
        }())
    }

    public flatMap<S>(fn: TriFunctional<T, number, this, S | Collection<S>>): List<S> {
        const self = this;
        return new ArrayList(function* () {
            let i = 0;
            for (const value of self.iterator()) {
                const result = fn(value, i++, self);
                if (result instanceof Collection)
                    yield* result.iterator();
                else
                    yield result;
            }
        }())
    }

    public toUnsorted(): ArrayList<T> { return new ArrayList(this); }

    public stream(): Stream<T> {
        return new Stream(() => this);
    };

    *[Symbol.iterator](): IterableIterator<T> {
        const self = this;
        function* traverse(node?: TreeNode): Generator<T> {
            if (!node) return;
            yield* traverse(node.left);
            for (let i = 0; i < node.count; i++) {
                yield self.#data[node.index];
            }
            yield* traverse(node.right);
        }
        yield* traverse(this.#root);
    }

    get [Symbol.toStringTag](): string { return "TreeList"; }

    public static from<S>(compareFn: Comparator<S>, iterable: Iterable<S>): TreeList<S> {
        return new TreeList(compareFn, iterable);
    }

    public static of<S>(compareFn: Comparator<S>, ...items: S[]): TreeList<S> {
        return new TreeList(compareFn, items);
    }
}