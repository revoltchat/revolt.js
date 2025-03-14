import { DataEditBot } from "revolt-api";
import { decodeTime } from "ulid";

import { BotCollection } from "../collections/BotCollection.js";
import { BotFlags } from "../hydration/bot.js";

import { User } from "./User.js";

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
  toString(): string {
    return `<@${this.id}>`;
  }

  /**
   * Whether this object exists
   */
  get $exists(): boolean {
    return !!this.#collection.getUnderlyingObject(this.id).id;
  }

  /**
   * Time when this user created their account
   */
  get createdAt(): Date {
    return new Date(decodeTime(this.id));
  }

  /**
   * Corresponding user
   */
  get user(): User | undefined {
    return this.#collection.client.users.get(this.id);
  }

  /**
   * Owner's Id
   */
  get ownerId(): string {
    return this.#collection.getUnderlyingObject(this.id).ownerId;
  }

  /**
   * Owner
   */
  get owner(): User | undefined {
    return this.#collection.client.users.get(this.ownerId);
  }

  /**
   * Bot Token
   */
  get token(): string {
    return this.#collection.getUnderlyingObject(this.id).token;
  }

  /**
   * Whether this bot can be invited by anyone
   */
  get public(): boolean {
    return this.#collection.getUnderlyingObject(this.id).public;
  }

  /**
   * Whether this bot has analytics enabled
   */
  get analytics(): boolean {
    return this.#collection.getUnderlyingObject(this.id).analytics;
  }

  /**
   * Whether this bot shows up on Discover
   */
  get discoverable(): boolean {
    return this.#collection.getUnderlyingObject(this.id).discoverable;
  }

  /**
   * Interactions URL
   */
  get interactionsUrl(): string | undefined {
    return this.#collection.getUnderlyingObject(this.id).interactionsUrl;
  }

  /**
   * Link to terms of service
   */
  get termsOfServiceUrl(): string | undefined {
    return this.#collection.getUnderlyingObject(this.id).termsOfServiceUrl;
  }

  /**
   * Link to privacy policy
   */
  get privacyPolicyUrl(): string | undefined {
    return this.#collection.getUnderlyingObject(this.id).privacyPolicyUrl;
  }

  /**
   * Bot Flags
   */
  get flags(): BotFlags {
    return this.#collection.getUnderlyingObject(this.id).flags;
  }

  /**
   * Edit a bot
   * @param data Changes
   */
  async edit(data: DataEditBot): Promise<void> {
    await this.#collection.client.api.patch(`/bots/${this.id as ""}`, data);
  }

  /**
   * Delete a bot
   */
  async delete(): Promise<void> {
    await this.#collection.client.api.delete(`/bots/${this.id as ""}`);
    this.#collection.delete(this.id);
  }
}
