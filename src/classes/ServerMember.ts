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
    static #objects: Record<string, ServerMember> = {};

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
      return ServerMember.#objects[key(id)];
    }

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
      ServerMember.#objects[key(id)] = this;
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
