import { API, Emoji } from "..";
import { HydratedEmoji } from "../hydration";

import { ClassCollection } from ".";

/**
 * Collection of Emoji
 */
export class EmojiCollection extends ClassCollection<Emoji, HydratedEmoji> {
  /**
   * Fetch emoji by ID
   * @param id Id
   * @returns Emoji
   */
  async fetch(id: string): Promise<Emoji> {
    const emoji = this.get(id);
    if (emoji) return emoji;
    const data = await this.client.api.get(`/custom/emoji/${id as ""}`);
    return this.getOrCreate(data._id, data);
  }

  /**
   * Get or create
   * @param id Id
   * @param data Data
   * @param isNew Whether this object is new
   */
  getOrCreate(id: string, data: API.Emoji, isNew = false) {
    if (this.has(id)) {
      return this.get(id)!;
    } else {
      const instance = new Emoji(this, id);
      this.create(id, "emoji", instance, this.client, data);
      isNew && this.client.emit("emojiCreate", instance);
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
      const instance = new Emoji(this, id);
      this.create(id, "emoji", instance, this.client, {
        id,
      });
      return instance;
    }
  }
}
