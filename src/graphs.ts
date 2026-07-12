import { Stream } from "./stream";

abstract class Graph<V, E> {
    abstract readonly size: number;
    abstract readonly order: number;

    abstract add(...x: V[]): number;
    abstract delete(...x: V[]): number;

    abstract link(x: V, y: V, e?: E): boolean;
    abstract unlink(x: V, y: V): boolean;
    abstract get(x: V, y: V): E[];

    abstract neighbors(x: V): V[];
    abstract degree(x: V): number;
    abstract adjacent(x: V, y: V): boolean;
    abstract traverse<M extends "bfs" | "dfs">(start: V, method?: M): Stream<V>;

    /**
     * Find the shortest path
     * @param x 
     * @param y 
     */
    abstract find(x: V, y: V): Array<V[]>

    abstract edges(): Stream<[V, V, E]>;
    abstract vertices(): Stream<V>;
}

abstract class DirectedGraph<V, E> {
    abstract inDegree(x: V): number;
    abstract outDegree(x: V): number;

    abstract inNeighbors(x: V): V[];
    abstract outNeighbors(x: V): V[];
}

export class MapGraph<V, E> extends Graph<V, E> {
    // Struttura: NodoSorgente -> Map(NodoDestinazione -> Array di Archi)
    protected adjList = new Map<V, Map<V, E[]>>();
    protected _size = 0;

    get order(): number {
        return this.adjList.size;
    }

    get size(): number {
        return this._size;
    }

    add(...vertices: V[]): number {
        let added = 0;
        for (const v of vertices) {
            if (!this.adjList.has(v)) {
                this.adjList.set(v, new Map());
                added++;
            }
        }
        return added;
    }

    delete(...vertices: V[]): number {
        let deleted = 0;
        for (const v of vertices) {
            if (this.adjList.has(v)) {
                // 1. Rimuovi tutti gli archi associati a questo nodo negli altri nodi
                for (const neighbor of this.neighbors(v)) {
                    const edges = this.adjList.get(neighbor)?.get(v);
                    if (edges) {
                        this._size -= edges.length;
                        this.adjList.get(neighbor)!.delete(v);
                    }
                }
                // 2. Sottrai gli archi uscenti da questo nodo
                const selfMap = this.adjList.get(v)!;
                for (const edges of selfMap.values()) {
                    this._size -= edges.length;
                }
                // 3. Rimuovi il nodo stesso
                this.adjList.delete(v);
                deleted++;
            }
        }
        // Nota: In un grafo non orientato simmetrico, il conteggio del size 
        // va diviso per due se consideri l'arco non orientato come entità singola.
        return deleted;
    }

    link(x: V, y: V, e?: E): boolean {
        // Assicurati che i nodi esistano prima di collegarli
        this.add(x, y);

        // Collegamento x -> y
        if (!this.adjList.get(x)!.has(y)) this.adjList.get(x)!.set(y, []);
        this.adjList.get(x)!.get(y)!.push(e as E);

        // Collegamento y -> x (Grafo Non Orientato)
        if (x !== y) {
            if (!this.adjList.get(y)!.has(x)) this.adjList.get(y)!.set(x, []);
            this.adjList.get(y)!.get(x)!.push(e as E);
        }

        this._size++;
        return true;
    }

    unlink(x: V, y: V): boolean {
        if (!this.adjacent(x, y)) return false;

        const countX = this.adjList.get(x)!.get(y)!.length;
        this.adjList.get(x)!.delete(y);

        if (x !== y) {
            this.adjList.get(y)!.delete(x);
        }

        this._size -= countX;
        return true;
    }

    get(x: V, y: V): E[] {
        return this.adjList.get(x)?.get(y) || [];
    }

    neighbors(x: V): V[] {
        const nodeMap = this.adjList.get(x);
        return nodeMap ? Array.from(nodeMap.keys()) : [];
    }

    degree(x: V): number {
        const nodeMap = this.adjList.get(x);
        if (!nodeMap) return 0;
        // Conta tutti gli archi (inclusi i multi-archi)
        let count = 0;
        for (const edges of nodeMap.values()) {
            count += edges.length;
        }
        return count;
    }

    adjacent(x: V, y: V): boolean {
        return !!this.adjList.get(x)?.has(y);
    }

