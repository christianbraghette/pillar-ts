/**
 * A BitSet implements a vector of bits that grows as needed.
 * Each component of the bit set has a boolean value. 
 * Extremely memory efficient for large sets of integers.
 */
export class BitSet {
    #words: Uint32Array;
    #size: number = 0;

    /**
     * @param size The initial number of bits (rounded up to the nearest 32-bit word).
     */
    constructor(size?: number)
    constructor(array?: Uint32Array)
    constructor(arg?: Uint32Array | number) {
        if (arg instanceof Uint32Array) {
            this.#words = Uint32Array.from(arg);
            this.#recalculateSize();
        } else {
            this.#words = new Uint32Array(Math.ceil((arg ?? 32) / 32));
        }
    }

    /**
     * Returns the number of bits set to true.
     */
    public get size(): number {
        return this.#size;
    }

    /**
     * Sets the bit at the specified index to true.
     * @param index The index of the bit to set.
     */
    public set(...indexes: number[]): number {
        const size = this.#size;
        for (const index of indexes) {
            if (index < 0) continue;
            this.#ensureCapacity(index);

            const wordIndex = index >>> 5; // Equivalente a Math.floor(index / 32)
            const bitIndex = index & 31;  // Equivalente a index % 32

            const oldWord = this.#words[wordIndex];
            this.#words[wordIndex] |= (1 << bitIndex);

            if (this.#words[wordIndex] !== oldWord) {
                this.#size++;
            }
        }
        return this.#size - size;
    }

    /**
     * Sets the bit at the specified index to false.
     * @param index The index of the bit to clear.
     */
    public clear(...indexes: number[]): number {
        const size = this.#size;
        for (const index of indexes) {
            if (index < 0 || index >= this.#words.length * 32) continue;

            const wordIndex = index >>> 5;
            const bitIndex = index & 31;

            const oldWord = this.#words[wordIndex];
            this.#words[wordIndex] &= ~(1 << bitIndex);

            if (this.#words[wordIndex] !== oldWord)
                this.#size--;
        }
        return size - this.#size;
    }

    /**
     * Checks if the bit at the specified index is set to true.
     * @param index The index of the bit to check.
     */
    public has(...indexes: number[]): boolean {
        if (indexes.length === 0 || this.#size === 0) return false;
        for (const index of indexes) {
            const wordIndex = index >>> 5;
            if (wordIndex >= this.#words.length) return false;

            const bitIndex = index & 31;
            if ((this.#words[wordIndex] & (1 << bitIndex)) === 0)
                return false;
        }
        return true;
    }

    /**
     * Performs a logical AND with another BitSet.
     */
    public and(other: BitSet): BitSet {
        const target = new BitSet(this.#words);
        const minLen = Math.min(target.#words.length, other.#words.length);
        for (let i = 0; i < minLen; i++) {
            target.#words[i] &= other.#words[i];
        }
        // I bit rimanenti diventano 0 perché non sono presenti in 'other'
        for (let i = minLen; i < target.#words.length; i++) {
            target.#words[i] = 0;
        }
        target.#recalculateSize();
        return target;
    }

    /**
     * Performs a logical OR with another BitSet.
     */
    public or(other: BitSet): BitSet {
        const target = new BitSet(this.#words);
        target.#ensureCapacity(other.#words.length * 32 - 1);
        for (let i = 0; i < other.#words.length; i++) {
            target.#words[i] |= other.#words[i];
        }
        target.#recalculateSize();
        return target;
    }

    /**
     * Performs a logical NOT only on the active part of the set.
     */
    public not(): BitSet {
        if (this.#size === 0) {
            return new BitSet(0);
        }

        let lastWordIndex = this.#words.length - 1;
        while (lastWordIndex >= 0 && this.#words[lastWordIndex] === 0) {
            lastWordIndex--;
        }

        if (lastWordIndex < 0) return new BitSet(0);

        const lastWord = this.#words[lastWordIndex];
        const lastBitIndexInWord = 31 - Math.clz32(lastWord);

        const target = new BitSet((lastWordIndex + 1) * 32);

        // 4. Inverti completamente tutte le word precedenti
        for (let i = 0; i < lastWordIndex; i++) {
            target.#words[i] = ~this.#words[i] >>> 0;
        }

        const mask = (1 << (lastBitIndexInWord + 1)) - 1;

        target.#words[lastWordIndex] = (~this.#words[lastWordIndex] & mask) >>> 0;

        target.#recalculateSize();

        return target;
    }

    #ensureCapacity(bitIndex: number): void {
        const wordIndex = bitIndex >>> 5;
        if (wordIndex >= this.#words.length) {
            const newWords = new Uint32Array(wordIndex + 1);
            newWords.set(this.#words);
            this.#words = newWords;
        }
    }

    #recalculateSize(): void {
        let count = 0;
        for (let i = 0; i < this.#words.length; i++) {
            let v = this.#words[i];
            // Brian Kernighan's algorithm
            while (v) {
                v &= v - 1;
                count++;
            }
        }
        this.#size = count;
    }

    public *[Symbol.iterator](): IterableIterator<number> {
        for (let i = 0; i < this.#words.length; i++) {
            let word = this.#words[i];
            if (word === 0) continue;
            for (let j = 0; j < 32; j++) {
                if ((word & (1 << j)) !== 0) {
                    yield (i << 5) + j;
                }
            }
        }
    }
}