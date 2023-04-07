import { Member as ApiMember, File, MemberCompositeKey } from "revolt-api";

import { Merge } from "../lib/merge";

import { Hydrate } from ".";

export type HydratedServerMember = {
  id: MemberCompositeKey;
  joinedAt: Date;
  nickname?: string;
  avatar?: File;
  roles?: string[];
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
    avatar: (member) => member.avatar!,
    roles: (member) => member.roles,
    timeout: (member) => new Date(member.timeout!),
  },
};
