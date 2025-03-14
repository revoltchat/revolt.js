import type {
  Server as APIServer,
  AllMemberResponse,
  BannedUser,
  Category,
  DataBanCreate,
  DataCreateEmoji,
  DataCreateServerChannel,
  DataEditRole,
  DataEditServer,
  Override,
  Role,
} from "revolt-api";
import { decodeTime } from "ulid";

import type { ServerCollection } from "../collections/ServerCollection.js";
import { hydrate } from "../hydration/index.js";
import type { ServerFlags } from "../hydration/server.js";
import {
  bitwiseAndEq,
  calculatePermission,
} from "../permissions/calculator.js";
import { Permission } from "../permissions/definitions.js";

import type { Channel } from "./Channel.js";
import type { Emoji } from "./Emoji.js";
import type { File } from "./File.js";
import { ChannelInvite } from "./Invite.js";
import { ServerBan } from "./ServerBan.js";
import { ServerMember } from "./ServerMember.js";
import { User } from "./User.js";

/**
 * Server Class
 */
export class Server {
  readonly #collection: ServerCollection;
  readonly id: string;

  /**
   * Construct Server
   * @param collection Collection
   * @param id Id
   */
  constructor(collection: ServerCollection, id: string) {
    this.#collection = collection;
    this.id = id;
  }

  /**
   * Convert to string
   * @returns String
   */
  toString(): string {
    return `<%${this.id}>`;
  }

  /**
   * Whether this object exists
   */
  get $exists(): boolean {
    return !!this.#collection.getUnderlyingObject(this.id).id;
  }

  /**
   * Time when this server was created
   */
  get createdAt(): Date {
    return new Date(decodeTime(this.id));
  }

  /**
   * Owner's user ID
   */
  get ownerId(): string {
    return this.#collection.getUnderlyingObject(this.id).ownerId;
  }

