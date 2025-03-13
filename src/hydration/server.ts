import { Category, Role, Server, SystemMessageChannels } from "revolt-api";

import { Client } from "../Client.js";
import { File } from "../classes/File.js";

import { Hydrate } from "./index.js";

export type HydratedServer = {
  id: string;
  ownerId: string;

  name: string;
  description?: string;

  icon?: File;
  banner?: File;

  channelIds: Set<string>;
  categories?: Category[];

  systemMessages?: SystemMessageChannels;
  roles: Map<string, Role>;
  defaultPermissions: number;

  flags: ServerFlags;
  analytics: boolean;
  discoverable: boolean;
  nsfw: boolean;
};

export const serverHydration: Hydrate<Server, HydratedServer> = {
  keyMapping: {
    _id: "id",
    owner: "ownerId",
    channels: "channelIds",
    system_messages: "systemMessages",
    default_permissions: "defaultPermissions",
  },
  functions: {
    id: (server) => server._id,
    ownerId: (server) => server.owner,
    name: (server) => server.name,
    description: (server) => server.description!,
    channelIds: (server) => new Set(server.channels),
    categories: (server) => server.categories ?? [],
    systemMessages: (server) => server.system_messages ?? {},
    roles: (server) =>
      new Map(Object.keys(server.roles!).map((id) => [id, server.roles![id]])),
    defaultPermissions: (server) => server.default_permissions,
    icon: (server, ctx) => new File(ctx as Client, server.icon!),
    banner: (server, ctx) => new File(ctx as Client, server.banner!),
    flags: (server) => server.flags!,
    analytics: (server) => server.analytics || false,
    discoverable: (server) => server.discoverable || false,
    nsfw: (server) => server.nsfw || false,
  },
  initialHydration: () => ({
    channelIds: new Set(),
    roles: new Map(),
  }),
};

/**
 * Flags attributed to servers
 */
export enum ServerFlags {
  Official = 1,
  Verified = 2,
}
