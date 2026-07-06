import type { Collection } from "./collections";
import type { Map } from "./map";

export type Structure = Collection<any> | Map<any, any>;

//Utils
export { Optional } from "./optional";
export { Result } from "./result";
export { Dictionary } from "./dictionary";
export { BitSet } from "./bitset";
export * from "./functional";

//Stream
export * from "./stream";

//Collections
export {
    Collection, List, Queue, Deque, Set, SortedSet,
    Stack, LinkedList, ArrayList, SortedLinkedList,
    PriorityQueue, HashSet, TreeSet, LinkedStack
} from "./collections";

//Maps
export { Map, SortedMap, HashMap, TreeMap } from "./map";