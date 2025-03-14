import type { ChannelUnread } from "revolt-api";

import type { Merge } from "../lib/merge.js";

import type { Hydrate } from "./index.js";

export type HydratedChannelUnread = {
  id: string;
  lastMessageId?: string;
  messageMentionIds: Set<string>;
};

export const channelUnreadHydration: Hydrate<
  Merge<ChannelUnread>,
  HydratedChannelUnread
> = {
  keyMapping: {
    _id: "id",
    last_id: "lastMessageId",
    mentions: "messageMentionIds",
  },
  functions: {
    id: (unread) => unread._id.channel,
    lastMessageId: (unread) => unread.last_id!,
    messageMentionIds: (unread) => new Set(unread.mentions!),
  },
  initialHydration: () => ({
    messageMentionIds: new Set(),
  }),
};
