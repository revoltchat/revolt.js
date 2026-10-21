import { DataEditWebhook, DataMessageSend } from "stoat-api";

import type { ChannelWebhookCollection } from "../collections/ChannelWebhookCollection.js";
import { hydrate } from "../hydration/index.js";

import type { Channel } from "./Channel.js";
import type { File } from "./File.js";
import { Message } from "./Message.js";
import { ulid } from "ulid";

/**
 * Channel Webhook Class
 */
export class ChannelWebhook {
  readonly #collection: ChannelWebhookCollection;
  readonly id: string;

  /**
   * Construct Channel Webhook
   * @param collection Collection
   * @param id Webhook
   */
  constructor(collection: ChannelWebhookCollection, id: string) {
    this.#collection = collection;
    this.id = id;
  }

  /**
   * Whether this object exists
   */
  get $exists(): boolean {
    return !!this.#collection.getUnderlyingObject(this.id).id;
  }

  /**
   * Webhook name
   */
  get name(): string {
    return this.#collection.getUnderlyingObject(this.id).name;
  }

  /**
   * Webhook avatar
   */
  get avatar(): File | undefined {
    return this.#collection.getUnderlyingObject(this.id).avatar;
  }

  /**
   * Webhook avatar URL
   */
  get avatarURL(): string | undefined {
    return this.#collection
      .getUnderlyingObject(this.id)
      .avatar?.createFileURL();
  }

  /**
   * Channel ID this webhook belongs to
   */
  get channelId(): string {
    return this.#collection.getUnderlyingObject(this.id).channelId;
  }

  /**
   * Channel this webhook belongs to
   */
  get channel(): Channel | undefined {
    return this.#collection.client.channels.get(
      this.#collection.getUnderlyingObject(this.id).channelId,
    );
  }

  /**
   * Secret token for sending messages to this webhook
   */
  get token(): string {
    return this.#collection.getUnderlyingObject(this.id).token;
  }

  /**
   * Edit this webhook
   */
  async edit(data: DataEditWebhook): Promise<void> {
    const webhook = await this.#collection.client.api.patch(
      `/webhooks/${this.id as ""}/${this.token as ""}`,
      data,
    );

    this.#collection.updateUnderlyingObject(
      this.id,
      hydrate("channelWebhook", webhook, this.#collection.client),
    );
  }

  /**
   * Delete this webhook
   */
  async delete(): Promise<void> {
    await this.#collection.client.api.delete(
      `/webhooks/${this.id}/${this.token}`,
    );

    this.#collection.delete(this.id);
  }

  /**
   * Send a message through this webhook
   * @param data Either the message as a string or message sending route data
   * @returns Sent message
   */
  async sendMessage(
    data: string | DataMessageSend,
    idempotencyKey: string = ulid(),
  ): Promise<Message> {
    const msg: DataMessageSend =
      typeof data === "string" ? { content: data } : data;

    // Mark as silent message
    if (msg.content?.startsWith("@silent ")) {
      msg.content = msg.content.substring(8);
      msg.flags ||= 1;
      msg.flags |= 1;
    }

    const message = await this.#collection.client.api.post(
      `/webhooks/${this.id as ""}/${this.token as ""}`,
      msg,
      {
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
      },
    );

    return this.#collection.client.messages.getOrCreate(
      message._id,
      message,
      true,
    );
  }
}
