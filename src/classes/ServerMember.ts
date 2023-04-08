import { SetStoreFunction } from "solid-js/store";

import type { Member as ApiMember, MemberCompositeKey } from "revolt-api";

import { Channel, Client, Server } from "../Client";
import { StoreCollection } from "../collections/Collection";
import { HydratedServerMember } from "../hydration/serverMember";
import { bitwiseAndEq, calculatePermission } from "../permissions/calculator";
import { Permission } from "../permissions/definitions";

/**
 * Deterministic conversion of member composite key to string ID
 * @param key Key
 * @returns String key
 */
function key(key: MemberCompositeKey) {
  return key.server + key.user;
}

export default (
  client: Client,
  collection: StoreCollection<unknown, unknown>
) =>
  /**
   * Server Member Class
   */
  class ServerMember {
    static #collection: StoreCollection<
      InstanceType<typeof this>,
      HydratedServerMember
    >;
    static #set: SetStoreFunction<Record<string, HydratedServerMember>>;
    static #get: (id: string) => HydratedServerMember;

    static {
      ServerMember.#collection = collection as never;
      ServerMember.#set = collection.updateUnderlyingObject as never;
      ServerMember.#get = collection.getUnderlyingObject as never;
    }

    /**
     * Fetch member by ID
     * @param id Member ID
     * @returns Member
     */
    static async fetch(
      id: MemberCompositeKey
    ): Promise<ServerMember | undefined> {
      const channel = ServerMember.#collection.get(key(id));
      if (channel) return channel;

      const data = await client.api.get(
        `/servers/${id.server as ""}/members/${id.user as ""}`
      );
      return new ServerMember(id, data);
    }

    readonly id: MemberCompositeKey;

    /**
     * Construct
     * @param id Id
     * @param data Data
     */
    constructor(id: MemberCompositeKey, data?: ApiMember) {
      this.id = id;
      ServerMember.#collection.create(key(id), "serverMember", this, data);
    }

    /**
     * Get or create
     * @param id Id
     * @param data Data
     */
    static new(id: MemberCompositeKey, data?: ApiMember) {
      return client.serverMembers.get(key(id)) ?? new ServerMember(id, data);
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
      return ServerMember.#get(key(this.id)).joinedAt;
    }

    /**
     * Nickname
     */
    get nickname() {
      return ServerMember.#get(key(this.id)).nickname;
    }

    /**
     * Avatar
     */
    get avatar() {
      return ServerMember.#get(key(this.id)).avatar;
    }

    /**
     * List of role IDs
     */
    get roles() {
      return ServerMember.#get(key(this.id)).roles;
    }

    /**
     * Time at which timeout expires
     */
    get timeout() {
      return ServerMember.#get(key(this.id)).timeout;
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
