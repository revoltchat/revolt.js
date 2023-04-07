import type {
  Channel,
  Emoji,
  FieldsChannel,
  FieldsMember,
  FieldsServer,
  FieldsUser,
  Member,
  MemberCompositeKey,
  Message,
  RelationshipStatus,
  Role,
  Server,
  User,
} from "revolt-api";

/**
 * Version 1 of the events protocol
 */
export type ProtocolV1 = {
  client: ClientMessage;
  server: ServerMessage;
};

/**
 * Messages sent to the server
 */
type ClientMessage =
  | { type: "Authenticate"; token: string }
  | {
      type: "BeginTyping";
      channel: string;
    }
  | {
      type: "EndTyping";
      channel: string;
    }
  | {
      type: "Ping";
      data: number;
    }
  | {
      type: "Pong";
      data: number;
    };

/**
 * Messages sent from the server
 */
type ServerMessage =
  | ({ type: "Error" } & WebSocketError)
  | { type: "Bulk"; v: ServerMessage[] }
  | { type: "Authenticated" }
  | ({ type: "Ready" } & ReadyData)
  | { type: "Ping"; data: number }
  | { type: "Pong"; data: number }
  | ({ type: "Message" } & Message)
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

/**
 * Initial synchronisation packet
 */
type ReadyData = {
  users: User[];
  servers: Server[];
  channels: Channel[];
  members: Member[];
  emojis: Emoji[];
};

/**
 * Websocket error packet
 */
type WebSocketError = {
  error:
    | "InternalError"
    | "InvalidSession"
    | "OnboardingNotFinished"
    | "AlreadyAuthenticated";
};
