import {
  MessageWebhook as ApiMessageWebhook,
  DataEditMessage,
  DataMessageSend,
} from "revolt-api";
import { decodeTime } from "ulid";

import { Client, File } from "..";
import { MessageCollection } from "../collections";

/**
 * Message Class
 */
export class Message {
  readonly #collection: MessageCollection;
  readonly id: string;

  /**
   * Construct Message
   * @param collection Collection
   * @param id Message Id
   */
  constructor(collection: MessageCollection, id: string) {
    this.#collection = collection;
    this.id = id;
  }

  /**
   * Whether this object exists
   */
  get $exists() {
    return !!this.#collection.getUnderlyingObject(this.id).id;
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
    return `${this.channel?.path}/${this.id}`;
  }

  /**
   * URL to this message
   */
  get url() {
    return this.#collection.client.configuration?.app + this.path;
  }

  /**
   * Nonce value
   */
  get nonce() {
    return this.#collection.getUnderlyingObject(this.id).nonce;
  }

  /**
   * Id of channel this message was sent in
   */
  get channelId() {
    return this.#collection.getUnderlyingObject(this.id).channelId;
  }

  /**
   * Channel this message was sent in
   */
  get channel() {
    return this.#collection.client.channels.get(
      this.#collection.getUnderlyingObject(this.id).channelId
    );
  }

  /**
   * Server this message was sent in
   */
  get server() {
    return this.channel?.server;
  }

  /**
   * Member this message was sent by
   */
  get member() {
    return this.#collection.client.serverMembers.getByKey({
      server: this.channel?.serverId as string,
      user: this.authorId!,
    });
  }

  /**
   * Id of user or webhook this message was sent by
   */
  get authorId() {
    return this.#collection.getUnderlyingObject(this.id).authorId;
  }

  /**
   * User this message was sent by
   */
  get author() {
    return this.#collection.client.users.get(
      this.#collection.getUnderlyingObject(this.id).authorId!
    );
  }

  /**
   * Webhook information for this message
   */
  get webhook() {
    return this.#collection.getUnderlyingObject(this.id).webhook!;
  }

  /**
   * Content
   */
  get content() {
    return this.#collection.getUnderlyingObject(this.id).content ?? "";
  }

  /**
   * System message content
   */
  get systemMessage() {
    return this.#collection.getUnderlyingObject(this.id).systemMessage;
  }

  /**
   * Attachments
   */
  get attachments() {
    return this.#collection.getUnderlyingObject(this.id).attachments;
  }

  /**
   * Time at which this message was edited
   */
  get editedAt() {
    return this.#collection.getUnderlyingObject(this.id).editedAt;
  }

  /**
   * Embeds
   */
  get embeds() {
    return this.#collection.getUnderlyingObject(this.id).embeds;
  }

  /**
   * IDs of users this message mentions
   */
  get mentionIds() {
    return this.#collection.getUnderlyingObject(this.id).mentionIds;
  }

  /**
   * Whether this message mentions us
   */
  get mentioned() {
    return this.mentionIds?.includes(this.#collection.client.user!.id);
  }

  /**
   * IDs of messages this message replies to
   */
  get replyIds() {
    return this.#collection.getUnderlyingObject(this.id).replyIds;
  }

  /**
   * Reactions
   */
  get reactions() {
    return this.#collection.getUnderlyingObject(this.id).reactions;
  }

  /**
   * Interactions
   */
  get interactions() {
    return this.#collection.getUnderlyingObject(this.id).interactions;
  }

  /**
   * Masquerade
   */
  get masquerade() {
    return this.#collection.getUnderlyingObject(this.id).masquerade;
  }

  /**
   * Get the username for this message
   */
  get username() {
    const webhook = this.webhook;

    return (
      this.masquerade?.name ??
      (webhook ? webhook.name : this.member?.nickname ?? this.author?.username)
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
    const webhook = this.webhook;

    return (
      this.masqueradeAvatarURL ??
      (webhook
        ? webhook.avatarURL
        : this.member?.avatarURL ?? this.author?.avatarURL)
    );
  }

  /**
   * Get the animated avatar URL for this message
   */
  get animatedAvatarURL() {
    const webhook = this.webhook;

    return (
      this.masqueradeAvatarURL ??
      (webhook
        ? webhook.avatarURL
        : this.member
        ? this.member?.animatedAvatarURL
        : this.author?.animatedAvatarURL)
    );
  }

  /**
   * Avatar URL from the masquerade
   */
  get masqueradeAvatarURL() {
    const avatar = this.masquerade?.avatar;
    return avatar ? this.#collection.client.proxyFile(avatar) : undefined;
  }

  /**
   * Edit a message
   * @param data Message edit route data
   */
  async edit(data: DataEditMessage) {
    return await this.#collection.client.api.patch(
      `/channels/${this.channelId as ""}/messages/${this.id as ""}`,
      data
    );
  }

  /**
   * Delete a message
   */
  async delete() {
    return await this.#collection.client.api.delete(
      `/channels/${this.channelId as ""}/messages/${this.id as ""}`
    );
  }

  /**
   * Acknowledge this message as read
   */
  ack() {
    this.channel?.ack(this);
  }

  /**
   * Reply to Message
   */
  reply(
    data:
      | string
      | (Omit<DataMessageSend, "nonce"> & {
          nonce?: string;
        }),
    mention = true
  ) {
    const obj = typeof data === "string" ? { content: data } : data;
    return this.channel?.sendMessage({
      ...obj,
      replies: [{ id: this.id, mention }],
    });
  }

  /**
   * Clear all reactions from this message
   */
  async clearReactions() {
    return await this.#collection.client.api.delete(
      `/channels/${this.channelId as ""}/messages/${this.id as ""}/reactions`
    );
  }

  /**
   * React to a message
   * @param emoji Unicode or emoji ID
   */
  async react(emoji: string) {
    return await this.#collection.client.api.put(
      `/channels/${this.channelId as ""}/messages/${this.id as ""}/reactions/${
        emoji as ""
      }`
    );
  }

  /**
   * Un-react from a message
   * @param emoji Unicode or emoji ID
   */
  async unreact(emoji: string) {
    return await this.#collection.client.api.delete(
      `/channels/${this.channelId as ""}/messages/${this.id as ""}/reactions/${
        emoji as ""
      }`
    );
  }
}

/**
 * Message Webhook Class
 */
export class MessageWebhook {
  #client: Client;

  readonly id: string;
  readonly name: string;
  readonly avatar?: File;

  /**
   * Construct Message Webhook
   * @param client Client
   * @param webhook Webhook data
   */
  constructor(client: Client, webhook: ApiMessageWebhook, id: string) {
    this.#client = client;
    this.id = id;
    this.name = webhook.name;
    this.avatar = webhook.avatar
      ? new File(client, {
          _id: webhook.avatar,
          tag: "avatars",
          metadata: {
            type: "Image",
            width: 256,
            height: 256,
          },
        })
      : undefined;
  }

  /**
   * Get the avatar URL for this message webhook
   */
  get avatarURL() {
    return (
      this.avatar?.createFileURL({ max_side: 256 }) ??
      `${this.#client.options.baseURL}/users/${this.id}/default_avatar`
    );
  }
}
