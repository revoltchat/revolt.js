import type {
  DataBanCreate,
  DataMemberEdit,
  MemberCompositeKey,
} from "revolt-api";

import { ServerMemberCollection } from "../collections";
import { bitwiseAndEq, calculatePermission } from "../permissions/calculator";
import { Permission } from "../permissions/definitions";

import { Channel } from "./Channel";
import { Server } from "./Server";

/**
 * Deterministic conversion of member composite key to string ID
 * @param key Key
 * @returns String key
 */
function key(key: MemberCompositeKey) {
  return key.server + key.user;
}

/**
 * Server Member Class
 */
export class ServerMember {
  readonly #collection: ServerMemberCollection;
  readonly id: MemberCompositeKey;

  /**
   * Construct Server Member
   * @param collection Collection
   * @param id Id
   */
  constructor(collection: ServerMemberCollection, id: MemberCompositeKey) {
    this.#collection = collection;
    this.id = id;
  }

  /**
   * Convert to string
   * @returns String
   */
  toString() {
    return `<@${this.id.user}>`;
  }

  /**
   * Whether this object exists
   */
  get $exists() {
    return !this.#collection.getUnderlyingObject(key(this.id)).id;
  }

  /**
   * Server this member belongs to
   */
  get server() {
    return this.#collection.client.servers.get(this.id.server);
  }

  /**
   * User corresponding to this member
   */
  get user() {
    return this.#collection.client.users.get(this.id.user);
  }

  /**
   * When this user joined the server
   */
  get joinedAt() {
    return this.#collection.getUnderlyingObject(key(this.id)).joinedAt;
  }

  /**
   * Nickname
   */
  get nickname() {
    return this.#collection.getUnderlyingObject(key(this.id)).nickname;
  }

  /**
   * Avatar
   */
  get avatar() {
    return this.#collection.getUnderlyingObject(key(this.id)).avatar;
  }

  /**
   * List of role IDs
   */
  get roles() {
    return this.#collection.getUnderlyingObject(key(this.id)).roles;
  }

  /**
   * Time at which timeout expires
   */
  get timeout() {
    return this.#collection.getUnderlyingObject(key(this.id)).timeout;
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
   * Member's ranking
   * Smaller values are ranked as higher priority
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
    return calculatePermission(this.#collection.client, target, {
      member: this,
    });
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

  /**
   * Display name
   */
  get displayName() {
    return this.nickname ?? this.user?.displayName;
  }

  /**
   * URL to the member's avatar
   */
  get avatarURL() {
    return (
      this.avatar?.createFileURL({ max_side: 256 }) ?? this.user?.avatarURL
    );
  }

  /**
   * URL to the member's animated avatar
   */
  get animatedAvatarURL() {
    return (
      this.avatar?.createFileURL({ max_side: 256 }, true) ??
      this.user?.animatedAvatarURL
    );
  }

  /**
   * Edit a member
   * @param data Changes
   */
  async edit(data: DataMemberEdit) {
    await this.#collection.client.api.patch(
      `/servers/${this.id.server as ""}/members/${this.id.user as ""}`,
      data
    );
  }

  /**
   * Ban this member from the server
   * @param options Ban options
   */
  async ban(options: DataBanCreate) {
    this.server?.banUser(this, options);
  }

  /**
   * Kick this member from the server
   */
  async kick() {
    this.server?.kickUser(this);
  }
}
