import { SetStoreFunction } from "solid-js/store";

import type { Emoji as ApiEmoji } from "revolt-api";
import { decodeTime } from "ulid";

import { Client } from "../Client";
import { StoreCollection } from "../collections/Collection";
import { HydratedEmoji } from "../hydration/emoji";

export default (
  client: Client,
  collection: StoreCollection<unknown, unknown>
) =>
  /**
   * Emoji Class
   */
  class Emoji {
    static #collection: StoreCollection<
      InstanceType<typeof this>,
      HydratedEmoji
    >;
    static #set: SetStoreFunction<Record<string, HydratedEmoji>>;
    static #get: (id: string) => HydratedEmoji;

    static {
      Emoji.#collection = collection as never;
      Emoji.#set = collection.updateUnderlyingObject as never;
      Emoji.#get = collection.getUnderlyingObject as never;
    }

    /**
     * Fetch emoji by ID
     * @param id ID
     * @returns Emoji
     */
    static async fetch(id: string): Promise<Emoji | undefined> {
      const emoji = Emoji.#collection.get(id);
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
      this.id = id;
      Emoji.#collection.create(id, "emoji", this, data);
    }

    /**
     * Get or create
     * @param id Id
     * @param data Data
     */
    static new(id: string, data?: ApiEmoji) {
      return client.emojis.get(id) ?? new Emoji(id, data);
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
      return Emoji.#get(this.id).parent;
    }

    /**
     * Creator of the emoji
     */
    get creator() {
      return client.users.get(Emoji.#get(this.id).creatorId);
    }

    /**
     * Name
     */
    get name() {
      return Emoji.#get(this.id).name;
    }

    /**
     * Whether the emoji is animated
     */
    get animated() {
      return Emoji.#get(this.id).animated;
    }

    /**
     * Whether the emoji is marked as mature
     */
    get mature() {
      return Emoji.#get(this.id).nsfw;
    }
  };
