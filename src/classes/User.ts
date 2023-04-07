import type { User as ApiUser } from "revolt-api";
import { decodeTime } from "ulid";

import { Client } from "../Client";
import { HydratedUser } from "../hydration/user";
import { ObjectStorage } from "../storage/ObjectStorage";

export default (client: Client) =>
  /**
   * User Class
   */
  class User {
    static #storage = new ObjectStorage<HydratedUser>();
    static #objects: Record<string, User> = {};

    /**
     * Get an existing User
     * @param id User ID
     * @returns User
     */
    static get(id: string): User | undefined {
      return User.#objects[id];
    }

    /**
     * Fetch user by ID
     * @param id ID
     * @returns User
     */
    static async fetch(id: string): Promise<User | undefined> {
      const user = User.get(id);
      if (user) return user;

      const data = await client.api.get(`/users/${id as ""}`);
      return new User(id, data);
    }

    readonly id: string;

    /**
     * Construct User
     * @param id User Id
     */
    constructor(id: string, data?: ApiUser) {
      User.#storage.hydrate(id, "user", data);
      User.#objects[id] = this;
      this.id = id;
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
      return User.#storage.get(this.id).username;
    }

    /**
     * Avatar
     */
    get avatar() {
      return User.#storage.get(this.id).avatar;
    }

    /**
     * Badges
     */
    get badges() {
      return User.#storage.get(this.id).badges;
    }

    /**
     * User Status
     */
    get status() {
      return User.#storage.get(this.id).status;
    }

    /**
     * Relationship with user
     */
    get relationship() {
      return User.#storage.get(this.id).relationship;
    }

    /**
     * Whether the user is online
     */
    get online() {
      return User.#storage.get(this.id).online;
    }

    /**
     * Whether the user is privileged
     */
    get privileged() {
      return User.#storage.get(this.id).privileged;
    }

    /**
     * Flags
     */
    get flags() {
      return User.#storage.get(this.id).flags;
    }

    /**
     * Bot information
     */
    get bot() {
      return User.#storage.get(this.id).bot;
    }
  };
