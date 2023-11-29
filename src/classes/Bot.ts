import { DataEditBot } from "revolt-api";
import { decodeTime } from "ulid";

import { BotCollection } from "../collections";

/**
 * Bot Class
 */
export class Bot {
  readonly #collection: BotCollection;
  readonly id: string;

  /**
   * Construct Bot
   * @param collection Collection
   * @param id Id
   */
  constructor(collection: BotCollection, id: string) {
    this.#collection = collection;
    this.id = id;
  }

  /**
   * Convert to string
   * @returns String
   */
  toString() {
    return `<@${this.id}>`;
  }

  /**
   * Whether this object exists
   */
  get $exists() {
    return !!this.#collection.getUnderlyingObject(this.id).id;
  }

  /**
   * Time when this user created their account
   */
  get createdAt() {
    return new Date(decodeTime(this.id));
  }

  /**
   * Corresponding user
   */
  get user() {
    return this.#collection.client.users.get(this.id);
  }

  /**
   * Owner's Id
   */
  get ownerId() {
    return this.#collection.getUnderlyingObject(this.id).ownerId;
  }

  /**
   * Owner
   */
  get owner() {
    return this.#collection.client.users.get(this.ownerId);
  }

  /**
   * Bot Token
   */
  get token() {
    return this.#collection.getUnderlyingObject(this.id).token;
  }

  /**
   * Whether this bot can be invited by anyone
   */
  get public() {
    return this.#collection.getUnderlyingObject(this.id).public;
  }

  /**
   * Whether this bot has analytics enabled
   */
  get analytics() {
    return this.#collection.getUnderlyingObject(this.id).analytics;
  }

  /**
   * Whether this bot shows up on Discover
   */
  get discoverable() {
    return this.#collection.getUnderlyingObject(this.id).discoverable;
  }

  /**
   * Interactions URL
   */
  get interactionsUrl() {
    return this.#collection.getUnderlyingObject(this.id).interactionsUrl;
  }

  /**
   * Link to terms of service
   */
  get termsOfServiceUrl() {
    return this.#collection.getUnderlyingObject(this.id).termsOfServiceUrl;
  }

  /**
   * Link to privacy policy
   */
  get privacyPolicyUrl() {
    return this.#collection.getUnderlyingObject(this.id).privacyPolicyUrl;
  }

  /**
   * Bot Flags
   */
  get flags() {
    return this.#collection.getUnderlyingObject(this.id).flags;
  }

  /**
   * Edit a bot
   * @param data Changes
   */
  async edit(data: DataEditBot) {
    await this.#collection.client.api.patch(`/bots/${this.id as ""}`, data);
  }

  /**
   * Delete a bot
   */
  async delete() {
    await this.#collection.client.api.delete(`/bots/${this.id as ""}`);
    this.#collection.delete(this.id);
  }
}
