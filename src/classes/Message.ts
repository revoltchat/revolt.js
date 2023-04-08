import { SetStoreFunction } from "solid-js/store";

import type { Message as ApiMessage } from "revolt-api";
import { decodeTime } from "ulid";

import { Client } from "../Client";
import { StoreCollection } from "../collections/Collection";
import { HydratedMessage } from "../hydration/message";

export default (
  client: Client,
  collection: StoreCollection<unknown, unknown>
) =>
  /**
   * Message Class
   */
  class Message {
    static #collection: StoreCollection<
      InstanceType<typeof this>,
      HydratedMessage
    >;
    static #set: SetStoreFunction<Record<string, HydratedMessage>>;
    static #get: (id: string) => HydratedMessage;

    static {
      Message.#collection = collection as never;
      Message.#set = collection.updateUnderlyingObject as never;
      Message.#get = collection.getUnderlyingObject as never;
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
      const message = Message.#collection.get(messageId);
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
      Message.#collection.create(id, "message", this, data);
    }

    /**
     * Get or create
     * @param id Id
     * @param data Data
     */
    static new(id: string, data?: ApiMessage) {
      return client.messages.get(id) ?? new Message(id, data);
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
      return Message.#get(this.id).nonce;
    }

    /**
     * Id of channel this message was sent in
     */
    get channelId() {
      return Message.#get(this.id).channelId;
    }

    /**
     * Channel this message was sent in
     */
    get channel() {
      return client.channels.get(Message.#get(this.id).channelId);
    }

    /**
     * Id of user this message was sent by
     */
    get authorId() {
      return Message.#get(this.id).authorId;
    }

    /**
     * User this message was sent by
     */
    get author() {
      return client.users.get(Message.#get(this.id).authorId!);
    }

    /**
     * Content
     */
    get content() {
      return Message.#get(this.id).content;
    }

    /**
     * System message content
     */
    get systemMessage() {
      return Message.#get(this.id).systemMessage;
    }

    /**
     * Attachments
     */
    get attachments() {
      return Message.#get(this.id).attachments;
    }

    /**
     * Time at which this message was edited
     */
    get editedAt() {
      return Message.#get(this.id).editedAt;
    }

    /**
     * Embeds
     */
    get embeds() {
      return Message.#get(this.id).embeds;
    }

    /**
     * IDs of users this message mentions
     */
    get mentionIds() {
      return Message.#get(this.id).mentionIds;
    }

    /**
     * IDs of messages this message replies to
     */
    get replyIds() {
      return Message.#get(this.id).replyIds;
    }

    /**
     * Reactions
     */
    get reactions() {
      return Message.#get(this.id).reactions;
    }

    /**
     * Interactions
     */
    get interactions() {
      return Message.#get(this.id).interactions;
    }

    /**
     * Masquerade
     */
    get masquerade() {
      return Message.#get(this.id).masquerade;
    }
  };
