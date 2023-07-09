import { HydratedMessage } from "../hydration";
import { API, Message } from "../index.js";

import { ClassCollection } from "./index.js";

/**
 * Collection of Messages
 */
export class MessageCollection extends ClassCollection<
  Message,
  HydratedMessage
> {
  /**
   * Fetch message by Id
   * @param channelId Channel Id
   * @param messageId Message Id
   * @returns Message
   */
  async fetch(channelId: string, messageId: string): Promise<Message> {
    const message = this.get(messageId);
    if (message) return message;

    const data = await this.client.api.get(
      `/channels/${channelId as ""}/messages/${messageId as ""}`
    );

    return this.getOrCreate(data._id, data, false);
  }

  /**
   * Get or create
   * @param id Id
   * @param data Data
   * @param isNew Whether this object is new
   */
  getOrCreate(id: string, data: API.Message, isNew = false) {
    if (this.has(id)) {
      return this.get(id)!;
    } else {
      const instance = new Message(this, id);
      this.create(id, "message", instance, this.client, data);
      isNew && this.client.emit("messageCreate", instance);
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
      const instance = new Message(this, id);
      this.create(id, "message", instance, this.client, {
        id,
        partial: true,
      });
      return instance;
    }
  }

  /**
   * Globally fetch messages
   * @requires Admin
   * @param query Message query
   */
  async queryMessages(query: API.MessageQuery) {
    return this.client.api.post("/admin/messages", query);
  }
}
