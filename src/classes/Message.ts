import { ReactiveMap } from "@solid-primitives/map";
import type { Message as ApiMessage } from "revolt-api";
import { decodeTime } from "ulid";

import { Client } from "../Client";
import { HydratedMessage } from "../hydration/message";
import { ObjectStorage } from "../storage/ObjectStorage";

export default (client: Client) =>
  /**
   * Message Class
   */
  class Message {
    static #storage = new ObjectStorage<HydratedMessage>();

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
     * Fetch message by ID
     * @param channelId Channel ID
     * @param messageId Message ID
     * @returns Message
     */
    static async fetch(
      channelId: string,
      messageId: string
    ): Promise<Message | undefined> {
      const message = Message.get(messageId);
      if (message) return message;

      const data = await client.api.get(
        `/channels/${channelId as ""}/messages/${messageId as ""}`
      );
      return new Message(messageId, data);
    }

    readonly id: string;

    /**
     * Construct Message
     * @param id Message Id
     */
    constructor(id: string, data?: ApiMessage) {
      this.id = id;
      Message.#storage.hydrate(id, "message", data);
      Message.#objects.set(id, this);
    }

    /**
     * Time when this message was posted
     */
    get createdAt() {
      return new Date(decodeTime(this.id));
    }

    /**
     * Nonce value
     */
    get nonce() {
      return Message.#storage.get(this.id).nonce;
    }

    /**
     * Id of channel this message was sent in
     */
    get channelId() {
      return Message.#storage.get(this.id).channelId;
    }

    /**
     * Channel this message was sent in
     */
    get channel() {
      return client.channels.get(Message.#storage.get(this.id).channelId);
    }

    /**
     * Id of user this message was sent by
     */
    get authorId() {
      return Message.#storage.get(this.id).authorId;
    }

    /**
     * User this message was sent by
     */
    get author() {
      return client.users.get(Message.#storage.get(this.id).authorId!);
    }

    /**
     * Content
     */
    get content() {
      return Message.#storage.get(this.id).content;
    }

    /**
     * System message content
     */
    get systemMessage() {
      return Message.#storage.get(this.id).systemMessage;
    }

    /**
     * Attachments
     */
    get attachments() {
      return Message.#storage.get(this.id).attachments;
    }

    /**
     * Time at which this message was edited
     */
    get editedAt() {
      return Message.#storage.get(this.id).editedAt;
    }

    /**
     * Embeds
     */
    get embeds() {
      return Message.#storage.get(this.id).embeds;
    }

    /**
     * IDs of users this message mentions
     */
    get mentionIds() {
      return Message.#storage.get(this.id).mentionIds;
    }

    /**
     * IDs of messages this message replies to
     */
    get replyIds() {
      return Message.#storage.get(this.id).replyIds;
    }

    /**
     * Reactions
     */
    get reactions() {
      return Message.#storage.get(this.id).reactions;
    }

    /**
     * Interactions
     */
    get interactions() {
      return Message.#storage.get(this.id).interactions;
    }

    /**
     * Masquerade
     */
    get masquerade() {
      return Message.#storage.get(this.id).masquerade;
    }
  };
