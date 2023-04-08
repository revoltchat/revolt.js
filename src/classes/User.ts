import { ReactiveMap } from "@solid-primitives/map";
import type { User as ApiUser } from "revolt-api";
import { decodeTime } from "ulid";

import { Client, FileArgs } from "../Client";
import { HydratedUser } from "../hydration/user";
import { ObjectStorage } from "../storage/ObjectStorage";

export default (client: Client) =>
  /**
   * User Class
   */
  class User {
    static #storage = new ObjectStorage<HydratedUser>();

    // * Object Map Definition
    static #objects = new ReactiveMap<string, InstanceType<typeof this>>();

    /**
     * Get an existing object
     * @param id ID
     * @returns Object
     */
    static get(id: string): InstanceType<typeof this> | undefined {
      return this.#objects.get(id);
    }

    /**
     * Number of stored objects
     * @returns Size
     */
    static size() {
      return this.#objects.size;
    }

    /**
     * Iterable of keys in the map
     * @returns Iterable
     */
    static keys() {
      return this.#objects.keys();
    }

    /**
     * Iterable of values in the map
     * @returns Iterable
     */
    static values() {
      return this.#objects.values();
    }

    /**
     * List of values in the map
     * @returns List
     */
    static toList() {
      return [...this.#objects.values()];
    }

    /**
     * Iterable of key, value pairs in the map
     * @returns Iterable
     */
    static entries() {
      return this.#objects.entries();
    }

    /**
     * Execute a provided function over each key, value pair in the map
     * @param cb Callback for each pair
     * @returns Iterable
     */
    static forEach(
      cb: (
        value: InstanceType<typeof this>,
        key: string,
        map: ReactiveMap<string, InstanceType<typeof this>>
      ) => void
    ) {
      return this.#objects.forEach(cb);
    }
    // * End Object Map Definition

    /**
     * Fetch user by ID
     * @param id ID
     * @returns User
     */
    static async fetch(id: string): Promise<User | undefined> {
      const user = this.get(id);
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
      this.id = id;
      User.#storage.hydrate(id, "user", data);
      User.#objects.set(id, this);
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
  };
