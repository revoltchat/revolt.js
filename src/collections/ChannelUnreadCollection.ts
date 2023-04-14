import { API } from "..";
import { ChannelUnread } from "../classes/ChannelUnread";
import { HydratedChannelUnread } from "../hydration";

import { ClassCollection } from ".";

/**
 * Collection of Channel Unreads
 */
export class ChannelUnreadCollection extends ClassCollection<
  ChannelUnread,
  HydratedChannelUnread
> {
  /**
   * Load unread information from server
   */
  async sync() {
    const unreads = await this.client.api.get("/sync/unreads");
    this.reset();
    for (const unread of unreads) {
      this.getOrCreate(unread._id.channel, unread);
    }
  }

  /**
   * Clear all unread data
   */
  reset() {
    this.updateUnderlyingObject({});
  }

  /**
   * Get or create
   * @param id Id
   * @param data Data
   */
  getOrCreate(id: string, data: API.ChannelUnread) {
    if (this.has(id)) {
      return this.get(id)!;
    } else {
      const instance = new ChannelUnread(this, id);
      this.create(id, "channelUnread", instance, this.client, data);
      return instance;
    }
  }
}
