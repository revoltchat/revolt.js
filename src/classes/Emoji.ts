import type { Emoji as ApiEmoji } from "revolt-api";
import { decodeTime } from "ulid";

import { Client } from "../Client";
import { HydratedEmoji } from "../hydration/emoji";
import { ObjectStorage } from "../storage/ObjectStorage";

export default (client: Client) =>
  /**
   * Emoji Class
   */
  class Emoji {
    static #storage = new ObjectStorage<HydratedEmoji>();
    static #objects: Record<string, Emoji> = {};

    /**
     * Get an existing Emoji
     * @param id Emoji ID
     * @returns Emoji
     */
    static get(id: string): Emoji | undefined {
      return Emoji.#objects[id];
    }

    /**
     * Fetch emoji by ID
     * @param id ID
     * @returns Emoji
     */
    static async fetch(id: string): Promise<Emoji | undefined> {
      const emoji = Emoji.get(id);
      if (emoji) return emoji;

      const data = await client.api.get(`/custom/emoji/${id as ""}`);
      return new Emoji(id, data);
    }

    readonly id: string;

    /**
     * Construct Emoji
     * @param id Emoji Id
     */
    constructor(id: string, data?: ApiEmoji) {
      Emoji.#storage.hydrate(id, "emoji", data);
      Emoji.#objects[id] = this;
      this.id = id;
    }

    /**
     * Time when this emoji was created
     */
    get createdAt() {
      return new Date(decodeTime(this.id));
    }

    /**
     * Information about the parent of this emoji
     */
    get parent() {
      return Emoji.#storage.get(this.id).parent;
    }

    /**
     * Creator of the emoji
     */
    get creator() {
      return client.users.get(Emoji.#storage.get(this.id).creatorId);
    }

    /**
     * Name
     */
    get name() {
      return Emoji.#storage.get(this.id).name;
    }

    /**
     * Whether the emoji is animated
     */
    get animated() {
      return Emoji.#storage.get(this.id).animated;
    }

    /**
     * Whether the emoji is marked as mature
     */
    get mature() {
      return Emoji.#storage.get(this.id).nsfw;
    }
  };
