import { SetStoreFunction } from "solid-js/store";

import type { User as ApiUser } from "revolt-api";
import { decodeTime } from "ulid";

import { Client, FileArgs } from "../Client";
import { StoreCollection } from "../collections/Collection";
import { HydratedUser } from "../hydration/user";
import { U32_MAX, UserPermission } from "../permissions/definitions";

export default (
  client: Client,
  collection: StoreCollection<unknown, unknown>
) =>
  /**
   * User Class
   */
  class User {
    static #collection: StoreCollection<
      InstanceType<typeof this>,
      HydratedUser
    >;
    static #set: SetStoreFunction<Record<string, HydratedUser>>;
    static #get: (id: string) => HydratedUser;

    static {
      User.#collection = collection as never;
      User.#set = collection.updateUnderlyingObject as never;
      User.#get = collection.getUnderlyingObject as never;
    }

    /**
     * Fetch user by ID
     * @param id ID
     * @returns User
     */
    static async fetch(id: string): Promise<User | undefined> {
      const user = this.#collection.get(id);
      if (user) return user;

      const data = await client.api.get(`/users/${id as ""}`);
      return new User(id, data);
    }

    readonly id: string;

    /**
     * Construct
     * @param id Id
     * @param data Data
     */
    constructor(id: string, data?: ApiUser) {
      this.id = id;
      User.#collection.create(id, "user", this, data);
    }

    /**
     * Get or create
     * @param id Id
     * @param data Data
     */
    static new(id: string, data?: ApiUser) {
      return client.users.get(id) ?? new User(id, data);
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
      return User.#get(this.id).username;
    }

    /**
     * Avatar
     */
    get avatar() {
      return User.#get(this.id).avatar;
    }

    /**
     * Badges
     */
    get badges() {
      return User.#get(this.id).badges;
    }

    /**
     * User Status
     */
    get status() {
      return User.#get(this.id).status;
    }

    /**
     * Relationship with user
     */
    get relationship() {
      return User.#get(this.id).relationship;
    }

    /**
     * Whether the user is online
     */
    get online() {
      return User.#get(this.id).online;
    }

    /**
     * Whether the user is privileged
     */
    get privileged() {
      return User.#get(this.id).privileged;
    }

    /**
     * Flags
     */
    get flags() {
      return User.#get(this.id).flags;
    }

    /**
     * Bot information
     */
    get bot() {
      return User.#get(this.id).bot;
    }

    /**
     * URL to the user's default avatar
     */
    get defaultAvatarURL() {
      return `${client.baseURL}/users/${this.id}/default_avatar`;
    }

    /**
     * URL to the user's avatar
     */
    get avatarURL() {
      return this.#generateAvatarURL({ max_side: 256 });
    }

    /**
     * URL to the user's animated avatar
     */
    get animatedAvatarURL() {
      return this.#generateAvatarURL({ max_side: 256 }, true);
    }

    /**
     * Generate avatar URL
     * @param args File args
     * @returns URL
     */
    #generateAvatarURL(...args: FileArgs) {
      return (
        client.generateFileURL(this.avatar, ...args) ?? this.defaultAvatarURL
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
        client.channels
          .toList()
          .find(
            (channel) =>
              (channel.type === "Group" || channel.type === "DirectMessage") &&
              channel.recipientIds?.includes(client.user!.id)
          ) ||
        client.serverMembers
          .toList()
          .find((member) => member.id.user === client.user!.id)
      ) {
        if (client.user?.bot || this.bot) {
          permissions |= UserPermission.SendMessage;
        }

        permissions |= UserPermission.Access | UserPermission.ViewProfile;
      }

      return permissions;
    }
  };
