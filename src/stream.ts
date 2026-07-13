import { Structure } from ".";
import { Collection, KeyNotFoundError } from "./collections";
import { Dictionary } from "./dictionary";
import { BiConsumer, BiFunctional, BiPredicate, Comparator, Executor, Functional, MultiFunctional } from "./functional";
import { ArrayList, LinkedList, TreeList } from "./list";
import { HashMap, TreeMap } from "./map";
import { PriorityQueue } from "./queue";
import { Throwable } from "./result";
import { HashSet, TreeSet } from "./set";


export type Collector<T, C extends Structure> = Functional<Iterable<T>, C>;

export class Collectors {
    public static Dictionary<T>(): (iterable: Iterable<[keyof any, T]>) => Dictionary<T> {
        return (iterable: Iterable<[keyof any, T]>) => new Dictionary(iterable);
    }

    public static ArrayList<T>(): (iterable: Iterable<T>) => ArrayList<T> {
        return (iterable: Iterable<T>) => new ArrayList(iterable);
    }

    public static LinkedList<T>(): (iterable: Iterable<T>) => LinkedList<T> {
        return (iterable: Iterable<T>) => new LinkedList(iterable);
    }

    public static SortedLinkedList<T>(compareFn: Comparator<T>): (iterable: Iterable<T>) => TreeList<T> {
        return (iterable: Iterable<T>) => new TreeList(compareFn, iterable);
    }

    public static HashSet<T>(): (iterable: Iterable<T>) => HashSet<T> {
        return (iterable: Iterable<T>) => new HashSet(iterable);
    }

    public static TreeSet<T>(compareFn: Comparator<T>): (iterable: Iterable<T>) => TreeSet<T> {
        return (iterable: Iterable<T>) => new TreeSet(compareFn, iterable);
    }

    public static PriorityQueue<T>(compareFn: Comparator<T>): (iterable: Iterable<T>) => PriorityQueue<T> {
        return (iterable: Iterable<T>) => new PriorityQueue(compareFn, iterable);
    }

    public static HashMap<K, V>(): (iterable: Iterable<[K, V]>) => HashMap<K, V> {
        return (iterable: Iterable<[K, V]>) => new HashMap(iterable);
    }

    public static TreeMap<K, V>(compareFn: Comparator<K>): (iterable: Iterable<[K, V]>) => TreeMap<K, V> {
        return (iterable: Iterable<[K, V]>) => new TreeMap(compareFn, iterable);
    }
}

interface GroupByAccessor<K, V> {
    get(key: K): Throwable<Collection<V>, KeyNotFoundError>;
}

export class Stream<T> implements Iterable<T>, AsyncIterable<T> {
    #source: Iterable<T>;
    #locked = false;

    constructor(iterable: Iterable<T>) {
        this.#source = iterable;
    }

    #lock(): Iterable<T> {
        if (this.#locked)
            throw new Error("Pipeline locked");
        this.#locked = true;
        return this.#source;
    }

    public get locked(): boolean {
        return this.#locked;
    }

    /*public concat<S>(...others: Iterable<S>[]): Stream<T | S> {
        return new Stream((function* (self: Iterable<T>) {
            yield* self;
            for (const iterable of others)
                yield* iterable;
        })(this.#lock()));
    }*/

    public take(count: number, offset: number = 0): Stream<T> {
        const source = this.#lock();
        return new Stream(
            (function* () {
                let i = 0;
                for (const val of source) {
                    if (i >= count + offset) break;
                    if (i >= offset)
                        yield val;
                    i++;
                }
            })()
        );
    }

    public takeWhile(predicate: BiPredicate<T, number>): Stream<T> {
        const source = this.#lock();
        return new Stream((function* () {
            let i = 0;
            for (const value of source) {
                if (!predicate(value, i++)) break;
                yield value;
            }
        })());
    }

    public drop(offset: number): Stream<T> {
        const source = this.#lock();
        return new Stream(
            (function* () {
                let i = 0;
                for (const val of source) {
                    if (i >= offset)
                        yield val;
                    i++;
                }
            })()
        );
    }

    public dropWhile(predicate: BiPredicate<T, number>): Stream<T> {
        const source = this.#lock();
        return new Stream((function* () {
            let i = 0;
            let dropping = true;
            for (const value of source) {
                if (dropping && predicate(value, i++)) continue;
                dropping = false;
                yield value;
            }
        })());
    }

    public limit(count: number): Stream<T> {
        const source = this.#lock();
        return new Stream(
            (function* () {
                let i = 0;
                for (const val of source) {
                    if (i >= count) break;
                    yield val;
                    i++;
                }
            })()
        );
    }

    public limitWhen(predicate: BiPredicate<T, number>): Stream<T> {
        const source = this.#lock();
        return new Stream(
            (function* () {
                let i = 0;
                for (const val of source) {
                    if (predicate(val, i++)) break;
                    yield val;
                }
            })()
        );
    }

    //Functionals

    public map<U>(callbackfn: BiFunctional<T, number, U>): Stream<U> {
        const source = this.#lock();
        return new Stream(
            (function* (): IterableIterator<U> {
                let i = 0;
                for (const value of source)
                    yield callbackfn(value, i++);
            })()
        );
    }

    public filter<S extends T>(predicate: BiPredicate<T, number>): Stream<S> {
        const source = this.#lock();
        return new Stream(
            (function* () {
                let i = 0;
                for (const value of source) {
                    if (predicate(value, i++)) {
                        yield value as S;
                    }
                }
            })()
        );
    }

