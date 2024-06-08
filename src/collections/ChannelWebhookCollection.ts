import { ChannelWebhook } from "../classes/ChannelWebhook.js";
import { HydratedChannelWebhook } from "../hydration/channelWebhook.js";
import { API } from "../index.js";

import { ClassCollection } from "./index.js";

/**
 * Collection of Channel Webhooks
 */
export class ChannelWebhookCollection extends ClassCollection<
  ChannelWebhook,
  HydratedChannelWebhook
> {
  /**
   * Fetch webhook by ID
   * @param id Id
   * @returns Webhook
   */
  async fetch(id: string): Promise<ChannelWebhook> {
    const webhook = this.get(id);
    if (webhook) return webhook;
    // @ts-expect-error not in prod
    const data = await this.client.api.get(`/webhooks/${id as ""}`);
    // @ts-expect-error not in prod
    return this.getOrCreate(data.id, data as API.Webhook);
  }

  /**
   * Create webhook with ID and token
   * @param id Id
   * @param token Token
   * @returns Webhook
   */
  async fromToken(id: string, token: string): Promise<ChannelWebhook> {
    const webhook = this.get(id);
    if (webhook) return webhook;
    const data = await this.client.api.get(
      // @ts-expect-error not in prod
      `/webhooks/${id as ""}/${token as ""}`
    );
    // @ts-expect-error not in prod
    return this.getOrCreate(data.id, data);
  }

  /**
   * Get or create
   * @param id Id
   * @param data Data
   */
  getOrCreate(id: string, data: API.Webhook) {
    if (this.has(id)) {
      return this.get(id)!;
    } else {
      const instance = new ChannelWebhook(this, id);
      this.create(id, "channelWebhook", instance, this.client, data);
      return instance;
    }
  }
}
