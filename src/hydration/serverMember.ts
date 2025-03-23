import type { Member, MemberCompositeKey } from "revolt-api";

import type { Client } from "../Client.ts";
import { File } from "../classes/File.ts";
import type { Merge } from "../lib/merge.ts";

import type { Hydrate } from "./index.ts";

export type HydratedServerMember = {
  id: MemberCompositeKey;
  joinedAt: Date;
  nickname?: string;
  avatar?: File;
  roles: string[];
  timeout?: Date;
};

export const serverMemberHydration: Hydrate<
  Merge<Member>,
  HydratedServerMember
> = {
  keyMapping: {
    _id: "id",
    joined_at: "joinedAt",
  },
  functions: {
    id: (member) => member._id,
    joinedAt: (member) => new Date(member.joined_at),
    nickname: (member) => member.nickname!,
    avatar: (member, ctx) => new File(ctx as Client, member.avatar!),
    roles: (member) => member.roles,
    timeout: (member) => new Date(member.timeout!),
  },
  initialHydration: () => ({
    roles: [],
  }),
};
