import { decodeTime } from "ulid";

import { EmojiCollection } from "../collections";

/**
 * Emoji Class
 */
export class Emoji {
  readonly #collection: EmojiCollection;
  readonly id: string;

  /**
   * Construct Emoji
   * @param collection Collection
   * @param id Emoji Id
   */
  constructor(collection: EmojiCollection, id: string) {
    this.#collection = collection;
    this.id = id;
  }

  /**
   * Convert to string
   * @returns String
   */
  toString() {
    return `:${this.id}:`;
  }

  /**
   * Whether this object exists
   */
  get $exists() {
    return !!this.#collection.getUnderlyingObject(this.id).id;
  }

  /**
   * Time when this emoji was created
   */
  get createdAt() {
    return new Date(decodeTime(this.id));
  }

  /**
   * Information about the parent of this emoji
   */
  get parent() {
    return this.#collection.getUnderlyingObject(this.id).parent;
  }

  /**
   * Creator of the emoji
   */
  get creator() {
    return this.#collection.client.users.get(
      this.#collection.getUnderlyingObject(this.id).creatorId
    );
  }

  /**
   * Name
   */
  get name() {
    return this.#collection.getUnderlyingObject(this.id).name;
  }

  /**
   * Whether the emoji is animated
   */
  get animated() {
    return this.#collection.getUnderlyingObject(this.id).animated;
  }

  /**
   * Whether the emoji is marked as mature
   */
  get mature() {
    return this.#collection.getUnderlyingObject(this.id).nsfw;
  }

  /**
   * Delete Emoji
   */
  async delete() {
    await this.#collection.client.api.delete(`/custom/emoji/${this.id}`);

    const emoji = this.#collection.getUnderlyingObject(this.id);
    if (emoji) {
      this.#collection.client.emit("emojiDelete", emoji);
      this.#collection.delete(this.id);
    }
  }
}
