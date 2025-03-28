import * as APITmp from "revolt-api";

import type { ChannelWebhookCollection } from "../collections/ChannelWebhookCollection.js";
import { hydrate } from "../hydration/index.js";

import type { Channel } from "./Channel.js";
import type { File } from "./File.js";

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
   * TODO: not in production
   */
  async edit(
    data: Partial<{
      name: string;
      avatar: string;
      permissions: number;
      remove: ["Icon"];
    }>,
  ): Promise<void> {
    // @ts-expect-error this should error once edit webhook is stable
    // eslint-disable-next-line
    type TodoUseThisDefinitionOnceItExists = APITmp.DataEditWebhook;

    const webhook = await this.#collection.client.api.patch(
      // @ts-expect-error not in prod
      `/webhooks/${this.id as ""}/${this.token as ""}`,
      data,
    );

    this.#collection.updateUnderlyingObject(
      this.id,
      // @ts-expect-error not in prod
      hydrate("channelWebhook", webhook, this.#collection.client),
    );
  }

  /**
   * Delete this webhook
   * TODO: not in production
   */
  async delete(): Promise<void> {
    await this.#collection.client.api.delete(
      // @ts-expect-error not in prod
      `/webhooks/${this.id}/${this.token}`,
    );

    this.#collection.delete(this.id);
  }
}
