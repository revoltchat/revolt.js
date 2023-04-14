import { API, Channel, User } from "..";
import { HydratedChannel } from "../hydration";

import { ClassCollection } from ".";

/**
 * Collection of Channels
 */
export class ChannelCollection extends ClassCollection<
  Channel,
  HydratedChannel
> {
  /**
   * Delete an object
   * @param id Id
   */
  override delete(id: string): void {
    const channel = this.get(id);
    channel?.server?.channelIds.delete(id);
    super.delete(id);
  }

  /**
   * Fetch channel by ID
   * @param id Id
   * @returns Channel
   */
  async fetch(id: string): Promise<Channel> {
    const channel = this.get(id);
    if (channel) return channel;
    const data = await this.client.api.get(`/channels/${id as ""}`);
    return this.getOrCreate(data._id, data);
  }

  /**
   * Get or create
   * @param id Id
   * @param data Data
   * @param isNew Whether this object is new
   */
  getOrCreate(id: string, data: API.Channel, isNew = false) {
    if (this.has(id)) {
      return this.get(id)!;
    } else {
      const instance = new Channel(this, id);
      this.create(id, "channel", instance, this.client, data);
      isNew && this.client.emit("channelCreate", instance);
      return instance;
    }
  }

  /**
   * Get or return partial
   * @param id Id
   */
  getOrPartial(id: string) {
    if (this.has(id)) {
      return this.get(id)!;
    } else if (this.client.options.partials) {
      const instance = new Channel(this, id);
      this.create(id, "channel", instance, this.client, {
        id,
        partial: true,
      });
      return instance;
    }
  }

  /**
   * Create a group
   * @param name Group name
   * @param users Users to add
   * @returns The newly-created group
   */
  async createGroup(name: string, users: (User | string)[]) {
    const group = await this.client.api.post(`/channels/create`, {
      name,
      users: users.map((user) => (user instanceof User ? user.id : user)),
    });

    return this.getOrCreate(group._id, group, true);
  }
}
