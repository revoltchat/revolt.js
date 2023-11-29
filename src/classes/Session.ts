import { decodeTime } from "ulid";

import { SessionCollection } from "../collections";

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
  toString() {
    return this.name;
  }

  /**
   * Whether this object exists
   */
  get $exists() {
    return !!this.#collection.getUnderlyingObject(this.id).id;
  }

  /**
   * Time when this session was created
   */
  get createdAt() {
    return new Date(decodeTime(this.id));
  }

  /**
   * Whether this is the current session
   */
  get current() {
    return this.id === this.#collection.client.sessionId;
  }

  /**
   * Name
   */
  get name() {
    return this.#collection.getUnderlyingObject(this.id).name;
  }

  /**
   * Rename a session
   * @param name New name
   */
  async rename(name: string) {
    await this.#collection.client.api.patch(`/auth/session/${this.id}`, {
      friendly_name: name,
    });

    this.#collection.updateUnderlyingObject(this.id, "name", name);
  }

  /**
   * Delete a session
   */
  async delete() {
    await this.#collection.client.api.delete(`/auth/session/${this.id as ""}`);
    this.#collection.delete(this.id);
  }
}
