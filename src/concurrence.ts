import { ArrayList, Queue } from "./collections";
import { Consumer, Executor, Supplier } from "./functional";

type RejectReason = 'reset' | 'error' | 'timeout';

export interface SemaphoreLock<T> {
    get(): T;
    release(): void;
    readonly locked: boolean;
}

class QueueNode<T> {
    constructor(public readonly resolve: Consumer<SemaphoreLock<T>>, public readonly reject: Consumer<RejectReason>) { }
}

export class Semaphore<T> {
    #supplier: Supplier<T>;
    #count: number;
    #maxCount: number;
    readonly #queue: Queue<QueueNode<T>> = new ArrayList<QueueNode<T>>();

    public constructor(supplier: Supplier<T>, maxCount: number) {
        this.#supplier = supplier;
        this.#count = maxCount;
        this.#maxCount = maxCount;
    }

    public get maxCount(): number {
        return this.#maxCount;
    }

    public get count(): number {
        return this.#count;
    }

    public get locked(): boolean {
        return this.#count < 1;
    };

    public get waiters(): number {
        return this.#queue.size;
    }

    readonly #resolver = () => {
        if (this.#count++ < 0)
            this.#queue.remove().get().resolve(new LockConstructor(this.#supplier(), this.#resolver));
    }

    public acquire(timeoutMs?: number): Promise<SemaphoreLock<T>> {
        if (this.#count > 0) {
            this.#count--;
            return Promise.resolve<SemaphoreLock<T>>(new LockConstructor(this.#supplier(), this.#resolver));
        }
        return new Promise((resolve, reject) => {
            this.#count--;

            let timeout: number;

            const entry = new QueueNode((lock: SemaphoreLock<T>) => {
                clearTimeout(timeout);
                resolve(lock);
            }, reject);

            if (timeoutMs)
                timeout = setTimeout(() => {
                    this.#queue.delete(entry)
                    reject('timeout');
                }, timeoutMs)

            this.#queue.add(entry);
        });
    }

    public tryAcquire(): SemaphoreLock<T> | undefined {
        if (this.#count > 0) {
            this.#count--;
            return new LockConstructor(this.#supplier(), this.#resolver);
        }
        return;
    }

    public releaseAll(): void {
        for(let node = this.#queue.remove(); node.some(); node = this.#queue.remove())
            node.get().resolve(LockConstructor.released(this.#supplier()));
        this.#count = this.#maxCount;
    }

    public rejectAll(): void {
        for(let node = this.#queue.remove(); node.some(); node = this.#queue.remove())
            node.get().reject('reset');
        this.#count = this.#maxCount;
    }

    public async run(callbackFn: (obj: T, release: Executor) => void, ms?: number): Promise<void> {
        const lock = await this.acquire(ms);
        try {
            return callbackFn(this.#supplier(), lock.release);
        } catch (error) {
            throw error;
        } finally {
            lock.release();
        }
    }
}

export class Mutex<T> extends Semaphore<T> {
    constructor(obj: T) {
        super(() => obj, 1);
    }
}

class LockConstructor<T> implements SemaphoreLock<T> {
    #obj: T;
    #released: boolean;
    #releaser?: Executor;

    constructor(obj: T, releaser?: Executor, released: boolean = false) {
        this.#obj = obj;
        this.#released = released;
        this.#releaser = releaser;
    }

    public get(): T {
        return this.#obj;
    }

    public get release(): Executor {
        return () => {
            if (this.#released) return;
            this.#released = true;
            this.#releaser?.();
        }
    };

    public get locked() {
        return !this.#released;
    }

    public static released<S>(obj: S): SemaphoreLock<S> {
        return new LockConstructor(obj, undefined, true);
    }

}