import { API } from "..";
import { ChannelUnread } from "../classes/ChannelUnread";
import { HydratedChannelUnread } from "../hydration";

import { ClassCollection } from ".";

export class ChannelUnreadCollection extends ClassCollection<
  ChannelUnread,
  HydratedChannelUnread
> {
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
      this.create(id, "channelUnread", instance, data);
      return instance;
    }
  }
}
