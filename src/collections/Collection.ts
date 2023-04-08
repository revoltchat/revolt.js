import { SetStoreFunction } from "solid-js/store";

import { ReactiveMap } from "@solid-primitives/map";

import { Hydrators, hydrate } from "../hydration";
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
   * List of values in the map
   * @returns List
   */
  toList() {
    return [...this.values()];
  }

  /**
   * Execute a provided function over each key, value pair in the map
   * @param cb Callback for each pair
   */
  abstract forEach(
    cb: (value: T, key: string, map: ReactiveMap<string, T>) => void
  ): void;
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
    this.getUnderlyingObject = this.#storage.get;
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
   * @param data Data
   */
  create(id: string, type: keyof Hydrators, instance: T, data?: unknown) {
    this.#storage.hydrate(id, type, data);
    this.#objects.set(id, instance);
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
