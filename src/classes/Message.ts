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
    static #objects: Record<string, Message> = {};

    /**
     * Get an existing Message
     * @param id Message ID
     * @returns Message
     */
    static get(id: string): Message | undefined {
      return Message.#objects[id];
    }

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
      Message.#storage.hydrate(id, "message", data);
      Message.#objects[id] = this;
      this.id = id;
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
     * Channel this message was sent in
     */
    get channel() {
      return client.channels.get(Message.#storage.get(this.id).channelId);
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
