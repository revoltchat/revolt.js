import { ChannelUnread as APIChannelUnread } from "revolt-api";

import { ChannelUnread } from "../classes/ChannelUnread.js";
import { HydratedChannelUnread } from "../hydration/channelUnread.js";

import { ClassCollection } from "./Collection.js";

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
    for (const key of this.keys()) {
      this.updateUnderlyingObject(key, {} as never);
    }
  }

  /**
   * Get or create
   * @param id Id
   * @param data Data
   */
  getOrCreate(id: string, data: APIChannelUnread) {
    if (this.has(id)) {
      return this.get(id)!;
    } else {
      const instance = new ChannelUnread(this, id);
      this.create(id, "channelUnread", instance, this.client, data);
      return instance;
    }
  }
}
