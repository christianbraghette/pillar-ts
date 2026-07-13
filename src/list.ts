import { Deque, List, Queue, SortedList, SortedQueue } from "./collections";
import { Comparator, TriConsumer } from "./functional";
import { Throwable } from "./result";
import { Stream } from "./stream";
import { NativeSet } from "./native";

export class ArrayList<T> extends List<T> implements Deque<T> {
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

    public removeLast(): Throwable<T> {
        if (this.#data.length > 0)
            throw new Error();
        return this.#data.pop()!;
    }

    public remove(): Throwable<T> {
        if (this.#data.length > 0)
            throw new Error();
        return this.#data.shift()!;
    }

    public addFirst(...items: T[]): number {
        return this.#data.unshift(...items);
    }

    public clear(): void {
        this.#data.length = 0;
    }

    public first(): Throwable<T> {
        if (this.#data.length > 0)
            throw new Error();
        return this.#data[0]!;
    }

    public last(): Throwable<T> {
        if (this.#data.length > 0)
            throw new Error();
        return this.#data[this.#data.length]!;
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

    public get(index: number): Throwable<T> {
        if (index < this.#data.length || index > -this.#data.length)
            return this.#data[index < 0 ? index + this.#data.length : index]!;
        throw new Error();
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

    public splice(start: number, deleteCount?: number, ...items: T[]): ArrayList<T> {
        return new ArrayList<T>(this.#data.splice(start, deleteCount || 0, ...items));
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
    };

    public forEach(callbackfn: (value: T, key: number, obj: this) => void): void {
        this.#data.forEach((v: T, i: number) => callbackfn(v, i, this));
    }

    public toSortedList(comparator: Comparator<T>): TreeList<T> {
        return new TreeList(comparator, this);
    }

    public toArray(): T[] {
        return Array.from(this);
    }

    public stream(): Stream<T> {
        return new Stream(this);
    }

    [Symbol.iterator](): IterableIterator<T> {
        return this.#data.values();
    }

    get [Symbol.toStringTag](): string { return "ArrayList" };

    public static from<S>(iterable: Iterable<S>): ArrayList<S> {
        return new ArrayList(iterable);
    }

    public static of<S>(...items: S[]): ArrayList<S> {
        return new ArrayList(items);
    }
}

class LinkedListNode {
    constructor(public next?: LinkedListNode, public prev?: LinkedListNode) { }
}

export class LinkedList<T> extends List<T> implements Deque<T> {
    #data = new WeakMap<LinkedListNode, T>();
    #next?: LinkedListNode;
    #prev?: LinkedListNode;
    #reversed: boolean = false;
    #size: number = 0;

    /**
     * Creates a new LinkedList from an iterable.
     * @param iterable An iterable object to initialize the list with.
     */
    constructor(iterable?: Iterable<T>) {
        super();
        for (const item of iterable ?? [])
            this.add(item);
    }

    get #head(): LinkedListNode | undefined {
        return this.#reversed ? this.#prev : this.#next;
    }

    set #head(node: LinkedListNode | undefined) {
        if (this.#reversed)
            this.#prev = node;
        else
            this.#next = node;
    }

    get #tail(): LinkedListNode | undefined {
        return this.#reversed ? this.#next : this.#prev;
    }

    set #tail(node: LinkedListNode | undefined) {
        if (this.#reversed)
            this.#next = node;
        else
            this.#prev = node;
    }

    #getValue(node?: LinkedListNode): T | undefined {
        return node ? this.#data.get(node) : undefined;
    }

    #getNext(node?: LinkedListNode): LinkedListNode | undefined {
        return this.#reversed ? node?.prev : node?.next;
    }

    #setNext(curr: LinkedListNode, next: LinkedListNode | undefined): void {
        if (this.#reversed)
            curr.prev = next;
        else
            curr.next = next;
    }

    #getPrev(node?: LinkedListNode): LinkedListNode | undefined {
        return this.#reversed ? node?.next : node?.prev;
    }

    #setPrev(curr: LinkedListNode, prev: LinkedListNode | undefined): void {
        if (this.#reversed)
            curr.next = prev;
        else
            curr.prev = prev;
    }

    /**
     * Returns the first element of the list.
     */
    public first(): Throwable<T> {
        const value = this.#getValue(this.#head);
        if (!value)
            throw new Error();
        return value;
    }

    /**
     * Returns the last element of the list.
     */
    public last(): Throwable<T> {
        const value = this.#getValue(this.#tail);
        if (!value)
            throw new Error();
        return value;
    }

    public clear(): void {
        this.#next = undefined;
        this.#prev = undefined;
        this.#size = 0;
    }

    /**
     * Adds one or more elements to the end of the list.
     * @param items The elements to add.
     * @returns The new length of the list.
     */
    public add(...items: T[]): number {
        const size = this.#size;
        for (const item of items) {
            const newNode = new LinkedListNode();
            this.#data.set(newNode, item);

            if (!this.#tail) {
                this.#head = newNode;
                this.#tail = newNode;
            } else {
                this.#setNext(this.#tail, newNode);
                this.#setPrev(newNode, this.#tail);
                this.#tail = newNode;
            }
            this.#size++;
        }
        return this.#size - size;
    }

    /**
     * Adds one or more elements to the beginning of the list.
     * @param items The elements to add.
     * @returns The new length of the list.
     */
    public addFirst(...items: T[]): number {
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            const newNode = new LinkedListNode();
            this.#data.set(newNode, item);

            if (!this.#head) {
                this.#head = newNode;
                this.#tail = newNode;
            } else {
                this.#setPrev(this.#head, newNode);
                this.#setNext(newNode, this.#head);
                this.#head = newNode;
            }
            this.#size++;
        }
        return this.#size;
    }

    /**
     * Removes and returns the last element of the list.
     */
    public removeLast(): Throwable<T> {
        const nodeToRemove = this.#tail;
        if (!nodeToRemove) throw new Error();

        const value = this.#getValue(nodeToRemove)!;
        const newTail = this.#getPrev(nodeToRemove);

        this.#tail = newTail;
        if (this.#tail)
            this.#setNext(this.#tail, undefined);
        else
            this.#head = undefined;

        nodeToRemove.next = undefined;
        nodeToRemove.prev = undefined;

        this.#data.delete(nodeToRemove);
        this.#size--;
        return value;
    }

    /**
     * Removes and returns the first element of the list.
     */
    public remove(): Throwable<T> {
        const nodeToRemove = this.#head;
        if (!nodeToRemove) throw new Error();

        const value = this.#getValue(nodeToRemove)!;
        const newHead = this.#getNext(nodeToRemove);

        this.#head = newHead;

        if (this.#head) {
            this.#setPrev(this.#head, undefined);
        } else {
            this.#tail = undefined;
        }

        nodeToRemove.next = undefined;
        nodeToRemove.prev = undefined;

        this.#data.delete(nodeToRemove);
        this.#size--;
        return value;
    }

    //### LINEAR METHODS

    /**
     * Gets the number of elements in the list.
     */
    public get size(): number {
        return this.#size;
    };

    /**
     * Determines whether the list includes a certain value.
     * @param searchElement The element to search for.
     */
    public has(...items: T[]): boolean {
        if (items.length === 0) return false;
        let set = new NativeSet(items);
        for (const item of this) {
            if (set.has(item)) {
                set.delete(item);
            }
            if (set.size === 0) return true;
        }
        return false;
    }

    /**
     * Removes specific elements from the list and maintains structural integrity.
     * @param items The elements to remove.
     * @returns The number of elements actually removed.
     */
    public delete(...items: T[]): number {
        const initialSize = this.#size;
        if (initialSize === 0 || items.length === 0) return 0;

        // Usiamo un contatore per tracciare quante occorrenze di ciascun elemento dobbiamo rimuovere
        const itemsToRemove = new Map<T, number>();
        for (const item of items) {
            itemsToRemove.set(item, (itemsToRemove.get(item) ?? 0) + 1);
        }

        let node = this.#head;
        while (node && itemsToRemove.size > 0) {
            const nextNode = this.#getNext(node);
            const value = this.#data.get(node)!;

            if (itemsToRemove.has(value)) {
                const prevNode = this.#getPrev(node);

                // Aggiorna i collegamenti dei nodi adiacenti
                if (prevNode) this.#setNext(prevNode, nextNode);
                else this.#head = nextNode;

                if (nextNode) this.#setPrev(nextNode, prevNode);
                else this.#tail = prevNode;

                node.next = undefined;
                node.prev = undefined;
                this.#data.delete(node);
                this.#size--;

                const remaining = itemsToRemove.get(value)! - 1;
                if (remaining === 0) {
                    itemsToRemove.delete(value);
                } else {
                    itemsToRemove.set(value, remaining);
                }
            }
            node = nextNode;
        }

        return initialSize - this.#size;
    }

    //### INDEXABLE METHODS

    /**
     * Returns the element at the specified index. Supports negative indexing.
     * @param index Zero-based index.
     */
    public get(index: number): Throwable<T> {
        let target = index < 0 ? this.size + index : index;
        if (target < 0 || target >= this.size) throw new Error();

        const fromStart = target < this.size / 2;
        let curr = fromStart ? this.#head : this.#tail;
        let count = fromStart ? 0 : this.size - 1;

        while (curr) {
            if (count === target) {
                const value = this.#getValue(curr);
                if (!value)
                    throw new Error();
                return value
            }
            curr = fromStart ? this.#getNext(curr) : this.#getPrev(curr);
            fromStart ? count++ : count--;
        }
        throw new Error();
    }

    /**
     * Returns the index of the first occurrence of a value.
     * @param searchElement The element to locate.
     * @param fromIndex The index to start the search from.
     */
    public indexOf(searchElement: T, fromIndex: number = 0): number {
        let i = 0;
        let start = fromIndex < 0 ? Math.max(this.size + fromIndex, 0) : fromIndex;

        for (let node = this.#head; !!node; node = this.#getNext(node)) {
            if (i >= start && this.#getValue(node) === searchElement) return i;
            i++;
        }
        return -1;
    }

    /**
     * Returns the index of the last occurrence of a value.
     * @param searchElement The element to locate.
     * @param fromIndex The index to start the search from (searching backwards).
     */
    public lastIndexOf(searchElement: T, fromIndex: number = this.size - 1): number {
        let i = this.size - 1;
        let start = fromIndex < 0 ? this.size + fromIndex : fromIndex;

        for (let node = this.#tail; !!node; node = this.#getPrev(node)) {
            if (i <= start && this.#getValue(node) === searchElement) return i;
            i--;
        }
        return -1;
    }

    public set(index: number, item: T): boolean {
        let target = index < 0 ? this.size + index : index;
        if (target < 0 || target >= this.size)
            return false;

        const fromStart = target < this.size / 2;
        let curr = fromStart ? this.#head : this.#tail;
        let count = fromStart ? 0 : this.size - 1;

        while (curr) {
            if (count === target) {
                this.#data.set(curr, item);
            }
            curr = fromStart ? this.#getNext(curr) : this.#getPrev(curr);
            fromStart ? count++ : count--;
        }
        return true;
    };

    /**
     * Returns a new LinkedList containing a portion of the list.
     * @param start The beginning index.
     * @param end The end index (exclusive).
     */
    public slice(start: number = 0, end: number = this.size): LinkedList<T> {
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
        return new LinkedList<T>(sliceGenerator());
    }

    /**
     * Changes the contents of the list by removing or replacing existing elements.
     * @param start The index at which to start changing the list.
     * @param deleteCount The number of elements to remove.
     * @param items The elements to add to the list.
     * @returns A new LinkedList containing the deleted elements.
     */
    public splice(start: number, deleteCount?: number, ...items: T[]): LinkedList<T> {
        const s = start < 0 ? Math.max(this.size + start, 0) : Math.min(start, this.size);
        const d = deleteCount === undefined ? this.size - s : Math.max(Math.min(deleteCount, this.size - s), 0);

        const removed: T[] = [];

        let cursor = this.#head;
        for (let i = 0; i < s; i++)
            cursor = this.#getNext(cursor);

        for (let i = 0; i < d; i++) {
            if (!cursor) break;
            const val = this.#getValue(cursor)!;
            removed.push(val);

            const nextNode = this.#getNext(cursor);
            const prevNode = this.#getPrev(cursor);

            if (prevNode) this.#setNext(prevNode, nextNode);
            else this.#head = nextNode;

            if (nextNode) this.#setPrev(nextNode, prevNode);
            else this.#tail = prevNode;

            const toDelete = cursor;
            cursor = nextNode;

            this.#data.delete(toDelete);
            this.#size--;
        }

        for (const item of items) {
            const newNode = new LinkedListNode();
            this.#data.set(newNode, item);

            if (!cursor) {
                const beforeNode = this.#tail;
                if (!beforeNode) {
                    this.#head = newNode;
                    this.#tail = newNode;
                } else {
                    this.#setNext(beforeNode, newNode);
                    this.#setPrev(newNode, beforeNode);
                    this.#tail = newNode;
                }
            } else {
                const beforeNode = this.#getPrev(cursor);
                if (!beforeNode) {
                    this.#setNext(newNode, cursor);
                    this.#setPrev(cursor, newNode);
                    this.#head = newNode;
                } else {
                    this.#setNext(beforeNode, newNode);
                    this.#setPrev(newNode, beforeNode);
                    this.#setNext(newNode, cursor);
                    this.#setPrev(cursor, newNode);
                }
            }
            this.#size++;
        }

        return new LinkedList<T>(removed);
    }

    public forEach(callbackfn: TriConsumer<T, number, this>): void {
        let i = 0;
        for (const value of this) {
            callbackfn(value, i++, this);
        }
    }

    public toSortedList(comparator: Comparator<T>): TreeList<T> {
        return new TreeList(comparator, this);
    }

    public toArray(): T[] {
        return Array.from(this);
    }

    public stream(): Stream<T> {
        return new Stream(this);
    }

    /**
     * Sorts the elements of the list in place and returns the list.
     * @param compareFn Function used to determine the order of the elements.
     */
    public sort(compareFn: Comparator<T>): this {
        if (this.size <= 1) return this;

        let head = this.#head;

        for (let step = 1; step < this.size; step *= 2) {
            let curr: LinkedListNode | undefined = head;
            let newHead: LinkedListNode | undefined = undefined;
            let listTail: LinkedListNode | undefined = undefined;

            while (curr) {
                const left = curr;
                const right = this.#split(left, step);
                curr = this.#split(right, step);

                const merged = this.#merge(left, right, compareFn);

                if (!newHead) {
                    newHead = merged;
                } else {
                    this.#setNext(listTail!, merged);
                    if (merged) this.#setPrev(merged, listTail);
                }

                while (listTail && this.#getNext(listTail))
                    listTail = this.#getNext(listTail);
                if (!listTail) {
                    listTail = newHead;
                    while (listTail && this.#getNext(listTail))
                        listTail = this.#getNext(listTail);
                }
            }

            head = newHead;
        }

        this.#head = head;
        if (head) this.#setPrev(head, undefined);

        let logicalTail = head;
        while (logicalTail && this.#getNext(logicalTail))
            logicalTail = this.#getNext(logicalTail);
        this.#tail = logicalTail;

        return this;
    }


    /**
     * Splits the list after `n` nodes and returns the rest.
     * (invariato, già corretto)
     */
    #split(node: LinkedListNode | undefined, n: number): LinkedListNode | undefined {
        if (!node) return undefined;

        for (let i = 1; i < n && this.#getNext(node); i++)
            node = this.#getNext(node)!;

        const rest = this.#getNext(node);
        this.#setNext(node, undefined);
        if (rest) this.#setPrev(rest, undefined);
        return rest;
    }

    /**
     * Merges two sorted sublists iteratively (no recursion, O(1) stack).
     */
    #merge(left: LinkedListNode | undefined, right: LinkedListNode | undefined, compare: (a: T, b: T) => number): LinkedListNode | undefined {
        if (!left) return right;
        if (!right) return left;

        const dummy = new LinkedListNode();
        let curr: LinkedListNode = dummy;

        while (left && right) {
            const leftVal = this.#data.get(left)!;
            const rightVal = this.#data.get(right)!;

            if (compare(leftVal, rightVal) <= 0) {
                const nextLeft = this.#getNext(left);   // ← salva prima
                this.#setNext(curr, left);
                this.#setPrev(left, curr);
                this.#setNext(left, undefined);          // ← spezza il vecchio link in sicurezza
                curr = left;
                left = nextLeft;
            } else {
                const nextRight = this.#getNext(right);  // ← salva prima
                this.#setNext(curr, right);
                this.#setPrev(right, curr);
                this.#setNext(right, undefined);         // ← spezza il vecchio link in sicurezza
                curr = right;
                right = nextRight;
            }
        }

        const remainder = left ?? right;
        this.#setNext(curr, remainder);
        if (remainder) this.#setPrev(remainder, curr);

        const result = this.#getNext(dummy);
        if (result) this.#setPrev(result, undefined);
        return result;
    }

    //### SPECIFIC METHODS

    /**
     * Rotates the elements of the list.
     * @param n If positive, rotates to the right. If negative, rotates to the left.
     */
    public rotate(n: number = 1): this {
        if (this.size <= 1 || n % this.size === 0) return this;

        let k = n % this.size;
        if (k < 0) k += this.size;

        let newTailIndex = this.size - k - 1;
        let newTail = this.#head;

        if (newTailIndex < this.size / 2) {
            for (let i = 0; i < newTailIndex; i++) newTail = this.#getNext(newTail);
        } else {
            newTail = this.#tail;
            for (let i = 0; i < (this.size - 1 - newTailIndex); i++) newTail = this.#getPrev(newTail);
        }

        const newHead = this.#getNext(newTail);
        const oldHead = this.#head;
        const oldTail = this.#tail;

        if (newHead && newTail && oldHead && oldTail) {
            this.#setNext(oldTail, oldHead);
            this.#setPrev(oldHead, oldTail);

            this.#head = newHead;
            this.#tail = newTail;

            this.#setPrev(this.#head, undefined);
            this.#setNext(this.#tail, undefined);
        }

        return this;
    }

    /**
     * Remove duplicate elements in the list.
     */
    public deduplicate(): this {
        const seen = new Set<T>();
        return this.#filterInPlace((val) => {
            if (seen.has(val)) return false;
            seen.add(val);
            return true;
        });
    }

    /**
     * Reverses the order of the elements in O(1) time.
     * @returns The list instance.
     */
    public reverse(): this {
        this.#reversed = !this.#reversed;
        return this;
    }

    #filterInPlace(predicate: (value: T, index: number, obj: this) => boolean): this {
        let node = this.#head;
        let i = 0;

        while (node) {
            const val = this.#getValue(node)!;
            const next = this.#getNext(node);

            if (!predicate(val, i++, this)) {
                const p = this.#getPrev(node);
                const n = this.#getNext(node);

                if (p) this.#setNext(p, n);
                else this.#head = n;

                if (n) this.#setPrev(n, p);
                else this.#tail = p;

                node.next = undefined;
                node.prev = undefined;

                this.#data.delete(node);
                this.#size--;
            }
            node = next;
        }
        return this;
    }

    /**
     * Default iterator for the list.
     */
    *[Symbol.iterator](): IterableIterator<T> {
        for (let node = this.#head; !!node; node = this.#getNext(node))
            yield this.#getValue(node)!;
    }

    get [Symbol.toStringTag](): string { return "LinkedList" };

    public static from<S>(iterable: Iterable<S>): LinkedList<S> {
        return new LinkedList(iterable);
    }

    public static of<S>(...items: S[]): LinkedList<S> {
        return new LinkedList(items);
    }
}

type NodeColor = "RED" | "BLACK";

class TreeNode {
    left?: TreeNode;
    right?: TreeNode;
    parent?: TreeNode;
    color: NodeColor = "RED";
    count: number = 1;
}

export class TreeList<T> extends SortedList<T> implements SortedQueue<T> {
    #compareFn: Comparator<T>;
    #data = new WeakMap<TreeNode, T>();
    #root?: TreeNode;
    #size: number = 0;

    constructor(compareFn: Comparator<T>, iterable?: Iterable<T>) {
        super();
        this.#compareFn = compareFn;

        for (const item of iterable ?? []) {
            this.add(item);
        }
    }

    // --- Helper di Supporto RBT ---
    #getColor(node?: TreeNode): NodeColor {
        return node ? node.color : "BLACK"; // Le foglie/undefined sono nere
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

    /**
     * Inserisce un elemento nell'albero e lo riabilancia modificando i colori e ruotando.
     */
    public add(...items: T[]): number {
        const initialSize = this.#size;
        for (const item of items) {
            this.#insertItem(item);
        }
        return this.#size - initialSize;
    }

    #insertItem(item: T): void {
        const newNode = new TreeNode();
        this.#data.set(newNode, item);

        let y: TreeNode | undefined = undefined;
        let x = this.#root;

        while (x) {
            y = x;
            const currentVal = this.#data.get(x)!;
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
            const yVal = this.#data.get(y)!;
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

        this.#data.delete(z);
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

    public first(): Throwable<T> {
        if (!this.#root) throw new Error("List is empty");
        let curr = this.#root;
        while (curr.left) curr = curr.left;
        return this.#data.get(curr)!;
    }

    public last(): Throwable<T> {
        if (!this.#root) throw new Error("List is empty");
        let curr = this.#root;
        while (curr.right) curr = curr.right;
        return this.#data.get(curr)!;
    }

    public remove(): Throwable<T> {
        const val = this.first();
        this.delete(val);
        return val;
    }

    public removeLast(): Throwable<T> {
        const val = this.last();
        this.delete(val);
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
        const cmp = this.#compareFn(item, this.#data.get(node)!);
        if (cmp === 0) return node;
        return cmp < 0 ? this.#findNode(node.left, item) : this.#findNode(node.right, item);
    }

    public get(index: number): Throwable<T> {
        let target = index < 0 ? this.size + index : index;
        if (target < 0 || target >= this.size) throw new Error("Index out of bounds");

        let currIdx = 0;
        for (const val of this) {
            if (currIdx === target) return val as Throwable<T>;
            currIdx++;
        }
        throw new Error();
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
            if (this.#compareFn(currentVal, item) <= 0) {
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

    public toList(): List<T> { return new LinkedList(this); }
    public toArray(): T[] { return Array.from(this); }
    public stream(): Stream<T> { return new Stream(this); }

    *[Symbol.iterator](): IterableIterator<T> {
        const self = this;
        function* traverse(node?: TreeNode): Generator<T> {
            if (!node) return;
            yield* traverse(node.left);
            for (let i = 0; i < node.count; i++) {
                yield self.#data.get(node)!;
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