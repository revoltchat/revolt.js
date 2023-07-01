import {
  User as ApiUser,
  BotInformation,
  RelationshipStatus,
  UserStatus,
} from "revolt-api";

import { Client, File } from "..";

import { Hydrate } from ".";

export type HydratedUser = {
  id: string;
  username: string;
  discriminator: string;
  displayName?: string;
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
    display_name: "displayName",
  },
  functions: {
    id: (user) => user._id,
    username: (user) => user.username,
    discriminator: (user) => user.discriminator,
    displayName: (user) => user.display_name!,
    relationship: (user) => user.relationship!,

    online: (user) => user.online!,
    privileged: (user) => user.privileged,

    badges: (user) => user.badges!,
    flags: (user) => user.flags!,

    avatar: (user, ctx) => new File(ctx as Client, user.avatar!),
    status: (user) => user.status!,
    bot: (user) => user.bot!,
  },
  initialHydration: () => ({
    relationship: "None",
  }),
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
