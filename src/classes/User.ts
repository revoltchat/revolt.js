import { DataEditUser, Presence } from "revolt-api";
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
   * Write to string as a user mention
   * @returns Formatted String
   */
  toString() {
    return `<@${this.id}>`;
  }

  /**
   * Whether this object exists
   */
  get $exists() {
    return !!this.#collection.getUnderlyingObject(this.id).id;
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
   * Discriminator
   */
  get discriminator() {
    return this.#collection.getUnderlyingObject(this.id).discriminator;
  }

  /**
   * Display Name
   */
  get displayName() {
    return (
      this.#collection.getUnderlyingObject(this.id).displayName ??
      this.#collection.getUnderlyingObject(this.id).username
    );
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
   * Whether this user is ourselves
   */
  get self() {
    return this.#collection.client.user === this;
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
   * Presence
   */
  get presence() {
    return this.online ? this.status?.presence ?? "Online" : "Invisible";
  }

  /**
   * Generate status message
   * @param translate Translation function
   * @returns Status message
   */
  statusMessage(translate: (presence: Presence) => string = (a) => a) {
    return this.online
      ? this.status?.text ??
          (this.presence === "Focus" ? translate("Focus") : undefined)
      : undefined;
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
      this.#collection.client.channels.find(
        (channel) =>
          (channel.type === "Group" || channel.type === "DirectMessage") &&
          channel.recipientIds.has(this.id)
      ) ||
      this.#collection.client.serverMembers.find(
        (member) => member.id.user === this.id
      )
    ) {
      if (this.#collection.client.user?.bot || this.bot) {
        permissions |= UserPermission.SendMessage;
      }

      permissions |= UserPermission.Access | UserPermission.ViewProfile;
    }

    return permissions;
  }

  /**
   * Edit the user
   * @param data Changes
   */
  async edit(data: DataEditUser) {
    await this.#collection.client.api.patch(
      `/users/${
        this.id === this.#collection.client.user?.id ? "@me" : this.id
      }`,
      data
    );
  }

  /**
   * Change the username of the current user
   * @param username New username
   * @param password Current password
   */
  async changeUsername(username: string, password: string) {
    return await this.#collection.client.api.patch("/users/@me/username", {
      username,
      password,
    });
  }

  /**
   * Open a DM with a user
   * @returns DM Channel
   */
  async openDM() {
    let dm = [...this.#collection.client.channels.values()].find(
      (x) => x.type === "DirectMessage" && x.recipient == this
    );

    if (dm) {
      if (!dm.active) {
        this.#collection.client.channels.updateUnderlyingObject(
          dm.id,
          "active",
          true
        );
      }
    } else {
      const data = await this.#collection.client.api.get(
        `/users/${this.id as ""}/dm`
      );

      dm = this.#collection.client.channels.getOrCreate(data._id, data)!;
    }

    return dm;
  }

  /**
   * Send a friend request to a user
   */
  async addFriend() {
    const user = await this.#collection.client.api.post(`/users/friend`, {
      username: this.username,
    });

    return this.#collection.getOrCreate(user._id, user);
  }

  /**
   * Remove a user from the friend list
   */
  async removeFriend() {
    await this.#collection.client.api.delete(`/users/${this.id as ""}/friend`);
  }

  /**
   * Block a user
   */
  async blockUser() {
    await this.#collection.client.api.put(`/users/${this.id as ""}/block`);
  }

  /**
   * Unblock a user
   */
  async unblockUser() {
    await this.#collection.client.api.delete(`/users/${this.id as ""}/block`);
  }

  /**
   * Fetch the profile of a user
   * @returns The profile of the user
   */
  async fetchProfile() {
    return await this.#collection.client.api.get(
      `/users/${this.id as ""}/profile`
    );
  }

  /**
   * Fetch the mutual connections of the current user and a target user
   * @returns The mutual connections of the current user and a target user
   */
  async fetchMutual() {
    return await this.#collection.client.api.get(
      `/users/${this.id as ""}/mutual`
    );
  }
}
