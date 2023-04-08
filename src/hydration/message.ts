import { ReactiveMap } from "@solid-primitives/map";
import { ReactiveSet } from "@solid-primitives/set";
import {
  Message as ApiMessage,
  Embed,
  File,
  Interactions,
  Masquerade,
  SystemMessage,
} from "revolt-api";

import type { Merge } from "../lib/merge";

import { Hydrate } from ".";

export type HydratedMessage = {
  id: string;
  nonce?: string;
  channelId: string;
  authorId?: string;
  content?: string;
  systemMessage?: SystemMessage;
  attachments?: File[];
  editedAt?: Date;
  embeds?: Embed[];
  mentionIds?: string[];
  replyIds?: string[];
  reactions: ReactiveMap<string, ReactiveSet<string>>;
  interactions?: Interactions;
  masquerade?: Masquerade;
};

export const messageHydration: Hydrate<Merge<ApiMessage>, HydratedMessage> = {
  keyMapping: {
    _id: "id",
    channel: "channelId",
    author: "authorId",
    system: "systemMessage",
    edited: "editedAt",
    mentions: "mentionIds",
    replies: "replyIds",
  },
  functions: {
    id: (message) => message._id,
    nonce: (message) => message.nonce!,
    channelId: (message) => message.channel,
    authorId: (message) => message.author,
    content: (message) => message.content!,
    systemMessage: (message) => message.system!,
    attachments: (message) => message.attachments!,
    editedAt: (message) => new Date(message.edited!),
    embeds: (message) => message.embeds!,
    mentionIds: (message) => message.mentions!,
    replyIds: (message) => message.replies!,
    reactions: (message) => {
      const map = new ReactiveMap<string, ReactiveSet<string>>();
      if (message.reactions) {
        for (const reaction of Object.keys(message.reactions)) {
          map.set(reaction, new ReactiveSet(message.reactions![reaction]));
        }
      }
      return map;
    },
    interactions: (message) => message.interactions,
    masquerade: (message) => message.masquerade!,
  },
  initialHydration: () => ({
    reactions: new ReactiveMap(),
  }),
};
