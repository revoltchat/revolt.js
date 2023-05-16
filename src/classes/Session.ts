import { DataEditSession } from "revolt-api";
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
   * Time when this session was created
   */
  get createdAt() {
    return new Date(decodeTime(this.id));
  }

  /**
   * Name
   */
  get name() {
    return this.#collection.getUnderlyingObject(this.id).name;
  }

  /**
   * Edit a session
   * @param data Changes
   */
  async edit(data: DataEditSession) {
    await this.#collection.client.api.patch(`/auth/session/${this.id}`, data);
  }

  /**
   * Delete a session
   */
  async delete() {
    await this.#collection.client.api.delete(`/auth/session/${this.id as ""}`);
    this.#collection.delete(this.id);
  }
}
