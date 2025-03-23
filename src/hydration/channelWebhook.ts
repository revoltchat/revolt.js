import type { Webhook } from "revolt-api";

import type { Client } from "../Client.ts";
import { File } from "../classes/File.ts";
import type { Merge } from "../lib/merge.ts";

import type { Hydrate } from "./index.ts";

export type HydratedChannelWebhook = {
  id: string;
  name: string;
  avatar?: File;
  channelId: string;
  token: string;
};

export const channelWebhookHydration: Hydrate<
  Merge<Webhook>,
  HydratedChannelWebhook
> = {
  keyMapping: {
    id: "id",
    name: "name",
    avatar: "avatar",
    channel_id: "channelId",
    token: "token",
  },
  functions: {
    id: (webhook) => webhook.id,
    name: (webhook) => webhook.name,
    avatar: (webhook, ctx) =>
      webhook.avatar ? new File(ctx as Client, webhook.avatar) : undefined,
    channelId: (webhook) => webhook.channel_id,
    token: (webhook) => webhook.token!,
  },
  initialHydration: () => ({}),
};
