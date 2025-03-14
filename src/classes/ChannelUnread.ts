import type { ChannelUnreadCollection } from "../collections/ChannelUnreadCollection.js";

/**
 * Channel Unread Class
 */
export class ChannelUnread {
  readonly #collection: ChannelUnreadCollection;
  readonly id: string;

  /**
   * Construct Channel
   * @param collection Collection
   * @param id Channel Id
   */
  constructor(collection: ChannelUnreadCollection, id: string) {
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
   * Last read message id
   */
  get lastMessageId(): string | undefined {
    return this.#collection.getUnderlyingObject(this.id).lastMessageId;
  }

  /**
   * List of message IDs that we were mentioned in
   */
  get messageMentionIds(): Set<string> {
    return this.#collection.getUnderlyingObject(this.id).messageMentionIds;
  }
}
