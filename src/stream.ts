import { Collection, KeyNotFoundError } from "./collections";
import { Dictionary } from "./dictionary";
import { BiConsumer, BiFunctional, BiPredicate, Comparator, Executor, Functional, Supplier, TriFunctional, UnaryOperator } from "./functional";
import { ArrayList, LinkedList, TreeList } from "./list";
import { HashMap, TreeMap } from "./map";
import { AsyncIterableObject, IterableObject } from "./objects";
import { PriorityQueue } from "./queue";
import { Throwable } from "./result";
import { HashSet, TreeSet } from "./set";
import { LinkedStack } from "./stack";


export type Collector<T, C> = Functional<Iterable<T>, C>;

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

    public static TreeList<T>(compareFn: Comparator<T>): (iterable: Iterable<T>) => TreeList<T> {
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

    public static LinkedStack<T>(): (iterable: Iterable<T>) => LinkedStack<T> {
        return (iterable: Iterable<T>) => new LinkedStack(iterable);
    }
}

interface GroupByAccessor<K, V> {
    get(key: K): Throwable<Collection<V>, KeyNotFoundError>;
}

class StreamLockedError extends Error {
    constructor() {
        super("Stream locked");
    }
}

class StreamConstructor<T> extends AsyncIterableObject<T> implements AsyncIterable<T> {
    #source: Supplier<Iterable<T>>;
    #locked = false;
    #reusable: boolean;

    constructor(supplier: Supplier<Iterable<T>>, reusable: boolean) {
        super()
        this.#source = supplier;
        this.#reusable = !!reusable;
    }

