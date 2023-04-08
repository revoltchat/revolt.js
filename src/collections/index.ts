import { MemberCompositeKey } from "revolt-api";

import { Channel, Emoji, Message, Server, ServerMember, User } from "..";
import { HydratedChannel } from "../hydration/channel";
import { HydratedEmoji } from "../hydration/emoji";
import { HydratedMessage } from "../hydration/message";
import { HydratedServer } from "../hydration/server";
import { HydratedServerMember } from "../hydration/serverMember";
import { HydratedUser } from "../hydration/user";

import { StoreCollection } from "./Collection";

export class ChannelCollection extends StoreCollection<
  Channel,
  HydratedChannel
> {}
export class EmojiCollection extends StoreCollection<Emoji, HydratedEmoji> {}
export class MessageCollection extends StoreCollection<
  Message,
  HydratedMessage
> {}
export class ServerCollection extends StoreCollection<Server, HydratedServer> {}
export class UserCollection extends StoreCollection<User, HydratedUser> {}
export class ServerMemberCollection extends StoreCollection<
  ServerMember,
  HydratedServerMember
> {
  getByKey(id: MemberCompositeKey) {
    return super.get(id.server + id.user);
  }
}