    traverse<M extends "bfs" | "dfs">(start: V, method: M = "bfs" as M): Stream<V> {
        if (!this.adjList.has(start)) throw new Error("Start vertex not found");

        // Sfruttiamo i generatori di JS per fare una valutazione Lazy (pigra) dello Stream
        const self = this;
        const generator = function* () {
            const visited = new Set<V>();
            const queueOrStack: V[] = [start];
            visited.add(start);

            while (queueOrStack.length > 0) {
                const current = method === "bfs" ? queueOrStack.shift()! : queueOrStack.pop()!;
                yield current;

                for (const neighbor of self.neighbors(current)) {
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor);
                        queueOrStack.push(neighbor);
                    }
                }
            }
        };

        return Stream.from(generator());
    }

    find(x: V, y: V): Array<V[]> {
        if (!this.adjList.has(x) || !this.adjList.has(y)) return [];
        if (x === y) return [[x]];

        // BFS modificata per trovare TUTTI i cammini minimi (Shortest Paths)
        const paths: Array<V[]> = [];
        const queue: Array<V[]> = [[x]];
        const distances = new Map<V, number>();
        distances.set(x, 0);

        while (queue.length > 0) {
            const path = queue.shift()!;
            const current = path[path.length - 1];

            if (current === y) {
                paths.push(path);
                continue;
            }

            for (const neighbor of this.neighbors(current)) {
                const currDist = distances.get(neighbor);
                const newDist = path.length;

                if (currDist === undefined || newDist <= currDist) {
                    distances.set(neighbor, newDist);
                    queue.push([...path, neighbor]);
                }
            }
        }

        // Filtra tenendo solo quelli che hanno effettivamente la lunghezza minima trovata
        if (paths.length === 0) return [];
        const minLen = Math.min(...paths.map(p => p.length));
        return paths.filter(p => p.length === minLen);
    }

    vertices(): Stream<V> {
        return Stream.from(this.adjList.keys());
    }

    edges(): Stream<[V, V, E]> {
        const self = this;
        const generator = function* () {
            const visitedEdges = new Set<string>(); // Per evitare duplicati nei grafi non orientati
            for (const [u, map] of self.adjList.entries()) {
                for (const [v, edges] of map.entries()) {
                    // Creiamo una chiave univoca per l'arco non orientato
                    const edgeKey = [String(u), String(v)].sort().join("-");
                    if (!visitedEdges.has(edgeKey)) {
                        visitedEdges.add(edgeKey);
                        for (const edgeData of edges) {
                            yield [u, v, edgeData] as [V, V, E];
                        }
                    }
                }
            }
        };
        return Stream.from(generator());
    }
}

export class MapDirectedGraph<V, E> extends MapGraph<V, E> implements DirectedGraph<V, E> {

    // Sovrascriviamo il link: x -> y NON implica y -> x
    override link(x: V, y: V, e?: E): boolean {
        this.add(x, y);

        if (!this.adjList.get(x)!.has(y)) this.adjList.get(x)!.set(y, []);
        this.adjList.get(x)!.get(y)!.push(e as E);

        this._size++;
        return true;
    }

    override unlink(x: V, y: V): boolean {
        if (!this.adjacent(x, y)) return false;

        const count = this.adjList.get(x)!.get(y)!.length;
        this.adjList.get(x)!.delete(y);
        this._size -= count;
        return true;
    }

    // InDegree: quanti archi entrano in x
    inDegree(x: V): number {
        let count = 0;
        for (const [node, map] of this.adjList.entries()) {
            if (node !== x && map.has(x)) {
                count += map.get(x)!.length;
            }
        }
        return count;
    }

    // OutDegree: quanti archi escono da x (coincide con degree nel parent)
    outDegree(x: V): number {
        return this.degree(x);
    }

    inNeighbors(x: V): V[] {
        const res: V[] = [];
        for (const [node, map] of this.adjList.entries()) {
            if (map.has(x)) res.push(node);
        }
        return res;
    }

    outNeighbors(x: V): V[] {
        return this.neighbors(x);
    }

    // Sovrascriviamo edges() perché nel diretto x->y e y->x sono archi distinti!
    override edges(): Stream<[V, V, E]> {
        const self = this;
        const generator = function* () {
            for (const [u, map] of self.adjList.entries()) {
                for (const [v, edges] of map.entries()) {
                    for (const edgeData of edges) {
                        yield [u, v, edgeData] as [V, V, E];
                    }
                }
            }
        };
        return Stream.from(generator());
    }
}