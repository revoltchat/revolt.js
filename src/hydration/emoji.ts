import { Emoji as ApiEmoji, EmojiParent } from "revolt-api";

import type { Merge } from "../lib/merge";

import { Hydrate } from ".";

export type HydratedEmoji = {
  id: string;
  parent: EmojiParent;
  creatorId: string;
  name: string;
  animated: boolean;
  nsfw: boolean;
};

export const emojiHydration: Hydrate<Merge<ApiEmoji>, HydratedEmoji> = {
  keyMapping: {
    _id: "id",
    creator_id: "creatorId",
  },
  functions: {
    id: (emoji) => emoji._id,
    parent: (emoji) => emoji.parent,
    creatorId: (emoji) => emoji.creator_id,
    name: (emoji) => emoji.name,
    animated: (emoji) => emoji.animated || false,
    nsfw: (emoji) => emoji.nsfw || false,
  },
  initialHydration: () => ({}),
};