  /**
   * Owner
   */
  get owner(): User | undefined {
    return this.#collection.client.users.get(
      this.#collection.getUnderlyingObject(this.id).ownerId,
    );
  }

  /**
   * Name
   */
  get name(): string {
    return this.#collection.getUnderlyingObject(this.id).name;
  }

  /**
   * Description
   */
  get description(): string | undefined {
    return this.#collection.getUnderlyingObject(this.id).description;
  }

  /**
   * Icon
   */
  get icon(): File | undefined {
    return this.#collection.getUnderlyingObject(this.id).icon;
  }

  /**
   * Banner
   */
  get banner(): File | undefined {
    return this.#collection.getUnderlyingObject(this.id).banner;
  }

  /**
   * Channel IDs
   */
  get channelIds(): Set<string> {
    return this.#collection.getUnderlyingObject(this.id).channelIds;
  }

  /**
   * Channels
   */
  get channels(): Channel[] {
    return Array.from(
      this.#collection.getUnderlyingObject(this.id).channelIds.values(),
    )
      .map((id) => this.#collection.client.channels.get(id)!)
      .filter((x) => x);
  }

  /**
   * Categories
   */
  get categories(): APIServer["categories"] {
    return this.#collection.getUnderlyingObject(this.id).categories;
  }

  /**
   * System message channels
   */
  get systemMessages(): APIServer["system_messages"] {
    return this.#collection.getUnderlyingObject(this.id).systemMessages;
  }

  /**
   * Roles
   */
  get roles(): Map<string, Role> {
    return this.#collection.getUnderlyingObject(this.id).roles;
  }

  /**
   * Default permissions
   */
  get defaultPermissions(): number {
    return this.#collection.getUnderlyingObject(this.id).defaultPermissions;
  }

  /**
   * Server flags
   */
  get flags(): ServerFlags {
    return this.#collection.getUnderlyingObject(this.id).flags;
  }

  /**
   * Whether analytics are enabled for this server
   */
  get analytics(): boolean {
    return this.#collection.getUnderlyingObject(this.id).analytics;
  }

  /**
   * Whether this server is publicly discoverable
   */
  get discoverable(): boolean {
    return this.#collection.getUnderlyingObject(this.id).discoverable;
  }

  /**
   * Whether this server is marked as mature
   */
  get mature(): boolean {
    return this.#collection.getUnderlyingObject(this.id).nsfw;
  }

  /**
   * Get an array of ordered categories with their respective channels.
   * Uncategorised channels are returned in `id="default"` category.
   */
  get orderedChannels(): (Omit<Category, "channels"> & {
    channels: Channel[];
  })[] {
    const uncategorised = new Set(this.channels.map((channel) => channel.id));

    const elements = [];
    let defaultCategory;

    const categories = this.categories;
    if (categories) {
      for (const category of categories) {
        const channels = [];
        for (const key of category.channels) {
          if (uncategorised.delete(key)) {
            channels.push(this.#collection.client.channels.get(key)!);
          }
        }

        const cat = {
          ...category,
          channels,
        };

        if (cat.id === "default") {
          if (channels.length === 0) continue;

          defaultCategory = cat;
        }

        elements.push(cat);
      }
    }

    if (uncategorised.size > 0) {
      const channels = [...uncategorised].map(
        (key) => this.#collection.client.channels.get(key)!,
      );

      if (defaultCategory) {
        defaultCategory.channels = [...defaultCategory.channels, ...channels];
      } else {
        elements.unshift({
          id: "default",
          title: "Default",
          channels,
        });
      }
    }

    return elements;
  }

  /**
   * Default channel for this server
   */
  get defaultChannel(): Channel | undefined {
    return this.orderedChannels.find((cat) => cat.channels.length)?.channels[0];
  }

  /**
   * Get an ordered array of roles with their IDs attached.
   * The highest ranking roles will be first followed by lower
   * ranking roles. This is dictated by the "rank" property
   * which is smaller for higher priority roles.
   */
  get orderedRoles(): Role[] {
    const roles = this.roles;
    return roles
      ? [...roles.entries()]
          .map(([id, role]) => ({ id, ...role }))
          .sort((a, b) => (a.rank || 0) - (b.rank || 0))
      : [];
  }

  /**
   * Check whether the server is currently unread
   * @returns Whether the server is unread
   */
  get unread(): Channel | undefined {
    return this.channels.find((channel) => channel.unread);
  }

  /**
   * Find all message IDs of unread messages
   * @returns Array of message IDs which are unread
   */
  get mentions(): string[] {
    const arr = this.channels.map((channel) =>
      Array.from(channel.mentions?.values() ?? []),
    );

    return ([] as string[]).concat(...arr);
  }

  /**
   * URL to the server's icon
   */
  get iconURL(): string | undefined {
    return this.icon?.createFileURL();
  }

  /**
   * URL to the server's animated icon
   */
  get animatedIconURL(): string | undefined {
    return this.icon?.createFileURL(true);
  }

  /**
   * URL to the server's banner
   */
  get bannerURL(): string | undefined {
    return this.banner?.createFileURL();
  }

  /**
   * Own member object for this server
   */
  get member(): ServerMember | undefined {
    return this.#collection.client.serverMembers.getByKey({
      server: this.id,
      user: this.#collection.client.user!.id,
    });
  }

  /**
   * Permission the currently authenticated user has against this server
   */
  get permission(): number {
    return calculatePermission(this.#collection.client, this);
  }

  /**
   * Check whether we have a given permission in a server
   * @param permission Permission Names
   * @returns Whether we have this permission
   */
  havePermission(...permission: (keyof typeof Permission)[]): boolean {
    return bitwiseAndEq(
      this.permission,
      ...permission.map((x) => Permission[x]),
    );
  }

  /**
   * Check whether we have at least one of the given permissions in a server
   * @param permission Permission Names
   * @returns Whether we have one of the permissions
   */
  orPermission(...permission: (keyof typeof Permission)[]): boolean {
    return (
      permission.findIndex((x) =>
        bitwiseAndEq(this.permission, Permission[x]),
      ) !== -1
    );
  }

  /**
   * Helper function to retrieve cached server member by their ID in this server
   * @param userId User's ID
   * @returns Server Member (if cached)
   */
  getMember(userId: string): ServerMember | undefined {
    return this.#collection.client.serverMembers.getByKey({
      server: this.id,
      user: userId,
    });
  }

  /**
   * Create a channel
   * @param data Channel create route data
   * @returns The newly-created channel
   */
  async createChannel(data: DataCreateServerChannel): Promise<Channel> {
    const channel = await this.#collection.client.api.post(
      `/servers/${this.id as ""}/channels`,
      data,
    );

    return this.#collection.client.channels.getOrCreate(channel._id, channel);
  }

  /**
   * Edit a server
   * @param data Changes
   */
  async edit(data: DataEditServer): Promise<void> {
    this.#collection.setUnderlyingObject(
      this.id,
      hydrate(
        "server",
        await this.#collection.client.api.patch(
          `/servers/${this.id as ""}`,
          data,
        ),
        this.#collection.client,
        false,
      ),
    );
  }

  /**
   * Delete the underlying server
   * @param leaveEvent Whether we are leaving
   */
  $delete(leaveEvent?: boolean): void {
    const server = this.#collection.client.servers.getUnderlyingObject(this.id);

    // Avoid race conditions
    if (server.id) {
      this.#collection.client.emit(
        leaveEvent ? "serverLeave" : "serverDelete",
        server,
      );

      for (const channel of this.channelIds) {
        this.#collection.client.channels.delete(channel);
      }

      this.#collection.delete(this.id);
    }
    // TODO: delete members, emoji, etc
  }

  /**
   * Delete or leave a server
   * @param leaveSilently Whether to not send a message on leave
   */
  async delete(leaveSilently?: boolean): Promise<void> {
    await this.#collection.client.api.delete(`/servers/${this.id as ""}`, {
      leave_silently: leaveSilently,
    });

    this.$delete();
  }

  /**
   * Mark a server as read
   */
  async ack(): Promise<void> {
    for (const channel of this.channels) {
      channel.ack(undefined, false, true);
    }

    await this.#collection.client.api.put(`/servers/${this.id}/ack`);
  }

  /**
   * Ban user from this server
   * @param user User
   * @param options Ban options
   */
  async banUser(
    user: string | User | ServerMember,
    options: DataBanCreate = {},
  ): Promise<ServerBan> {
    const userId =
      user instanceof User
        ? user.id
        : user instanceof ServerMember
          ? user.id.user
          : user;

    const ban = await this.#collection.client.api.put(
      `/servers/${this.id as ""}/bans/${userId as ""}`,
      options,
    );

    return new ServerBan(this.#collection.client, ban);
  }

  /**
   * Kick user from this server
   * @param user User
   */
  async kickUser(user: string | User | ServerMember): Promise<void> {
    return await this.#collection.client.api.delete(
      `/servers/${this.id as ""}/members/${
        typeof user === "string"
          ? user
          : user instanceof User
            ? user.id
            : user.id.user
      }`,
    );
  }

  /**
   * Pardon user's ban
   * @param user User
   */
  async unbanUser(user: string | User): Promise<void> {
    const userId = user instanceof User ? user.id : user;
    return await this.#collection.client.api.delete(
      `/servers/${this.id as ""}/bans/${userId}`,
    );
  }

  /**
   * Fetch a server's invites
   * @returns An array of the server's invites
   */
  async fetchInvites(): Promise<ChannelInvite[]> {
    const invites = await this.#collection.client.api.get(
      `/servers/${this.id as ""}/invites`,
    );

    return invites.map((invite) =>
      ChannelInvite.from(this.#collection.client, invite),
    );
  }

  /**
   * Fetch a server's bans
   * @returns An array of the server's bans.
   */
  async fetchBans(): Promise<ServerBan[]> {
    const { users, bans } = await this.#collection.client.api.get(
      `/servers/${this.id as ""}/bans`,
    );

    const userDict = users.reduce(
      (d, c) => ({ ...d, [c._id]: c }),
      {} as Record<string, BannedUser>,
    );

    return bans.map(
      (ban) =>
        new ServerBan(this.#collection.client, ban, userDict[ban._id.user]),
    );
  }

  /**
   * Set role permissions
   * @param roleId Role Id, set to 'default' to affect all users
   * @param permissions Permission value
   */
  async setPermissions(
    roleId = "default",
    permissions: Override | number,
  ): Promise<APIServer> {
    return await this.#collection.client.api.put(
      `/servers/${this.id as ""}/permissions/${roleId as ""}`,
      { permissions: permissions as Override },
    );
  }

  /**
   * Create role
   * @param name Role name
   */
  async createRole(name: string): Promise<{ id: string; role: Role }> {
    return await this.#collection.client.api.post(
      `/servers/${this.id as ""}/roles`,
      {
        name,
      },
    );
  }

  /**
   * Edit a role
   * @param roleId Role ID
   * @param data Role editing route data
   */
  async editRole(roleId: string, data: DataEditRole): Promise<Role> {
    return await this.#collection.client.api.patch(
      `/servers/${this.id as ""}/roles/${roleId as ""}`,
      data,
    );
  }

  /**
   * Delete role
   * @param roleId Role ID
   */
  async deleteRole(roleId: string): Promise<void> {
    return await this.#collection.client.api.delete(
      `/servers/${this.id as ""}/roles/${roleId as ""}`,
    );
  }

  /**
   * Fetch a server member
   * @param user User
   * @returns Server member object
   */
  async fetchMember(user: User | string): Promise<ServerMember> {
    const userId = typeof user === "string" ? user : user.id;
    const existing = this.#collection.client.serverMembers.getByKey({
      server: this.id,
      user: userId,
    });

    if (existing) return existing;
    return await this.#collection.client.serverMembers.fetch(this.id, userId);
  }

  #synced: undefined | "partial" | "full";

  /**
   * Optimised member fetch route
   * @param excludeOffline
   */
  async syncMembers(excludeOffline?: boolean): Promise<void> {
    if (this.#synced && (this.#synced === "full" || excludeOffline)) return;

    const data = await this.#collection.client.api.get(
      `/servers/${this.id as ""}/members`,
      { exclude_offline: excludeOffline },
    );

    if (excludeOffline) {
      for (let i = 0; i < data.users.length; i++) {
        const user = data.users[i];
        if (user.online) {
          this.#collection.client.users.getOrCreate(user._id, user);
          this.#collection.client.serverMembers.getOrCreate(
            data.members[i]._id,
            data.members[i],
          );
        }
      }
    } else {
      for (let i = 0; i < data.users.length; i++) {
        this.#collection.client.users.getOrCreate(
          data.users[i]._id,
          data.users[i],
        );
        this.#collection.client.serverMembers.getOrCreate(
          data.members[i]._id,
          data.members[i],
        );
      }
    }
  }

  /**
   * Reset member sync status
   */
  resetSyncStatus(): void {
    this.#synced = undefined;
  }

  /**
   * Fetch a server's members
   * @returns List of the server's members and their user objects
   */
  async fetchMembers(): Promise<{ members: ServerMember[]; users: User[] }> {
    const data = (await this.#collection.client.api.get(
      // @ts-expect-error TODO weird typing issue
      `/servers/${this.id as ""}/members`,
    )) as AllMemberResponse;

    return {
      members: data.members.map((member) =>
        this.#collection.client.serverMembers.getOrCreate(member._id, member),
      ),
      users: data.users.map((user) =>
        this.#collection.client.users.getOrCreate(user._id, user),
      ),
    };
  }

  /**
   * Query members from a server by name
   * @param query Name
   * @returns List of the server's members and their user objects
   */
  async queryMembersExperimental(
    query: string,
  ): Promise<{ members: ServerMember[]; users: User[] }> {
    const data = (await this.#collection.client.api.get(
      `/servers/${
        this.id as ""
      }/members_experimental_query?experimental_api=true&query=${encodeURIComponent(
        query,
      )}` as never,
    )) as AllMemberResponse;

    return {
      members: data.members.map((member) =>
        this.#collection.client.serverMembers.getOrCreate(member._id, member),
      ),
      users: data.users.map((user) =>
        this.#collection.client.users.getOrCreate(user._id, user),
      ),
    };
  }

  /**
   * Create an emoji on the server
   * @param autumnId Autumn Id
   * @param options Options
   */
  async createEmoji(
    autumnId: string,
    options: Omit<DataCreateEmoji, "parent">,
  ): Promise<Emoji> {
    const emoji = await this.#collection.client.api.put(
      `/custom/emoji/${autumnId as ""}`,
      {
        parent: {
          type: "Server",
          id: this.id,
        },
        ...options,
      },
    );

    return this.#collection.client.emojis.getOrCreate(emoji._id, emoji, true);
  }

  /**
   * Fetch a server's emoji
   * @returns List of server emoji
   */
  async fetchEmojis(): Promise<Emoji[]> {
    const emojis = await this.#collection.client.api.get(
      `/servers/${this.id as ""}/emojis`,
    );

    return emojis.map((emoji) =>
      this.#collection.client.emojis.getOrCreate(emoji._id, emoji),
    );
  }

  /**
   * Delete emoji
   * @param emojiId Emoji ID
   */
  async deleteEmoji(emojiId: string): Promise<void> {
    return (await this.#collection.client.api.delete(
      `/custom/emoji/${emojiId}`,
    )) as void;
  }
}
