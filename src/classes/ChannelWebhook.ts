import { ChannelWebhookCollection } from "../collections/index.js";
import { hydrate } from "../hydration/index.js";

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
  get $exists() {
    return !!this.#collection.getUnderlyingObject(this.id).id;
  }

  /**
   * Webhook name
   */
  get name() {
    return this.#collection.getUnderlyingObject(this.id).name;
  }

  /**
   * Webhook avatar
   */
  get avatar() {
    return this.#collection.getUnderlyingObject(this.id).avatar;
  }

  /**
   * Webhook avatar URL
   */
  get avatarURL() {
    return this.#collection
      .getUnderlyingObject(this.id)
      .avatar?.createFileURL({ max_side: 256 });
  }

  /**
   * Channel ID this webhook belongs to
   */
  get channelId() {
    return this.#collection.getUnderlyingObject(this.id).channelId;
  }

  /**
   * Channel this webhook belongs to
   */
  get channel() {
    return this.#collection.client.channels.get(
      this.#collection.getUnderlyingObject(this.id).channelId
    );
  }

  /**
   * Secret token for sending messages to this webhook
   */
  get token() {
    return this.#collection.getUnderlyingObject(this.id).token;
  }

  /**
   * Edit this webhook
   * TODO: not in production
   */
  async edit(data: any /*: DataEditWebhook*/) {
    const webhook = await this.#collection.client.api.patch(
      // @ts-expect-error not in prod
      `/webhooks/${this.id as ""}/${this.token as ""}`,
      data
    );

    this.#collection.updateUnderlyingObject(
      this.id,
      // @ts-expect-error not in prod
      hydrate("channelWebhook", webhook, this.#collection.client)
    );
  }

  /**
   * Delete this webhook
   * TODO: not in production
   */
  async delete() {
    await this.#collection.client.api.delete(
      // @ts-expect-error not in prod
      `/webhooks/${this.id}/${this.token}`
    );

    this.#collection.delete(this.id);
  }
}
