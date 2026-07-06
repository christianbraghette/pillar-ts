import { Dictionary } from "./dictionary";
import { HashMap } from "./map";

let test = HashMap.of([1, "Dio"], [2, "Cane"]);
test.forEach((value) => console.log(value));
console.log(test.entries().map<[string, number]>(([key, value]) => [value, key]).filter(([_, value]) => value > 1).every(([keyof, value]) => typeof value === 'number'));

for (const i in Dictionary.from(test))
    console.log(i);