import { Queue } from "./collections";
import { Consumer, Executor, Functional } from "./functional";
import { LinkedList } from "./list";

/**
 * Represents Lock state and release methods
 * 
 * ⚠️ This is automatically provided by `acquire`.
 */
export interface Lock {
    readonly locked: boolean;
    readonly release: Executor;
}

type RejectReason = 'reset' | 'error';

class QueueNode {
    constructor(public readonly resolve: Consumer<Lock>, public readonly reject: Consumer<RejectReason>) { }
}

export class Semaphore {
    #count: number;
    #maxCount: number;
    readonly #queue: Queue<QueueNode> = new LinkedList<QueueNode>();

    public constructor(maxCount: number) {
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

    public acquire(timeoutMs?: number): Promise<Lock>
    public acquire(signal: AbortSignal): Promise<Lock>
    public acquire(arg?: AbortSignal | number): Promise<Lock> | void {
        if (this.#count > 0) {
            this.#count--;
            return Promise.resolve<Lock>(new Semaphore.#Lock(this));
        }
        return new Promise((resolve, reject) => {
            this.#count--;

            let timeoutId: any;
            let abortSignal: AbortSignal | undefined;

            if (arg instanceof AbortSignal) {
                abortSignal = arg;
            } else if (typeof arg === 'number') {
                const controller = new AbortController();
                timeoutId = setTimeout(() => controller.abort(), arg);
                abortSignal = controller.signal;
            }

            let entry: QueueNode;

            if (abortSignal) {
                if (abortSignal.aborted) {
                    this.#count++;
                    return reject(new Error(typeof arg === 'number' ? "Acquire timeout" : "Acquire aborted"));
                }

                entry = new QueueNode((lock: Lock | PromiseLike<Lock>) => {
                    if (timeoutId) clearTimeout(timeoutId);
                    abortSignal?.removeEventListener('abort', abortHandler);
                    resolve(lock);
                }, reject);

                const abortHandler = () => {
                    if (timeoutId) clearTimeout(timeoutId);
                    if (this.#queue.delete(entry)) {
                        this.#count++;
                    }
                    reject(new Error(typeof arg === 'number' ? "Acquire timeout" : "Acquire aborted"));
                };

                abortSignal.addEventListener('abort', abortHandler, { once: true });
            } else {
                entry = new QueueNode(resolve, reject)
            }

            this.#queue.add(entry);
        });
    }

    public tryAcquire(): Lock | undefined {
        if (this.#count > 0) {
            this.#count--;
            return new Semaphore.#Lock(this);
        }
        return;
    }

    public releaseAll(): void {
        while (this.#queue.size > 0)
            this.#queue.remove()?.resolve(new Semaphore.#Lock(undefined, true));
        this.#count = this.#maxCount;
    }

    public reset(): void {
        while (this.#queue.size > 0)
            this.#queue.remove()?.reject('reset');
        this.#count = this.#maxCount;
    }

    public async run<T>(callbackFn: Functional<Executor, T>, ms?: number): Promise<T> {
        const lock = await this.acquire(ms);
        try {
            return callbackFn(lock.release);
        } catch (error) {
            throw error;
        } finally {
            lock.release();
        }
    }

    static #Lock = class implements Lock {
        #released: boolean;

        constructor(semaphore: Semaphore)
        constructor(semaphore?: Semaphore, released?: boolean)
        constructor(semaphore?: Semaphore, released: boolean = false) {
            this.#released = released;
            this.release = () => {
                if (this.#released) return;
                this.#released = true;
                if (semaphore && semaphore.#count++ < 0)
                    semaphore.#queue.remove().resolve(new Semaphore.#Lock(semaphore));
            }
        }

        declare public readonly release: Executor;

        public get locked() {
            return !this.#released;
        }

        public static released(): Lock {
            return new Semaphore.#Lock(undefined, true);
        }

    }
}

export class Mutex extends Semaphore {
    public constructor() {
        super(1);
    }
}