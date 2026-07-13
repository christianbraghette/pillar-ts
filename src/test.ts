import { Dictionary } from "./dictionary";
import { HashTable } from "./hashtable";
import { Pipeline } from "./utils";

let test = HashTable.of([1, "Dio"], [2, "Cane"]);
test.forEach((value) => console.log(value));
test.open().then(accessor => accessor.entries()
    .map<[string, number]>(([key, value]) => [value, key])
    .filter(([_, value]) => value > 1)
    .every(([keyof, value]) => typeof value === 'number')).then(value => console.log(value));

test.open().then(test => {
    for (const i in Dictionary.from(test))
        console.log(i);
});

let pipe = Pipeline.of((n: number) => n ** 3, n => n / 4, n => String(n), str => "Result: " + str);

console.log(pipe.consume(10));