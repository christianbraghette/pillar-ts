import { LinkedList, LinkedStack, Stack } from "./collections";
import { Stream } from "./stream";
import { Consumer, Functional, Optional, pipe, UnaryOperator } from "./utils";

/*let test = HashTable.of([1, "Dio"], [2, "Cane"]);
test.forEach((value) => console.log(value));
test.open().then(accessor => accessor.entries()
    .map<[string, number]>(([key, value]) => [value, key])
    .filter(([_, value]) => value > 1)
    .every(([keyof, value]) => typeof value === 'number')).then(value => console.log(value));

test.open().then(test => {
    for (const i in Dictionary.from(test))
        console.log(i);
});

function test<S>(optional: Optional<S>) {
    return optional.get();
}

function fib() {
    return (cache: Stack<number>, n: number) => {
        if (n < 2) {
            cache.add(n);
            return n;
        }
        const n1 = cache.removeLast().get();
        const n2 = cache.removeLast().get();
        const n0 = n1 + n2;
        cache.add(n2, n1, n0);
        return n0;
    }
}

console.log("(Index, Value):", ...Stream.iterate(0, UnaryOperator.increment()).cacheMap(fib(), new LinkedStack()).until(n => !Number.isFinite(n)).reduce((prev, value, index) => [index, value], [-1, -1]));
*/

pipe((map: Map<number, string>) => map.set(1, "Dios"), Stream.from, Functional.toString()).map(Consumer.log()).call(new Map());