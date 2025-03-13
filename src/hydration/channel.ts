import { Channel, OverrideField } from "revolt-api";

import { Client } from "../Client.js";
import { File } from "../classes/File.js";
import type { Merge } from "../lib/merge.js";

import { Hydrate } from "./index.js";

export type HydratedChannel = {
  id: string;
  channelType: Channel["channel_type"];

  name: string;
  description?: string;
  icon?: File;

  active: boolean;
  typingIds: Set<string>;
  recipientIds: Set<string>;

  userId?: string;
  ownerId?: string;
  serverId?: string;

  permissions?: number;
  defaultPermissions?: OverrideField;
  rolePermissions?: Record<string, OverrideField>;
  nsfw: boolean;

  lastMessageId?: string;
};

export const channelHydration: Hydrate<Merge<Channel>, HydratedChannel> = {
  keyMapping: {
    _id: "id",
    channel_type: "channelType",
    recipients: "recipientIds",
    user: "userId",
    owner: "ownerId",
    server: "serverId",
    default_permissions: "defaultPermissions",
    role_permissions: "rolePermissions",
    last_message_id: "lastMessageId",
  },
  functions: {
    id: (channel) => channel._id,
    channelType: (channel) => channel.channel_type,
    name: (channel) => channel.name,
    description: (channel) => channel.description!,
    icon: (channel, ctx) => new File(ctx as Client, channel.icon!),
    active: (channel) => channel.active || false,
    typingIds: () => new Set(),
    recipientIds: (channel) => new Set(channel.recipients),
    userId: (channel) => channel.user,
    ownerId: (channel) => channel.owner,
    serverId: (channel) => channel.server,
    permissions: (channel) => channel.permissions!,
    defaultPermissions: (channel) => channel.default_permissions!,
    rolePermissions: (channel) => channel.role_permissions,
    nsfw: (channel) => channel.nsfw || false,
    lastMessageId: (channel) => channel.last_message_id!,
  },
  initialHydration: () => ({
    typingIds: new Set(),
    recipientIds: new Set(),
  }),
};
