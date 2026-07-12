import { Dictionary } from "./dictionary";
import { HashTable } from "./hashtable";

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