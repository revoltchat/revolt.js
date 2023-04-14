import { ReactiveMap } from "@solid-primitives/map";
import { ReactiveSet } from "@solid-primitives/set";
import {
  Server as ApiServer,
  Category,
  Role,
  SystemMessageChannels,
} from "revolt-api";

import { Client, File } from "..";

import { Hydrate } from ".";

export type HydratedServer = {
  id: string;
  ownerId: string;

  name: string;
  description?: string;

  icon?: File;
  banner?: File;

  channelIds: ReactiveSet<string>;
  categories?: Category[];

  systemMessages?: SystemMessageChannels;
  roles: ReactiveMap<string, Role>;
  defaultPermissions: number;

  flags: ServerFlags;
  analytics: boolean;
  discoverable: boolean;
  nsfw: boolean;
};

export const serverHydration: Hydrate<ApiServer, HydratedServer> = {
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
    channelIds: (server) => new ReactiveSet(server.channels),
    categories: (server) => server.categories ?? [],
    systemMessages: (server) => server.system_messages ?? {},
    roles: (server) =>
      new ReactiveMap(
        Object.keys(server.roles!).map((id) => [id, server.roles![id]])
      ),
    defaultPermissions: (server) => server.default_permissions,
    icon: (server, ctx) => new File(ctx as Client, server.icon!),
    banner: (server, ctx) => new File(ctx as Client, server.banner!),
    flags: (server) => server.flags!,
    analytics: (server) => server.analytics || false,
    discoverable: (server) => server.discoverable || false,
    nsfw: (server) => server.nsfw || false,
  },
  initialHydration: () => ({
    channelIds: new ReactiveSet(),
    roles: new ReactiveMap(),
  }),
};

/**
 * Flags attributed to servers
 */
export enum ServerFlags {
  Official = 1,
  Verified = 2,
}
