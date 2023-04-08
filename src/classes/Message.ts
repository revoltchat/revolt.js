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
     * Absolute pathname to this message in the client
     */
    get path() {
      return `${this.channel!.path}/${this.id}`;
    }

    /**
     * URL to this message
     */
    get url() {
      return client.configuration?.app + this.path;
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
     * Server this message was sent in
     */
    get server() {
      return this.channel!.server;
    }

    /**
     * Member this message was sent by
     */
    get member() {
      return client.serverMembers.getByKey({
        server: this.channel!.serverId,
        user: this.authorId!,
      });
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

    /**
     * Get the username for this message
     */
    get username() {
      return (
        this.masquerade?.name ?? this.member?.nickname ?? this.author?.username
      );
    }

    /**
     * Get the role colour for this message
     */
    get roleColour() {
      return this.masquerade?.colour ?? this.member?.roleColour;
    }

    /**
     * Get the avatar URL for this message
     */
    get avatarURL() {
      return (
        this.masqueradeAvatarURL ??
        this.member?.avatarURL ??
        this.author?.avatarURL
      );
    }

    /**
     * Get the animated avatar URL for this message
     */
    get animatedAvatarURL() {
      return (
        this.masqueradeAvatarURL ??
        (this.member
          ? this.member?.animatedAvatarURL
          : this.author?.animatedAvatarURL)
      );
    }

    /**
     * Avatar URL from the masquerade
     */
    get masqueradeAvatarURL() {
      const avatar = this.masquerade?.avatar;
      return avatar ? client.proxyFile(avatar) : undefined;
    }

    /**
     * Populated system message
     */
    get populatedSystemMessage() {
      const system = this.systemMessage;
      if (!system) return { type: "none" };

      const { type } = system;
      const get = (id: string) => client.users.get(id);
      switch (system.type) {
        case "text":
          return system;
        case "user_added":
          return { type, user: get(system.id), by: get(system.by) };
        case "user_remove":
          return { type, user: get(system.id), by: get(system.by) };
        case "user_joined":
          return { type, user: get(system.id) };
        case "user_left":
          return { type, user: get(system.id) };
        case "user_kicked":
          return { type, user: get(system.id) };
        case "user_banned":
          return { type, user: get(system.id) };
        case "channel_renamed":
          return { type, name: system.name, by: get(system.by) };
        case "channel_description_changed":
          return { type, by: get(system.by) };
        case "channel_icon_changed":
          return { type, by: get(system.by) };
        case "channel_ownership_changed":
          return { type, from: get(system.from), to: get(system.to) };
      }
    }
  };
