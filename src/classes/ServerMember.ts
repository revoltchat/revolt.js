import { ReactiveMap } from "@solid-primitives/map";
import type { Member as ApiMember, MemberCompositeKey } from "revolt-api";

import { Channel, Client, Server } from "../Client";
import { HydratedServerMember } from "../hydration/serverMember";
import { bitwiseAndEq, calculatePermission } from "../permissions/calculator";
import { Permission } from "../permissions/definitions";
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

    /**
     * Ordered list of roles for this member, from lowest to highest priority.
     */
    get orderedRoles() {
      const server = this.server!;
      return (
        this.roles
          ?.map((id) => ({
            id,
            ...server.roles?.get(id),
          }))
          .sort((a, b) => b.rank! - a.rank!) ?? []
      );
    }

    /**
     * Member's currently hoisted role.
     */
    get hoistedRole() {
      const roles = this.orderedRoles.filter((x) => x.hoist);
      if (roles.length > 0) {
        return roles[roles.length - 1];
      } else {
        return null;
      }
    }

    /**
     * Member's current role colour.
     */
    get roleColour() {
      const roles = this.orderedRoles.filter((x) => x.colour);
      if (roles.length > 0) {
        return roles[roles.length - 1].colour;
      } else {
        return null;
      }
    }

    /**
     * Member's ranking.
     * Smaller values are ranked as higher priotity.
     */
    get ranking() {
      if (this.id.user === this.server?.ownerId) {
        return -Infinity;
      }

      const roles = this.orderedRoles;
      if (roles.length > 0) {
        return roles[roles.length - 1].rank!;
      } else {
        return Infinity;
      }
    }

    /**
     * Get the permissions that this member has against a certain object
     * @param target Target object to check permissions against
     * @returns Permissions that this member has
     */
    getPermissions(target: Server | Channel) {
      return calculatePermission(client, target, { member: this });
    }

    /**
     * Check whether a member has a certain permission against a certain object
     * @param target Target object to check permissions against
     * @param permission Permission names to check for
     * @returns Whether the member has this permission
     */
    hasPermission(
      target: Server | Channel,
      ...permission: (keyof typeof Permission)[]
    ) {
      return bitwiseAndEq(
        this.getPermissions(target),
        ...permission.map((x) => Permission[x])
      );
    }

    /**
     * Checks whether the target member has a higher rank than this member.
     * @param target The member to compare against
     * @returns Whether this member is inferior to the target
     */
    inferiorTo(target: ServerMember) {
      return target.ranking < this.ranking;
    }
  };
