import { Setter, batch } from "solid-js";

import { ReactiveSet } from "@solid-primitives/set";
import type {
  Channel,
  Embed,
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

import { hydrate } from "../hydration/index.js";
import { Client } from "../index.js";

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

/**
 * Handle an event for the Client
 * @param client Client
 * @param event Event
 * @param setReady Signal state change
 */
export async function handleEvent(
  client: Client,
  event: ServerMessage,
  setReady: Setter<boolean>
) {
  switch (event.type) {
    case "Bulk": {
      for (const item of event.v) {
        handleEvent(client, item, setReady);
      }
      break;
    }
    case "Ready": {
      batch(() => {
        for (const user of event.users) {
          const u = client.users.getOrCreate(user._id, user);

          if (u.relationship === "User") {
            client.user = u;
          }
        }

        for (const server of event.servers) {
          client.servers.getOrCreate(server._id, server);
        }

        for (const member of event.members) {
          client.serverMembers.getOrCreate(member._id, member);
        }

        for (const channel of event.channels) {
          client.channels.getOrCreate(channel._id, channel);
        }

        for (const emoji of event.emojis) {
          client.emojis.getOrCreate(emoji._id, emoji);
        }
      });

      if (client.options.syncUnreads) {
        await client.channelUnreads.sync();
      }

      setReady(true);
      client.emit("ready");

      break;
    }
    case "Message": {
      if (!client.messages.has(event._id)) {
        // TODO: this should not be necessary in future protocols:
        if (
          event.author &&
          event.author != "00000000000000000000000000" &&
          !event.webhook &&
          client.options.eagerFetching
        ) {
          await client.users.fetch(event.author);
          const serverId = client.channels.get(event.channel)?.serverId;
          if (serverId)
            await client.serverMembers.fetch(serverId, event.author);
        }

        client.messages.getOrCreate(event._id, event, true);
      }
      break;
    }
    case "MessageUpdate": {
      const message = client.messages.getOrPartial(event.id);
      if (message) {
        const previousMessage = {
          ...client.messages.getUnderlyingObject(event.id),
        };

        client.messages.updateUnderlyingObject(event.id, {
          ...hydrate("message", event.data, client, false),
          editedAt: new Date(),
        });

        client.emit("messageUpdate", message, previousMessage);
      }
      break;
    }
    case "MessageAppend": {
      const message = client.messages.getOrPartial(event.id);
      if (message) {
        const previousMessage = {
          ...client.messages.getUnderlyingObject(event.id),
        };

        client.messages.updateUnderlyingObject(
          event.id,
          "embeds",
          (embeds) => [...(embeds ?? []), event.append.embeds ?? []] as Embed[]
        );

        client.emit("messageUpdate", message, previousMessage);
      }
      break;
    }
    case "MessageDelete": {
      if (client.messages.getOrPartial(event.id)) {
        const message = client.messages.getUnderlyingObject(event.id);
        client.emit("messageDelete", message);
        client.messages.delete(event.id);
      }
      break;
    }
    case "BulkMessageDelete": {
      batch(() =>
        client.emit(
          "messageDeleteBulk",
          event.ids
            .map((id) => {
              if (client.messages.has(id)) {
                const message = client.messages.getUnderlyingObject(id);
                client.messages.delete(id);
                return message!;
              }

              return undefined!;
            })
            .filter((x) => x),
          client.channels.get(event.channel)
        )
      );
      break;
    }
    case "MessageReact": {
      const message = client.messages.getOrPartial(event.id);
      if (message) {
        const reactions = message.reactions;
        const set = reactions.get(event.emoji_id)!;
        if (set) {
          if (set.has(event.user_id)) return;
          set.add(event.user_id);
        } else {
          reactions.set(event.emoji_id, new ReactiveSet([event.user_id]));
        }

        client.emit(
          "messageReactionAdd",
          message,
          event.user_id,
          event.emoji_id
        );
      }
      break;
    }
    case "MessageUnreact": {
      const message = client.messages.getOrPartial(event.id);
      if (message) {
        const set = message.reactions.get(event.emoji_id);
        if (set?.has(event.user_id)) {
          set.delete(event.user_id);
        } else if (!client.messages.isPartial(event.id)) {
          return;
        }

        client.emit(
          "messageReactionRemove",
          message,
          event.user_id,
          event.emoji_id
        );
      }
      break;
    }
    case "MessageRemoveReaction": {
      const message = client.messages.getOrPartial(event.id);
      if (message) {
        const reactions = message.reactions;
        if (reactions.has(event.emoji_id)) {
          reactions.delete(event.emoji_id);
        } else if (!client.messages.isPartial(event.id)) {
          return;
        }

        client.emit("messageReactionRemoveEmoji", message, event.emoji_id);
      }
      break;
    }
    case "ChannelCreate": {
      if (!client.channels.has(event._id)) {
        client.channels.getOrCreate(event._id, event, true);
      }
      break;
    }
    case "ChannelUpdate": {
      const channel = client.channels.getOrPartial(event.id);
      if (channel) {
        const previousChannel = {
          ...client.channels.getUnderlyingObject(event.id),
        };

        const changes = hydrate("channel", event.data, client, false);

        if (event.clear) {
          for (const remove of event.clear) {
            switch (remove) {
              case "Description":
                changes["description"] = undefined;
                break;
              case "DefaultPermissions":
                changes["defaultPermissions"] = undefined;
                break;
              case "Icon":
                changes["icon"] = undefined;
                break;
            }
          }
        }

        client.channels.updateUnderlyingObject(event.id, changes);
        client.emit("channelUpdate", channel, previousChannel);
      }
      break;
    }
    case "ChannelDelete": {
      if (client.channels.getOrPartial(event.id)) {
        const channel = client.channels.getUnderlyingObject(event.id);
        client.emit("channelDelete", channel);
        client.channels.delete(event.id);
      }
      break;
    }
    case "ChannelGroupJoin": {
      const channel = client.channels.getOrPartial(event.id);
      if (channel) {
        if (!channel.recipientIds.has(event.user)) {
          channel.recipientIds.add(event.user);
        } else if (!client.channels.isPartial(event.id)) {
          return;
        }

        client.emit(
          "channelGroupJoin",
          channel,
          await client.users.fetch(event.user)
        );
      }
      break;
    }
    case "ChannelGroupLeave": {
      const channel = client.channels.getOrPartial(event.id);
      if (channel) {
        if (channel.recipientIds.has(event.user)) {
          channel.recipientIds.delete(event.user);
        } else if (!client.channels.isPartial(event.id)) {
          return;
        }

        client.emit(
          "channelGroupLeave",
          channel,
          client.users.getOrPartial(event.user)!
        );
      }
      break;
    }
    case "ChannelStartTyping": {
      const channel = client.channels.getOrPartial(event.id);
      if (channel) {
        if (!channel.typingIds.has(event.user)) {
          channel.typingIds.add(event.user);
        } else if (!client.channels.isPartial(event.id)) {
          return;
        }

        client.emit(
          "channelStartTyping",
          channel,
          client.users.getOrPartial(event.user)!
        );
      }
      break;
    }
    case "ChannelStopTyping": {
      const channel = client.channels.getOrPartial(event.id);
      if (channel) {
        if (channel.typingIds.has(event.user)) {
          channel.typingIds.delete(event.user);
        } else if (!client.channels.isPartial(event.id)) {
          return;
        }

        client.emit(
          "channelStopTyping",
          channel,
          client.users.getOrPartial(event.user)!
        );
      }
      break;
    }
    case "ChannelAck": {
      const channel = client.channels.getOrPartial(event.id);
      if (channel) {
        client.emit("channelAcknowledged", channel, event.message_id);
      }
      break;
    }
    case "ServerCreate": {
      if (!client.servers.has(event.server._id)) {
        batch(() => {
          for (const channel of event.channels) {
            client.channels.getOrCreate(channel._id, channel);
          }

          client.servers.getOrCreate(event.server._id, event.server, true);
        });
      }
      break;
    }
    case "ServerUpdate": {
      const server = client.servers.getOrPartial(event.id);
      if (server) {
        const previousServer = {
          ...client.servers.getUnderlyingObject(event.id),
        };

        const changes = hydrate("server", event.data, client, false);

        if (event.clear) {
          for (const remove of event.clear) {
            switch (remove) {
              case "Banner":
                changes["banner"] = undefined;
                break;
              case "Categories":
                changes["categories"] = undefined;
                break;
              case "SystemMessages":
                changes["systemMessages"] = undefined;
                break;
              case "Description":
                changes["description"] = undefined;
                break;
              case "Icon":
                changes["icon"] = undefined;
                break;
            }
          }
        }

        client.servers.updateUnderlyingObject(event.id, changes);
        client.emit("serverUpdate", server, previousServer);
      }
      break;
    }
    case "ServerDelete": {
      if (client.servers.getOrPartial(event.id)) {
        batch(() => {
          const server = client.servers.getUnderlyingObject(event.id);
          client.emit("serverDelete", server);
          client.servers.delete(event.id);

          for (const channel of server.channelIds) {
            client.channels.delete(channel);
          }
        });
      }
      break;
    }
    case "ServerRoleUpdate": {
      const server = client.servers.getOrPartial(event.id);
      if (server) {
        const role = server.roles.get(event.role_id) ?? {};
        server.roles.set(event.role_id, {
          ...role,
          ...event.data,
        } as Role);

        client.emit("serverRoleUpdate", server, event.role_id, role as never);
      }
      break;
    }
    case "ServerRoleDelete": {
      const server = client.servers.getOrPartial(event.id);
      if (server) {
        let role = {};
        const roles = server.roles;
        if (roles.has(event.role_id)) {
          role = roles.get(event.role_id) as Role;
          roles.delete(event.role_id);
        } else if (!client.servers.isPartial(event.id)) {
          return;
        }

        client.emit("serverRoleDelete", server, event.role_id, role as never);
      }
      break;
    }
    case "ServerMemberJoin": {
      const id = {
        server: event.id,
        user: event.user,
      };

      if (!client.serverMembers.hasByKey(id)) {
        client.emit(
          "serverMemberJoin",
          client.serverMembers.getOrCreate(id, {
            _id: id,
            joined_at: new Date().toUTCString(),
          })
        );
      }
      break;
    }
    case "ServerMemberUpdate": {
      const member = client.serverMembers.getOrPartial(event.id);
      if (member) {
        const previousMember = {
          ...client.serverMembers.getUnderlyingObject(
            event.id.server + event.id.user
          ),
        };

        const changes = hydrate("serverMember", event.data, client, false);

        if (event.clear) {
          for (const remove of event.clear) {
            switch (remove) {
              case "Nickname":
                changes["nickname"] = undefined;
                break;
              case "Avatar":
                changes["avatar"] = undefined;
                break;
              case "Roles":
                changes["roles"] = [];
                break;
              case "Timeout":
                changes["timeout"] = undefined;
                break;
            }
          }
        }

        client.serverMembers.updateUnderlyingObject(
          event.id.server + event.id.user,
          changes as never
        );

        client.emit("serverMemberUpdate", member, previousMember);
      }
      break;
    }
    case "ServerMemberLeave": {
      const id = {
        server: event.id,
        user: event.user,
      };

      if (client.serverMembers.getOrPartial(id)) {
        const member = client.serverMembers.getUnderlyingObject(
          id.server + id.user
        );
        client.emit("serverMemberLeave", member);
        client.serverMembers.delete(id.server + id.user);
      }
      break;
    }
    case "UserUpdate": {
      const user = client.users.getOrPartial(event.id);
      if (user) {
        const previousUser = {
          ...client.users.getUnderlyingObject(event.id),
        };

        const changes = hydrate("user", event.data, client, false);

        if (event.clear) {
          for (const remove of event.clear) {
            switch (remove) {
              case "Avatar":
                changes["avatar"] = undefined;
                break;
              case "StatusPresence":
                changes["status"] = {
                  ...(previousUser.status ?? {}),
                  ...(changes["status"] ?? {}),
                  presence: undefined,
                };
                break;
              case "StatusText":
                changes["status"] = {
                  ...(previousUser.status ?? {}),
                  ...(changes["status"] ?? {}),
                  text: undefined,
                };
                break;
            }
          }
        }

        client.users.updateUnderlyingObject(event.id, changes as never);
        client.emit("userUpdate", user, previousUser);
      }
      break;
    }
    case "UserRelationship": {
      handleEvent(
        client,
        {
          type: "UserUpdate",
          id: event.user._id,
          data: {
            relationship: event.user.relationship!,
          },
        },
        setReady
      );
      break;
    }
    case "UserPresence": {
      handleEvent(
        client,
        {
          type: "UserUpdate",
          id: event.id,
          data: {
            online: event.online,
          },
        },
        setReady
      );
      break;
    }
    case "UserSettingsUpdate": {
      client.emit("userSettingsUpdate", event.id, event.update);
      break;
    }
    case "UserPlatformWipe": {
      batch(() => {
        handleEvent(
          client,
          {
            type: "BulkMessageDelete",
            channel: "0",
            ids: client.messages
              .toList()
              .filter((message) => message.authorId === event.user_id)
              .map((message) => message.id),
          },
          setReady
        );

        handleEvent(
          client,
          {
            type: "UserUpdate",
            id: event.user_id,
            data: {
              username: `Deleted User`,
              online: false,
              flags: event.flags,
              badges: 0,
              relationship: "None",
            },
            clear: ["Avatar", "StatusPresence", "StatusText"],
          },
          setReady
        );
      });

      break;
    }
    case "EmojiCreate": {
      if (!client.emojis.has(event._id)) {
        client.emojis.getOrCreate(event._id, event, true);
      }
      break;
    }
    case "EmojiDelete": {
      if (client.emojis.getOrPartial(event.id)) {
        const emoji = client.emojis.getUnderlyingObject(event.id);
        client.emit("emojiDelete", emoji);
        client.emojis.delete(event.id);
      }
      break;
    }
    case "Auth": {
      // TODO: implement DeleteSession and DeleteAllSessions
      break;
    }
  }
}
