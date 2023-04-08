import { ReactiveMap } from "@solid-primitives/map";
import type { Member as ApiMember, MemberCompositeKey } from "revolt-api";

import { Client } from "../Client";
import { HydratedServerMember } from "../hydration/serverMember";
import { ObjectStorage } from "../storage/ObjectStorage";

/**
 * Deterministic conversion of member composite key to string ID
 * @param key Key
 * @returns String key
 */
function key(key: MemberCompositeKey) {
  return key.server + key.user;
}

export default (client: Client) =>
  /**
   * Server Member Class
   */
  class ServerMember {
    static #storage = new ObjectStorage<HydratedServerMember>();

    // * Object Map Definition
    static #objects = new ReactiveMap<string, InstanceType<typeof this>>();

    /**
     * Deterministic conversion of member composite key to string ID
     * @param key Key
     * @returns String key
     */
    static keyToString = key;

    /**
     * Get an existing Member
     * @param id Member ID
     * @returns Member
     */
    static get(id: MemberCompositeKey): ServerMember | undefined {
      return ServerMember.#objects.get(key(id));
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
     * Fetch member by ID
     * @param id Member ID
     * @returns Member
     */
    static async fetch(
      id: MemberCompositeKey
    ): Promise<ServerMember | undefined> {
      const channel = ServerMember.get(id);
      if (channel) return channel;

      const data = await client.api.get(
        `/servers/${id.server as ""}/members/${id.user as ""}`
      );
      return new ServerMember(id, data);
    }

    readonly id: MemberCompositeKey;

    /**
     * Construct Member
     * @param id Member ID
     */
    constructor(id: MemberCompositeKey, data?: ApiMember) {
      ServerMember.#storage.hydrate(key(id), "serverMember", data);
      ServerMember.#objects.set(key(id), this);
      this.id = id;
    }

    /**
     * Server this member belongs to
     */
    get server() {
      return client.servers.get(this.id.server);
    }

    /**
     * User corresponding to this member
     */
    get user() {
      return client.users.get(this.id.user);
    }

    /**
     * When this user joined the server
     */
    get joinedAt() {
      return ServerMember.#storage.get(key(this.id)).joinedAt;
    }

    /**
     * Nickname
     */
    get nickname() {
      return ServerMember.#storage.get(key(this.id)).nickname;
    }

    /**
     * Avatar
     */
    get avatar() {
      return ServerMember.#storage.get(key(this.id)).avatar;
    }

    /**
     * List of role IDs
     */
    get roles() {
      return ServerMember.#storage.get(key(this.id)).roles;
    }

    /**
     * Time at which timeout expires
     */
    get timeout() {
      return ServerMember.#storage.get(key(this.id)).timeout;
    }
  };
