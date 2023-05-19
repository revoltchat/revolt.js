import { SetStoreFunction } from "solid-js/store";

import { ReactiveMap } from "@solid-primitives/map";

import { Client } from "..";
import { Hydrators } from "../hydration";
import { ObjectStorage } from "../storage/ObjectStorage";

/**
 * Abstract Collection type
 */
export abstract class Collection<T> {
  /**
   * Get an existing object
   * @param id Id
   * @returns Object
   */
  abstract get(id: string): T | undefined;

  /**
   * Check whether an id exists in the Collection
   * @param id Id
   * @returns Whether it exists
   */
  abstract has(id: string): boolean;

  /**
   * Delete an object
   * @param id Id
   */
  abstract delete(id: string): void;

  /**
   * Number of stored objects
   * @returns Size
   */
  abstract size(): number;

  /**
   * Iterable of keys in the map
   * @returns Iterable
   */
  abstract keys(): IterableIterator<string>;

  /**
   * Iterable of values in the map
   * @returns Iterable
   */
  abstract values(): IterableIterator<T>;

  /**
   * Iterable of key, value pairs in the map
   * @returns Iterable
   */
  abstract entries(): IterableIterator<[string, T]>;

  /**
   * Execute a provided function over each key, value pair in the map
   * @param cb Callback for each pair
   */
  abstract forEach(
    cb: (value: T, key: string, map: ReactiveMap<string, T>) => void
  ): void;

  /**
   * List of values in the map
   * @returns List
   */
  toList() {
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
  }
}

/**
 * Collection backed by a Solid.js Store
 */
export abstract class StoreCollection<T, V> extends Collection<T> {
  #storage = new ObjectStorage<V>();
  #objects = new ReactiveMap<string, T>();
  readonly getUnderlyingObject: (id: string) => V;
  readonly updateUnderlyingObject: SetStoreFunction<Record<string, V>>;

  /**
   * Construct store backed collection
   */
  constructor() {
    super();
    this.getUnderlyingObject = (key) => this.#storage.get(key) ?? ({} as V);
    this.updateUnderlyingObject = this.#storage.set;
  }

  /**
   * Get an existing object
   * @param id Id
   * @returns Object
   */
  get(id: string): T | undefined {
    return this.#objects.get(id);
  }

  /**
   * Check whether an id exists in the Collection
   * @param id Id
   * @returns Whether it exists
   */
  has(id: string) {
    return this.#objects.has(id);
  }

  /**
   * Delete an object
   * @param id Id
   */
  delete(id: string): void {
    this.#objects.delete(id);
    this.updateUnderlyingObject(id, undefined as never);
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
    data?: unknown
  ) {
    this.#storage.hydrate(id, type, context, data);
    this.#objects.set(id, instance);
  }

  /**
   * Check whether an object is partially defined
   * @param id Id
   * @returns Whether it is a partial
   */
  isPartial(id: string): boolean {
    return !!(this.getUnderlyingObject(id) as { partial: boolean }).partial;
  }

  /**
   * Number of stored objects
   * @returns Size
   */
  size() {
    return this.#objects.size;
  }

  /**
   * Iterable of keys in the map
   * @returns Iterable
   */
  keys() {
    return this.#objects.keys();
  }

  /**
   * Iterable of values in the map
   * @returns Iterable
   */
  values() {
    return this.#objects.values();
  }

  /**
   * Iterable of key, value pairs in the map
   * @returns Iterable
   */
  entries() {
    return this.#objects.entries();
  }

  /**
   * Execute a provided function over each key, value pair in the map
   * @param cb Callback for each pair
   * @returns Iterable
   */
  forEach(cb: (value: T, key: string, map: ReactiveMap<string, T>) => void) {
    return this.#objects.forEach(cb);
  }
}

/**
 * Generic class collection backed by store
 */
export class ClassCollection<T, V> extends StoreCollection<T, V> {
  readonly client: Client;

  /**
   * Create generic class collection
   * @param client Client
   */
  constructor(client: Client) {
    super();
    this.client = client;
  }
}
