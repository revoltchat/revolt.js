import type {
    Emoji,
    FieldsChannel,
    FieldsMember,
    FieldsServer,
    FieldsUser,
} from "revolt-api";
import type { Channel, Message } from "revolt-api";
import type { Member, MemberCompositeKey, Role, Server } from "revolt-api";
import type { RelationshipStatus, User } from "revolt-api";
import type { Session } from "../Client";

type WebSocketError = {
    error:
        | "InternalError"
        | "InvalidSession"
        | "OnboardingNotFinished"
        | "AlreadyAuthenticated";
};

export type ServerboundNotification =
    | { type: "Ping"; data: number }
    | { type: "Pong"; data: number }
    | ({ type: "Authenticate" } & Session)
    | { type: "Authenticate"; token: string }
    | { type: "BeginTyping"; channel: string }
    | { type: "EndTyping"; channel: string };

export type ReadyPacket = {
    type: "Ready";
    users: User[];
    servers: Server[];
    channels: Channel[];
    members: Member[];
    emojis?: Emoji[];
};

export type ClientboundNotification =
    | { type: "Bulk"; v: ClientboundNotification[] }
    | { type: "Ping"; data: number }
    | { type: "Pong"; data: number }
    | ({ type: "Error" } & WebSocketError)
    | { type: "Authenticated" }
    | ReadyPacket
    | ({ type: "Message" } & Message & {
              webhook?: { name: string; avatar?: string };
          })
    | {
          type: "MessageUpdate";
          id: string;
          channel: string;
          data: Partial<Message>;
      }
    | {
          type: "MessageAppend";
          id: string;
          channel: string;
          append: Pick<Partial<Message>, "embeds">;
      }
    | { type: "MessageDelete"; id: string; channel: string }
    | {
          type: "MessageReact";
          id: string;
          channel_id: string;
          user_id: string;
          emoji_id: string;
      }
    | {
          type: "MessageUnreact";
          id: string;
          channel_id: string;
          user_id: string;
          emoji_id: string;
      }
    | {
          type: "MessageRemoveReaction";
          id: string;
          channel_id: string;
          emoji_id: string;
      }
    | { type: "BulkMessageDelete"; channel: string; ids: string[] }
    | ({ type: "ChannelCreate" } & Channel)
    | {
          type: "ChannelUpdate";
          id: string;
          data: Partial<Channel>;
          clear?: FieldsChannel[];
      }
    | { type: "ChannelDelete"; id: string }
    | { type: "ChannelGroupJoin"; id: string; user: string }
    | { type: "ChannelGroupLeave"; id: string; user: string }
    | { type: "ChannelStartTyping"; id: string; user: string }
    | { type: "ChannelStopTyping"; id: string; user: string }
    | { type: "ChannelAck"; id: string; user: string; message_id: string }
    | {
          type: "ServerCreate";
          id: string;
          server: Server;
          channels: Channel[];
      }
    | {
          type: "ServerUpdate";
          id: string;
          data: Partial<Server>;
          clear?: FieldsServer[];
      }
    | { type: "ServerDelete"; id: string }
    | {
          type: "ServerMemberUpdate";
          id: MemberCompositeKey;
          data: Partial<Member>;
          clear?: FieldsMember[];
      }
    | { type: "ServerMemberJoin"; id: string; user: string }
    | { type: "ServerMemberLeave"; id: string; user: string }
    | {
          type: "ServerRoleUpdate";
          id: string;
          role_id: string;
          data: Partial<Role>;
      }
    | { type: "ServerRoleDelete"; id: string; role_id: string }
    | {
          type: "UserUpdate";
          id: string;
          data: Partial<User>;
          clear?: FieldsUser[];
      }
    | { type: "UserRelationship"; user: User; status: RelationshipStatus }
    | { type: "UserPresence"; id: string; online: boolean }
    | {
          type: "UserSettingsUpdate";
          id: string;
          update: { [key: string]: [number, string] };
      }
    | { type: "UserPlatformWipe"; user_id: string; flags: number }
    | ({ type: "EmojiCreate" } & Emoji)
    | { type: "EmojiDelete"; id: string }
    | ({
          type: "Auth";
      } & (
          | {
                event_type: "DeleteSession";
                user_id: string;
                session_id: string;
            }
          | {
                event_type: "DeleteAllSessions";
                user_id: string;
                exclude_session_id: string;
            }
      ));
