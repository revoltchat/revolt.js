import { ReactiveSet } from "@solid-primitives/set";

import { API } from "../index.js";
import type { Merge } from "../lib/merge.js";

import { Hydrate } from "./index.js";

export type HydratedChannelUnread = {
  id: string;
  lastMessageId?: string;
  messageMentionIds: ReactiveSet<string>;
};

export const channelUnreadHydration: Hydrate<
  Merge<API.ChannelUnread>,
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
    messageMentionIds: (unread) => new ReactiveSet(unread.mentions!),
  },
  initialHydration: () => ({
    messageMentionIds: new ReactiveSet(),
  }),
};
