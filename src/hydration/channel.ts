import { ReactiveSet } from "@solid-primitives/set";
import { Channel as ApiChannel, OverrideField } from "revolt-api";

import { Client, File } from "..";
import type { Merge } from "../lib/merge";

import { Hydrate } from ".";

export type HydratedChannel = {
  id: string;
  channelType: ApiChannel["channel_type"];

  name: string;
  description?: string;
  icon?: File;

  active: boolean;
  typingIds: ReactiveSet<string>;
  recipientIds: ReactiveSet<string>;

  userId?: string;
  ownerId?: string;
  serverId?: string;

  permissions?: number;
  defaultPermissions?: OverrideField;
  rolePermissions?: Record<string, OverrideField>;
  nsfw: boolean;

  lastMessageId?: string;
};

export const channelHydration: Hydrate<Merge<ApiChannel>, HydratedChannel> = {
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
    typingIds: () => new ReactiveSet(),
    recipientIds: (channel) => new ReactiveSet(channel.recipients),
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
    typingIds: new ReactiveSet(),
    recipientIds: new ReactiveSet(),
  }),
};
