import { ReactiveMap } from "@solid-primitives/map";
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

    // * Object Map Definition
    static #objects = new ReactiveMap<string, InstanceType<typeof this>>();

    /**
     * Get an existing object
     * @param id ID
     * @returns Object
     */
    static get(id: string): InstanceType<typeof this> | undefined {
      return this.#objects.get(id);
    }

    /**
     * Number of stored objects
     * @returns Size
     */
    static size() {
      return this.#objects.size;
    }

    /**
     * Iterable of keys in the map
     * @returns Iterable
     */
    static keys() {
      return this.#objects.keys();
    }

    /**
     * Iterable of values in the map
     * @returns Iterable
     */
    static values() {
      return this.#objects.values();
    }

    /**
     * List of values in the map
     * @returns List
     */
    static toList() {
      return [...this.#objects.values()];
    }

    /**
     * Iterable of key, value pairs in the map
     * @returns Iterable
     */
    static entries() {
      return this.#objects.entries();
    }

    /**
     * Execute a provided function over each key, value pair in the map
     * @param cb Callback for each pair
     * @returns Iterable
     */
    static forEach(
      cb: (
        value: InstanceType<typeof this>,
        key: string,
        map: ReactiveMap<string, InstanceType<typeof this>>
      ) => void
    ) {
      return this.#objects.forEach(cb);
    }
    // * End Object Map Definition

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
      this.id = id;
      Emoji.#storage.hydrate(id, "emoji", data);
      Emoji.#objects.set(id, this);
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
