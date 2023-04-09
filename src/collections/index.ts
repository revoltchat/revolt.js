import { Client } from "..";

import { StoreCollection } from "./Collection";

/**
 * Generic class collection backed by store
 */
export class ClassCollection<T, V> extends StoreCollection<T, V> {
  readonly client: Client;

  constructor(client: Client) {
    super();
    this.client = client;
  }
}

export { ChannelCollection } from "./ChannelCollection";
export { ChannelUnreadCollection } from "./ChannelUnreadCollection";
export { EmojiCollection } from "./EmojiCollection";
export { MessageCollection } from "./MessageCollection";
export { ServerCollection } from "./ServerCollection";
export { ServerMemberCollection } from "./ServerMemberCollection";
export { UserCollection } from "./UserCollection";
