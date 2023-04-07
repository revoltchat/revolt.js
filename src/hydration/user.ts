import {
  User as ApiUser,
  BotInformation,
  File,
  RelationshipStatus,
  UserStatus,
} from "revolt-api";

import { Hydrate } from ".";

export type HydratedUser = {
  id: string;
  username: string;
  relationship: RelationshipStatus;

  online: boolean;
  privileged: boolean;

  badges: UserBadges;
  flags: UserFlags;

  avatar?: File;
  status?: UserStatus;
  bot?: BotInformation;
};

export const userHydration: Hydrate<ApiUser, HydratedUser> = {
  keyMapping: {
    _id: "id",
  },
  functions: {
    id: (user) => user._id,
    username: (user) => user.username,
    relationship: (user) => user.relationship ?? "None",

    online: (user) => user.online || false,
    privileged: (user) => user.privileged || false,

    badges: (user) => user.badges ?? 0,
    flags: (user) => user.flags ?? 0,

    avatar: (user) => user.avatar! ?? undefined,
    status: (user) => user.status! ?? undefined,
    bot: (user) => user.bot! ?? undefined,
  },
};

/**
 * Badges available to users
 */
export enum UserBadges {
  Developer = 1,
  Translator = 2,
  Supporter = 4,
  ResponsibleDisclosure = 8,
  Founder = 16,
  PlatformModeration = 32,
  ActiveSupporter = 64,
  Paw = 128,
  EarlyAdopter = 256,
  ReservedRelevantJokeBadge1 = 512,
  ReservedRelevantJokeBadge2 = 1024,
}

/**
 * Flags attributed to users
 */
export enum UserFlags {
  Suspended = 1,
  Deleted = 2,
  Banned = 4,
}