    #lock(): Iterable<T> {
        if (this.#locked)
            throw new StreamLockedError();
        if (!this.#reusable)
            this.#locked = true;
        return this.#source();
    }

    public get locked(): boolean {
        return this.#locked;
    }

    public take(count: number, offset: number = 0): Stream<T> {
        const source = this.#lock();
        return new Stream(
            function* () {
                let i = 0;
                for (const val of source) {
                    if (i >= count + offset) break;
                    if (i >= offset)
                        yield val;
                    i++;
                }
            }
        );
    }

    public drop(offset: number): Stream<T> {
        const source = this.#lock();
        return new Stream(
            function* () {
                let i = 0;
                for (const val of source) {
                    if (i >= offset)
                        yield val;
                    i++;
                }
            }
        );
    }

    public limit(count: number): Stream<T> {
        const source = this.#lock();
        return new Stream(
            function* () {
                let i = 0;
                for (const val of source) {
                    if (i >= count) break;
                    yield val;
                    i++;
                }
            }
        );
    }

    public while(predicate: BiPredicate<T, number>): Stream<T> {
        const source = this.#lock();
        return new Stream(function* () {
            let i = 0;
            for (const value of source) {
                if (!predicate(value, i++)) break;
                yield value;
            }
        });
    }

    public skip(predicate: BiPredicate<T, number>): Stream<T> {
        const source = this.#lock();
        return new Stream(function* () {
            let i = 0;
            let dropping = true;
            for (const value of source) {
                if (dropping && predicate(value, i++)) continue;
                dropping = false;
                yield value;
            }
        });
    }

    public until(predicate: BiPredicate<T, number>): Stream<T> {
        const source = this.#lock();
        return new Stream(
            function* () {
                let i = 0;
                for (const val of source) {
                    if (predicate(val, i++)) break;
                    yield val;
                }
            }
        );
    }

    public map<U>(callbackfn: BiFunctional<T, number, U>): Stream<U> {
        const source = this.#lock();
        return new Stream(
            function* (): IterableIterator<U> {
                let i = 0;
                for (const value of source)
                    yield callbackfn(value, i++);
            }
        );
    }

    public cacheMap<U, R>(callbackfn: TriFunctional<U, T, number, R>, cache: U): Stream<R> {
        let i = 0;
        const source = this.#lock();
        return new Stream(function* () {
            for (const value of source) {
                yield callbackfn(cache, value, i++);
            }
        })
    }

    public flatMap<U>(callbackfn: BiFunctional<T, number, U | Stream<U>>): Stream<U> {
        const source = this.#lock();
        return new Stream(function* () {
            let i = 0
            for (const value of source) {
                const mapped = callbackfn(value, i++);
                if (mapped instanceof Stream) {
                    yield* mapped;
                } else {
                    yield mapped;
                }
            }
        });
    }

    public filter<S extends T>(predicate: BiPredicate<T, number>): Stream<S> {
        const source = this.#lock();
        return new Stream(
            function* () {
                let i = 0;
                for (const value of source) {
                    if (predicate(value, i++)) {
                        yield value as S;
                    }
                }
            }
        );
    }

    public peek(callbackfn: BiConsumer<T, number>): Stream<T> {
        const source = this.#lock();
        return new Stream(function* () {
            let i = 0;
            for (const value of source) {
                callbackfn(value, i++);
                yield value;
            }
        });
    }

    public on(opts: {
        call?: Executor,
        peek?: BiConsumer<T, number>,
        return?: Executor
    }): Stream<T> {
        const source = this.#lock();
        return new Stream(function* () {
            opts.call?.();
            if (opts.peek) {
                let i = 0;
                for (const value of source) {
                    opts.peek(value, i++);
                    yield value;
                }
            } else {
                yield* source;
            }
            opts.return?.();
        });
    }

    public forEach(callbackfn: BiConsumer<T, number>): void {
        let i = 0;
        for (const value of this.#lock())
            callbackfn(value, i++);
    }

    public reduce<U>(callbackfn: TriFunctional<U, T, number, U>, initialValue: U): U {
        let i = 0;
        let accumulator = initialValue;
        for (const value of this.#lock()) {
            accumulator = callbackfn(accumulator, value, i++);
        }
        return accumulator;
    }

    public find<S extends T>(predicate: BiPredicate<T, number>): S | undefined {
        let i = 0;
        for (const value of this.#lock()) {
            if (predicate(value, i++)) {
                return value as S;
            }
        }
        return undefined;
    }

    public findLast<S extends T>(predicate: BiPredicate<T, number>): S | undefined {
        let i = 0;
        let target: S | undefined = undefined;
        for (const value of this.#lock())
            if (predicate(value, i++))
                target = value as S;
        return target;
    }

    public some(predicate: BiPredicate<T, number>): boolean {
        let i = 0;
        for (const value of this.#lock()) {
            if (predicate(value, i++)) {
                return true;
            }
        }
        return false;
    }

    public every(predicate: BiPredicate<T, number>): boolean {
        let i = 0;
        for (const value of this.#lock()) {
            if (!predicate(value, i++)) {
                return false;
            }
        }
        return true;
    }

    public sort(compareFn: Comparator<T>): Stream<T> {
        const source = this.#lock();
        return new Stream(function* () {
            yield* new TreeList(compareFn, source);
        })
    }

    public reverse(): BufferedStream<T> {
        const source = this.#lock();
        let buffer: LinkedList<T> | undefined;
        return new BufferedStream(() => {
            if (!buffer)
                buffer = new LinkedList(source).reverse();
            return buffer;
        });
    }

    public distinct(): BufferedStream<T> {
        const source = this.#lock();
        const set = new HashSet<T>();
        let loaded = false;
        return new BufferedStream(function* () {
            if (!loaded)
                for (const value of source) {
                    if (set.has(value)) continue;
                    set.add(value);
                    yield value;
                }
            else
                yield *set;
        });
    }

    public count(): number {
        let count = 0;
        for (const _ of this.#lock())
            count++;
        return count;
    }

    public min(compareFn: Comparator<T>): T | undefined {
        let min: T | undefined = undefined;
        for (const value of this.#lock()) {
            min ??= value;
            if (compareFn(value, min) < 0) min = value;
        }
        return min;
    }

    public max(compareFn: Comparator<T>): T | undefined {
        let max: T | undefined = undefined;
        for (const value of this.#lock()) {
            max ??= value;
            if (compareFn(max, value) < 0) max = value;
        }
        return max;
    }

    public buffer(): BufferedStream<T> {
        const source = this.#lock();
        const buffer = new LinkedList<T>();
        let loaded = false;
        return new BufferedStream(function* () {
            if (!loaded) {
                for (const value of source) {
                    buffer.add(value);
                    yield value;
                }
                loaded = true;
                return;
            }
            yield* buffer;
        });
    }

    public groupby<K>(keyFn: BiFunctional<T, number, K>): GroupByAccessor<K, T> {
        const cache = new HashMap<K, LinkedList<T>>();
        let i = 0;
        for (const value of this.#lock()) {
            const key = keyFn(value, i++);
            if (!cache.has(key))
                cache.set(key, new LinkedList());
            cache.get(key)?.add(value);
        }
        return cache;
    }

    public *sink(): IterableIterator<T> {
        yield* this.#lock();
    }

    public drain(): void {
        for (const _ of this.#lock());
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

    public collect<C>(collector: Collector<T, C>): C {
        return collector(this.#lock());
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

    public static join<S>(...iterables: Iterable<S>[]): Stream<S[]> {
        const iterators = iterables.map(val => val[Symbol.iterator]()) as Iterator<S>[];

        return new Stream(
            function* () {
                while (true) {
                    var res = iterators.map(val => val.next());
                    if (res.some(val => val.done)) break;
                    yield res.map(val => val.value) as S[];
                };
            }
        );
    }

    public static generate<S>(supplier: Supplier<S>): Stream<S> {
        return new Stream(function* () {
            while (true) {
                yield supplier();
            }
        });
    }

    public static iterate<S>(startValue: S, fn: UnaryOperator<S>): Stream<S> {
        return new Stream(function* () {
            let currentValue = startValue;
            yield currentValue;
            while (true) {
                currentValue = fn(currentValue);
                yield currentValue;
            }
        });
    }

    public static concat<S>(...iterables: Iterable<S>[]): Stream<S> {
        return new Stream(function* () {
            for (const iterable of iterables)
                yield* iterable;
        });
    }

    public static of<S>(...items: S[]): Stream<S> {
        return new Stream(() => items);
    }

    public static from<S>(iterable: Iterable<S>): Stream<S> {
        return new Stream(() => iterable);
    }

    public static fromObject<S>(obj: Record<string | number, S>): Stream<[string, S]> {
        return new Stream(() => Object.entries(obj));
    }
}

export class Stream<T> extends StreamConstructor<T> {
    constructor(supplier: Supplier<Iterable<T>>) {
        super(supplier, false)
    }
}

class BufferedStream<T> extends StreamConstructor<T> {
    constructor(supplier: Supplier<Iterable<T>>) {
        super(supplier, true);
    }

    public stream(): Stream<T> {
        return new Stream(() => this.sink())
    }
}