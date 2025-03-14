import { decodeTime } from "ulid";

import type { SessionCollection } from "../collections/SessionCollection.js";

/**
 * Session Class
 */
export class Session {
  readonly #collection: SessionCollection;
  readonly id: string;

  /**
   * Construct Session
   * @param collection Collection
   * @param id Id
   */
  constructor(collection: SessionCollection, id: string) {
    this.#collection = collection;
    this.id = id;
  }

  /**
   * Convert to string
   * @returns String
   */
  toString(): string {
    return this.name;
  }

  /**
   * Whether this object exists
   */
  get $exists(): boolean {
    return !!this.#collection.getUnderlyingObject(this.id).id;
  }

  /**
   * Time when this session was created
   */
  get createdAt(): Date {
    return new Date(decodeTime(this.id));
  }

  /**
   * Whether this is the current session
   */
  get current(): boolean {
    return this.id === this.#collection.client.sessionId;
  }

  /**
   * Name
   */
  get name(): string {
    return this.#collection.getUnderlyingObject(this.id).name;
  }

  /**
   * Rename a session
   * @param name New name
   */
  async rename(name: string): Promise<void> {
    await this.#collection.client.api.patch(`/auth/session/${this.id}`, {
      friendly_name: name,
    });

    this.#collection.updateUnderlyingObject(this.id, "name", name);
  }

  /**
   * Delete a session
   */
  async delete(): Promise<void> {
    await this.#collection.client.api.delete(`/auth/session/${this.id as ""}`);
    this.#collection.delete(this.id);
  }
}
