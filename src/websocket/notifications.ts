import type { FieldsChannel, FieldsMember, FieldsServer, FieldsUser, Session } from "revolt-api";
import type { Channel, Message } from "revolt-api";
import type {
    Member,
    MemberCompositeKey,
    Role,
    Server,
} from "revolt-api";
import type { RelationshipStatus, User } from "revolt-api";

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
};

export type ClientboundNotification =
    | { type: "Bulk"; v: ClientboundNotification[] }
    | { type: "Ping"; data: number }
    | { type: "Pong"; data: number }
    | ({ type: "Error" } & WebSocketError)
    | { type: "Authenticated" }
    | ReadyPacket
    | ({ type: "Message" } & Message)
    | {
          type: "MessageUpdate";
          id: string;
          data: Partial<Message>;
          channel: string;
      }
    | { type: "MessageDelete"; id: string; channel: string }
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
    | { type: "UserSettingsUpdate"; id: string; update: { [key: string]: [number, string] } };
