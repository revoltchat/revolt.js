import { decodeTime } from "ulid";

import { UserCollection } from "../collections";
import { U32_MAX, UserPermission } from "../permissions/definitions";

/**
 * User Class
 */
export class User {
  readonly #collection: UserCollection;
  readonly id: string;

  /**
   * Construct User
   * @param collection Collection
   * @param id Id
   */
  constructor(collection: UserCollection, id: string) {
    this.#collection = collection;
    this.id = id;
  }

  /**
   * Convert to string
   * @returns String
   */
  toString() {
    return `<@${this.id}>`;
  }

  /**
   * Time when this user created their account
   */
  get createdAt() {
    return new Date(decodeTime(this.id));
  }

  /**
   * Username
   */
  get username() {
    return this.#collection.getUnderlyingObject(this.id).username;
  }

  /**
   * Avatar
   */
  get avatar() {
    return this.#collection.getUnderlyingObject(this.id).avatar;
  }

  /**
   * Badges
   */
  get badges() {
    return this.#collection.getUnderlyingObject(this.id).badges;
  }

  /**
   * User Status
   */
  get status() {
    return this.#collection.getUnderlyingObject(this.id).status;
  }

  /**
   * Relationship with user
   */
  get relationship() {
    return this.#collection.getUnderlyingObject(this.id).relationship;
  }

  /**
   * Whether the user is online
   */
  get online() {
    return this.#collection.getUnderlyingObject(this.id).online;
  }

  /**
   * Whether the user is privileged
   */
  get privileged() {
    return this.#collection.getUnderlyingObject(this.id).privileged;
  }

  /**
   * Flags
   */
  get flags() {
    return this.#collection.getUnderlyingObject(this.id).flags;
  }

  /**
   * Bot information
   */
  get bot() {
    return this.#collection.getUnderlyingObject(this.id).bot;
  }

  /**
   * URL to the user's default avatar
   */
  get defaultAvatarURL() {
    return `${this.#collection.client.options.baseURL}/users/${
      this.id
    }/default_avatar`;
  }

  /**
   * URL to the user's avatar
   */
  get avatarURL() {
    return (
      this.avatar?.createFileURL({ max_side: 256 }) ?? this.defaultAvatarURL
    );
  }

  /**
   * URL to the user's animated avatar
   */
  get animatedAvatarURL() {
    return (
      this.avatar?.createFileURL({ max_side: 256 }, true) ??
      this.defaultAvatarURL
    );
  }

  /**
   * Permissions against this user
   */
  get permission() {
    let permissions = 0;
    switch (this.relationship) {
      case "Friend":
      case "User":
        return U32_MAX;
      case "Blocked":
      case "BlockedOther":
        return UserPermission.Access;
      case "Incoming":
      case "Outgoing":
        permissions = UserPermission.Access;
    }

    if (
      this.#collection.client.channels
        .toList()
        .find(
          (channel) =>
            (channel.type === "Group" || channel.type === "DirectMessage") &&
            channel.recipientIds.has(this.#collection.client.user!.id)
        ) ||
      this.#collection.client.serverMembers
        .toList()
        .find((member) => member.id.user === this.#collection.client.user!.id)
    ) {
      if (this.#collection.client.user?.bot || this.bot) {
        permissions |= UserPermission.SendMessage;
      }

      permissions |= UserPermission.Access | UserPermission.ViewProfile;
    }

    return permissions;
  }
}
