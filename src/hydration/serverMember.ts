import { Member as ApiMember, MemberCompositeKey } from "revolt-api";

import { Client, File } from "..";
import type { Merge } from "../lib/merge";

import { Hydrate } from ".";

export type HydratedServerMember = {
  id: MemberCompositeKey;
  joinedAt: Date;
  nickname?: string;
  avatar?: File;
  roles: string[];
  timeout?: Date;
};

export const serverMemberHydration: Hydrate<
  Merge<ApiMember>,
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
