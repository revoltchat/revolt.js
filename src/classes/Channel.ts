import { SetStoreFunction } from "solid-js/store";

import type {
  Channel as ApiChannel,
  DataEditChannel,
  DataMessageSend,
  Member,
  Message,
  OptionsMessageSearch,
  Override,
  User,
} from "revolt-api";
import { APIRoutes } from "revolt-api/dist/routes";
import { decodeTime, ulid } from "ulid";

import { Client } from "../Client";
import { StoreCollection } from "../collections/Collection";
import { hydrate } from "../hydration";
import { HydratedChannel } from "../hydration/channel";
import { bitwiseAndEq, calculatePermission } from "../permissions/calculator";
import { Permission } from "../permissions/definitions";

export default (
  client: Client,
  collection: StoreCollection<unknown, HydratedChannel>
) =>
  /**
   * Channel Class
   */
  class Channel {
    static #collection: StoreCollection<
      InstanceType<typeof this>,
      HydratedChannel
    >;
    static #set: SetStoreFunction<Record<string, HydratedChannel>>;
    static #get: (id: string) => HydratedChannel;

    static {
      Channel.#collection = collection as never;
      Channel.#set = collection.updateUnderlyingObject as never;
      Channel.#get = collection.getUnderlyingObject as never;

      client.events.on("event", (event) => {
        switch (event.type) {
          case "ChannelUpdate": {
            this.#set(event.id, hydrate("channel", event.data));
            break;
          }
        }
      });
    }

    /**
     * Fetch channel by ID
     * @param id ID
     * @returns Channel
     */
    static async fetch(id: string): Promise<Channel | undefined> {
      const channel = Channel.#collection.get(id);
      if (channel) return channel;

      const data = await client.api.get(`/channels/${id as ""}`);
      return new Channel(id, data);
    }

    readonly id: string;

    /**
     * Construct Channel
     * @param id Channel Id
     */
    constructor(id: string, data?: ApiChannel) {
      this.id = id;
      Channel.#collection.create(id, "channel", this, data);
    }

    /**
     * Get or create
     * @param id Id
     * @param data Data
     */
    static new(id: string, data?: ApiChannel) {
      return client.channels.get(id) ?? new Channel(id, data);
    }

    /**
     * Time when this server was created
     */
    get createdAt() {
      return new Date(decodeTime(this.id));
    }

    /**
     * Channel type
     */
    get type() {
      return Channel.#get(this.id).channelType;
    }

    /**
     * Absolute pathname to this channel in the client
     */
    get path() {
      if (this.serverId) {
        return `/server/${this.serverId}/channel/${this.id}`;
      } else {
        return `/channel/${this.id}`;
      }
    }

    /**
     * URL to this channel
     */
    get url() {
      return client.configuration?.app + this.path;
    }

    /**
     * Channel name
     */
    get name() {
      return Channel.#get(this.id).name;
    }

    /**
     * Channel description
     */
    get description() {
      return Channel.#get(this.id).description;
    }

    /**
     * Channel icon
     */
    get icon() {
      return Channel.#get(this.id).icon;
    }

    /**
     * Whether the conversation is active
     */
    get active() {
      return Channel.#get(this.id).active;
    }

    /**
     * User Ids of recipients of the group
     */
    get recipientIds() {
      return Channel.#get(this.id).recipientIds;
    }

    /**
     * Recipients of the group
     */
    get recipients() {
      return Channel.#get(this.id).recipientIds.map(
        (id) => client.users.get(id)!
      );
    }

    /**
     * Find recipient of this DM
     */
    get recipient() {
      return this.type === "DirectMessage"
        ? this.recipients.find((user) => user.id !== client.user!.id)
        : undefined;
    }

    /**
     * User ID
     */
    get userId() {
      return Channel.#get(this.id).userId!;
    }

    /**
     * User this channel belongs to
     */
    get user() {
      return client.users.get(Channel.#get(this.id).userId!);
    }

    /**
     * Owner ID
     */
    get ownerId() {
      return Channel.#get(this.id).ownerId!;
    }

    /**
     * Owner of the group
     */
    get owner() {
      return client.users.get(Channel.#get(this.id).ownerId!);
    }

    /**
     * Server ID
     */
    get serverId() {
      return Channel.#get(this.id).serverId!;
    }

    /**
     * Server this channel is in
     */
    get server() {
      return client.servers.get(Channel.#get(this.id).serverId!);
    }

    /**
     * Permissions allowed for users in this group
     */
    get permissions() {
      return Channel.#get(this.id).permissions;
    }

    /**
     * Default permissions for this server channel
     */
    get defaultPermissions() {
      return Channel.#get(this.id).defaultPermissions;
    }

    /**
     * Role permissions for this server channel
     */
    get rolePermissions() {
      return Channel.#get(this.id).rolePermissions;
    }

    /**
     * Whether this channel is marked as mature
     */
    get mature() {
      return Channel.#get(this.id).nsfw;
    }

    /**
     * ID of the last message sent in this channel
     */
    get lastMessageId() {
      return Channel.#get(this.id).lastMessageId;
    }

    /**
     * Time when the last message was sent
     */
    get lastMessageAt() {
      return this.lastMessageId
        ? new Date(decodeTime(this.lastMessageId))
        : undefined;
    }

    /**
     * Time when the channel was last updated (either created or a message was sent)
     */
    get updatedAt() {
      return this.lastMessageAt ?? this.createdAt;
    }

    // TODO: lastMessage

    get unread() {
      return false;
    }

    get mentions() {
      return [];
    }

    /**
     * URL to the channel icon
     */
    get iconURL() {
      return client.generateFileURL(this.icon ?? this.recipient?.avatar, {
        max_side: 256,
      });
    }

    /**
     * URL to a small variant of the channel icon
     */
    get smallIconURL() {
      return client.generateFileURL(this.icon ?? this.recipient?.avatar, {
        max_side: 64,
      });
    }

    /**
     * URL to the animated channel icon
     */
    get animatedIconURL() {
      return client.generateFileURL(
        this.icon ?? this.recipient?.avatar,
        { max_side: 256 },
        true
      );
    }

    /**
     * Permission the currently authenticated user has against this channel
     */
    get permission() {
      return calculatePermission(client, this);
    }

    /**
     * Check whether we have a given permission in a channel
     * @param permission Permission Names
     * @returns Whether we have this permission
     */
    havePermission(...permission: (keyof typeof Permission)[]) {
      return bitwiseAndEq(
        this.permission,
        ...permission.map((x) => Permission[x])
      );
    }

    /**
     * Fetch a channel's members.
     * @requires `Group`
     * @returns An array of the channel's members.
     */
    async fetchMembers() {
      const members = await client.api.get(
        `/channels/${this.id as ""}/members`
      );

      return members.map((user) => client.User.new(user._id, user));
    }

    /**
     * Edit a channel
     * @param data Edit data
     */
    async edit(data: DataEditChannel) {
      await client.api.patch(`/channels/${this.id as ""}`, data);
    }

    /**
     * Delete a channel
     * @param leave_silently Whether to not send a message on leave
     * @param noRequest Whether to not send a request
     * @requires `DM`, `Group`, `TextChannel`, `VoiceChannel`
     */
    async delete(leave_silently?: boolean, noRequest?: boolean) {
      if (!noRequest)
        await client.api.delete(`/channels/${this.id as ""}`, {
          leave_silently,
        });

      if (this.type === "DirectMessage") {
        Channel.#set(this.id, "active", false);
        return;
      }

      if (this.type === "TextChannel" || this.type === "VoiceChannel") {
        const server = this.server;
        if (server) {
          server.channelIds.delete(this.id);
        }
      }

      client.channels.delete(this.id);
    }

    /**
     * Add a user to a group
     * @param user_id ID of the target user
     */
    async addMember(user_id: string) {
      return await client.api.put(
        `/channels/${this.id as ""}/recipients/${user_id as ""}`
      );
    }

    /**
     * Remove a user from a group
     * @param user_id ID of the target user
     */
    async removeMember(user_id: string) {
      return await client.api.delete(
        `/channels/${this.id as ""}/recipients/${user_id as ""}`
      );
    }
    /**
     * Send a message
     * @param data Either the message as a string or message sending route data
     * @returns The message
     */
    async sendMessage(
      data: string | DataMessageSend,
      idempotencyKey: string = ulid()
    ) {
      const msg: DataMessageSend =
        typeof data === "string" ? { content: data } : data;

      const message = await client.api.post(
        `/channels/${this.id as ""}/messages`,
        msg,
        {
          headers: {
            "Idempotency-Key": idempotencyKey,
          },
        }
      );

      return client.Message.new(message._id, message);
    }

    /**
     * Fetch a message by its ID
     * @param messageId ID of the target message
     * @returns The message
     */
    async fetchMessage(messageId: string) {
      const message = await client.api.get(
        `/channels/${this.id as ""}/messages/${messageId as ""}`
      );

      return client.Message.new(message._id, message);
    }

    /**
     * Fetch multiple messages from a channel
     * @param params Message fetching route data
     * @returns The messages
     */
    async fetchMessages(
      params?: Omit<
        (APIRoutes & {
          method: "get";
          path: "/channels/{target}/messages";
        })["params"],
        "include_users"
      >
    ) {
      const messages = (await client.api.get(
        `/channels/${this.id as ""}/messages`,
        { ...params }
      )) as Message[];

      return messages.map((message) =>
        client.Message.new(message._id, message)
      );
    }

    /**
     * Fetch multiple messages from a channel including the users that sent them
     * @param params Message fetching route data
     * @returns Object including messages and users
     */
    async fetchMessagesWithUsers(
      params?: Omit<
        (APIRoutes & {
          method: "get";
          path: "/channels/{target}/messages";
        })["params"],
        "include_users"
      >
    ) {
      const data = (await client.api.get(
        `/channels/${this.id as ""}/messages`,
        { ...params, include_users: true }
      )) as { messages: Message[]; users: User[]; members?: Member[] };

      return {
        messages: data.messages.map((message) =>
          client.Message.new(message._id, message)
        ),
        users: data.users.map((user) => client.User.new(user._id, user)),
        members: data.members?.map((member) =>
          client.ServerMember.new(member._id, member)
        ),
      };
    }

    /**
     * Search for messages
     * @param params Message searching route data
     * @returns The messages
     */
    async search(params: Omit<OptionsMessageSearch, "include_users">) {
      const messages = (await client.api.post(
        `/channels/${this.id as ""}/search`,
        params
      )) as Message[];

      return messages.map((message) =>
        client.Message.new(message._id, message)
      );
    }

    /**
     * Search for messages including the users that sent them
     * @param params Message searching route data
     * @returns The messages
     */
    async searchWithUsers(params: Omit<OptionsMessageSearch, "include_users">) {
      const data = (await client.api.post(`/channels/${this.id as ""}/search`, {
        ...params,
        include_users: true,
      })) as { messages: Message[]; users: User[]; members?: Member[] };

      return {
        messages: data.messages.map((message) =>
          client.Message.new(message._id, message)
        ),
        users: data.users.map((user) => client.User.new(user._id, user)),
        members: data.members?.map((member) =>
          client.ServerMember.new(member._id, member)
        ),
      };
    }

    async deleteMessages(ids: string[]) {
      await client.api.delete(`/channels/${this.id as ""}/messages/bulk`, {
        data: { ids },
      });
    }

    /**
     * Create an invite to the channel
     * @returns Newly created invite code
     */
    async createInvite() {
      return await client.api.post(`/channels/${this.id as ""}/invites`);
    }

    #ackTimeout?: number;
    #ackLimit?: number;

    /**
     * Mark a channel as read
     * @param message Last read message or its ID
     * @param skipRateLimiter Whether to skip the internal rate limiter
     */
    async ack(message?: Message | string, skipRateLimiter?: boolean) {
      const id =
        (typeof message === "string" ? message : message?._id) ??
        this.lastMessageId ??
        ulid();
      const performAck = () => {
        this.#ackLimit = undefined;
        client.api.put(`/channels/${this.id}/ack/${id as ""}`);
      };

      /* TODO: if (!client.options.ackRateLimiter || skipRateLimiter)
            return performAck();*/

      clearTimeout(this.#ackTimeout);
      if (this.#ackLimit && +new Date() > this.#ackLimit) {
        performAck();
      }

      // We need to use setTimeout here for both Node.js and browser.
      this.#ackTimeout = setTimeout(performAck, 5000) as unknown as number;

      if (!this.#ackLimit) {
        this.#ackLimit = +new Date() + 15e3;
      }
    }

    /**
     * Set role permissions
     * @param role_id Role Id, set to 'default' to affect all users
     * @param permissions Permission value
     */
    async setPermissions(role_id = "default", permissions: Override) {
      return await client.api.put(
        `/channels/${this.id as ""}/permissions/${role_id as ""}`,
        { permissions }
      );
    }

    /**
     * Start typing in this channel
     */
    startTyping() {
      client.events.send({ type: "BeginTyping", channel: this.id });
    }

    /**
     * Stop typing in this channel
     */
    stopTyping() {
      client.events.send({ type: "EndTyping", channel: this.id });
    }
  };
