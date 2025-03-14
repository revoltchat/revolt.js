import { Client } from "../Client.js";
import { Hydrators, hydrate } from "../hydration/index.js";

/**
 * Collection backed by a store
 */
export class Collection<T, V> {
  #storage = new Map<string, V>();
  #objects = new Map<string, T>();

  /**
   * Construct store backed collection
   */
  constructor(public readonly client: Client) {}

  /**
   * Get an existing object
   * @param id Id
   */
  get(id: string): T | undefined {
    return this.#objects.get(id);
  }

  /**
   * Get an underlying object
   */
  getUnderlyingObject(id: string): V {
    return this.#storage.get(id) ?? ({} as V);
  }

  /**
   * Set a key of an underlying object
   */
  setUnderlyingKey<K extends keyof V>(id: string, key: K, value: V[K]): void {
    this.#storage.set(id, {
      [key]: value,
      ...((this.#storage.get(id) ?? {}) as V),
    });
  }

  /**
   * Set an underlying object
   */
  setUnderlyingObject(id: string, value: V): void {
    this.#storage.set(id, value);
  }

  /**
   * Check whether an id exists in the Collection
   * @param id Id
   * @returns Whether it exists
   */
  has(id: string): boolean {
    return this.#objects.has(id);
  }

  /**
   * Check whether the underlying id exists
   * @param id Id
   * @returns Whether it exists
   */
  hasUnderlying(id: string): boolean {
    return !!((this.#storage.get(id) as { id: string }) ?? { id: false }).id;
  }

  /**
   * Delete an object
   * @param id Id
   */
  delete(id: string): void {
    this.#objects.delete(id);
    this.#storage.delete(id);
  }

  /**
   * Create a new instance of an object
   * @param id Id
   * @param type Type
   * @param instance Instance
   * @param context Context
   * @param data Data
   */
  create(
    id: string,
    type: keyof Hydrators,
    instance: T,
    context: unknown,
    data?: unknown,
  ): void {
    if (data) {
      this.#storage.set(
        id,
        hydrate(type, { partial: false, ...data } as never, context, true) as V,
      );
    }
    this.#objects.set(id, instance);
  }

  /**
   * Check whether an object is partially defined
   * @param id Id
   * @returns Whether it is a partial
   */
  isPartial(id: string): boolean {
    return !!(
      (this.#storage.get(id) ?? { partial: true }) as { partial: boolean }
    ).partial;
  }

  /**
   * Number of stored objects
   * @returns Size
   */
  size(): number {
    return this.#objects.size;
  }

  /**
   * Iterable of keys in the map
   * @returns Iterable
   */
  keys(): MapIterator<string> {
    return this.#objects.keys();
  }

  /**
   * Iterable of values in the map
   * @returns Iterable
   */
  values(): MapIterator<T> {
    return this.#objects.values();
  }

  /**
   * Iterable of key, value pairs in the map
   * @returns Iterable
   */
  entries(): MapIterator<[string, T]> {
    return this.#objects.entries();
  }

  /**
   * Execute a provided function over each key, value pair in the map
   * @param cb Callback for each pair
   */
  forEach(cb: (value: T, key: string, map: Map<string, T>) => void): void {
    return this.#objects.forEach(cb);
  }

  /**
   * List of values in the map
   * @returns List
   */
  toList(): T[] {
    return [...this.values()];
  }

  /**
   * Filter the collection by a given predicate
   * @param predicate Predicate to satisfy
   */
  filter(predicate: (value: T, key: string) => boolean): T[] {
    const list: T[] = [];
    for (const [key, value] of this.entries()) {
      if (predicate(value, key)) {
        list.push(value);
      }
    }

    return list;
  }

  /**
   * Map the collection using a given callback
   * @param cb Callback
   */
  map<O>(cb: (value: T, key: string) => O): O[] {
    const list: O[] = [];
    for (const [key, value] of this.entries()) {
      list.push(cb(value, key));
    }

    return list;
  }

  /**
   * Find some value based on a predicate
   * @param predicate Predicate to satisfy
   */
  find(predicate: (value: T, key: string) => boolean): T | undefined {
    for (const [key, value] of this.entries()) {
      if (predicate(value, key)) {
        return value;
      }
    }
    return undefined;
  }
}
