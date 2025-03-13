import { Hydrators, hydrate } from "../hydration/index.js";

/**
 * Wrapper around Solid.js store
 */
export class ObjectStorage<T> {
  private store: Record<string, T> = {};

  /**
   * Get object by ID
   * @param id ID
   * @returns Object
   */
  get(id: string) {
    return this.store[id];
  }

  /**
   * Set object by ID
   * @param id ID
   * @param value New value
   */
  set(id: string, value: T) {
    this.store[id] = value;
  }

  /**
   * Hydrate some data into storage
   * @param id ID
   * @param type Hydration type
   * @param context Context
   * @param data Input Data
   */
  hydrate(id: string, type: keyof Hydrators, context: unknown, data?: unknown) {
    if (data) {
      data = { partial: false, ...data };
      this.set(id, hydrate(type, data as never, context, true) as T);
    }
  }
}