    public flatMap<U>(callbackfn: BiFunctional<T, number, U | Stream<U>>): Stream<U> {
        const source = this.#lock();
        return new Stream((function* () {
            let i = 0
            for (const value of source) {
                const mapped = callbackfn(value, i++);
                if (mapped instanceof Stream) {
                    yield* mapped;
                } else {
                    yield mapped;
                }
            }
        })()
        );
    }

    public peek(callbackfn: BiConsumer<T, number>, returnFn?: Executor): Stream<T> {
        const source = this.#lock();
        return new Stream((function* () {
            let i = 0;
            for (const value of source) {
                callbackfn(value, i++);
                yield value;
            }
            returnFn?.();
        })());
    }

    //Collectors

    public forEach(callbackfn: BiConsumer<T, number>): void {
        this.#lock();
        let i = 0;
        for (const value of this.#source)
            callbackfn(value, i++);
    }

    public reduce<U>(callbackfn: MultiFunctional<[U, T, number], U>, initialValue: U): U {
        this.#lock();
        let i = 0;
        let accumulator = initialValue;
        for (const value of this.#source) {
            accumulator = callbackfn(accumulator, value, i++);
        }
        return accumulator;
    }

    public find<S extends T>(predicate: BiPredicate<T, number>): S | undefined {
        this.#lock();
        let i = 0;
        for (const value of this.#source) {
            if (predicate(value, i++)) {
                return value as S;
            }
        }
        return undefined;
    }

    public findLast<S extends T>(predicate: BiPredicate<T, number>): S | undefined {
        this.#lock();
        let i = 0;
        let target: S | undefined = undefined;
        for (const value of this.#source)
            if (predicate(value, i++))
                target = value as S;
        return target;
    }

    public some(predicate: BiPredicate<T, number>): boolean {
        this.#lock();
        let i = 0;
        for (const value of this.#source) {
            if (predicate(value, i++)) {
                return true;
            }
        }
        return false;
    }

    public every(predicate: BiPredicate<T, number>): boolean {
        this.#lock();
        let i = 0;
        for (const value of this.#source) {
            if (!predicate(value, i++)) {
                return false;
            }
        }
        return true;
    }

    public sort(compareFn: Comparator<T>): Stream<T> {
        const source = this.#lock();
        return new Stream((function* () {
            yield* new TreeList(compareFn, source);
        })())
    }

    public reverse(): Stream<T> {
        const source = this.#lock();
        return new Stream((function* () {
            yield* new LinkedList(source).reverse();
        })())
    }

    public distinct(): Stream<T> {
        const source = this.#lock();
        return new Stream((function* () {
            yield* new HashSet(source)
        })());
    }

    public count(): number {
        this.#lock();
        let count = 0;
        for (const _ of this.#source)
            count++;
        return count;
    }

    public min(compareFn: Comparator<T>): T | undefined {
        this.#lock();
        let min: T | undefined = undefined;
        for (const value of this.#source) {
            min ??= value;
            if (compareFn(value, min) < 0) min = value;
        }
        return min;
    }

    public max(compareFn: Comparator<T>): T | undefined {
        this.#lock();
        let max: T | undefined = undefined;
        for (const value of this.#source) {
            max ??= value;
            if (compareFn(max, value) < 0) max = value;
        }
        return max;
    }

    public buffer(size?: number): Stream<T[]> {
        const source = this.#lock();
        if (!size) {
            return new Stream([Array.from(source)])
        }
        return new Stream(
            (function* () {
                let cache = new Array<T>(size);
                let i = 0;
                for (const value of source) {
                    cache[i++] = value;
                    if (i >= size) {
                        yield cache;
                        cache = new Array<T>(size);
                        i = 0;
                    }
                }
                if (i > 0) yield cache.slice(0, i);
            })()
        );
    }

    public groupby<K>(keyFn: BiFunctional<T, number, K>): GroupByAccessor<K, T> {
        this.#lock();
        const cache = new HashMap<K, LinkedList<T>>();
        let i = 0;
        for (const value of this.#source) {
            const key = keyFn(value, i++);
            if (!cache.has(key))
                cache.set(key, new LinkedList());
            cache.get(key)?.add(value);
        }
        return cache;
    }

    public *sink(): IterableIterator<T> {
        this.#lock();
        yield* this.#source;
    }

    public toStream(): ReadableStream<T> {
        const source = this.#lock();
        return new ReadableStream({
            start(controller) {
                for (const value of source)
                    controller.enqueue(value)
                controller.close();
            },
        })
    }

    public collect<C extends Structure>(collector: Collector<T, C>): C {
        this.#lock();
        return collector(this.#source);
    }

    public toArray() {
        return Array.from(this);
    }

    [Symbol.iterator](): IterableIterator<T> {
        return this.sink();
    }

    async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
        yield* this.sink()
    }

    get [Symbol.toStringTag](): string { return "SyncStream"; }

    public static join<S extends any[]>(...iterables: Iterable<S[keyof S]>[]): Stream<S> {
        const iterators = iterables.map(val => val[Symbol.iterator]()) as Iterator<S>[];

        return new Stream(
            (function* () {
                while (true) {
                    var res = iterators.map(val => val.next());
                    if (res.some(val => val.done)) break;
                    yield res.map(val => val.value) as S;
                };
            })()
        );
    }

    public static of<S>(...items: S[]): Stream<S> {
        return new Stream(items);
    }

    public static from<S>(iterable: Iterable<S>): Stream<S> {
        return new Stream(iterable);
    }

    public static fromObject<S>(obj: Record<string | number, S>): Stream<[string, S]> {
        return new Stream(Object.entries(obj));
    }
}