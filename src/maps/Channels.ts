import type {
    Channel as ChannelI,
    Message as MessageI,
} from "revolt-api/types/Channels";
import type { RemoveChannelField, Route } from "../api/routes";
import type { Attachment } from "revolt-api/types/Autumn";
import type { Member } from "revolt-api/types/Servers";
import type { User } from "revolt-api/types/Users";

import { action, computed, makeAutoObservable, runInAction } from "mobx";
import isEqual from "lodash.isequal";
import { decodeTime, ulid } from "ulid";

import { Nullable, toNullable } from "../util/null";
import Collection from "./Collection";
import { Message } from "./Messages";
import { Client, FileArgs } from "..";
import {
    DEFAULT_PERMISSION_DM,
    U32_MAX,
    UserPermission,
} from "../api/permissions";
import { INotificationChecker } from "../util/Unreads";
import Ratelimiter from '../util/ratelimiter';

export class Channel {
    client: Client;

    _id: string;
    channel_type: ChannelI["channel_type"];

    /**
     * Whether this DM is active.
     * @requires `DirectMessage`
     */
    active: Nullable<boolean> = null;

    /**
     * The ID of the group owner.
     * @requires `Group`
     */
    owner_id: Nullable<string> = null;

    /**
     * The ID of the server this channel is in.
     * @requires `TextChannel`, `VoiceChannel`
     */
    server_id: Nullable<string> = null;

    /**
     * Permissions for group members.
     * @requires `Group`
     */
    permissions: Nullable<number> = null;

    /**
     * Default server channel permissions.
     * @requires `TextChannel`, `VoiceChannel`
     */
    default_permissions: Nullable<number> = null;

    /**
     * Channel permissions for each role.
     * @requires `TextChannel`, `VoiceChannel`
     */
    role_permissions: Nullable<{ [key: string]: number }> = null;

    /**
     * Channel name.
     * @requires `Group`, `TextChannel`, `VoiceChannel`
     */
    name: Nullable<string> = null;

    /**
     * Channel icon.
     * @requires `Group`, `TextChannel`, `VoiceChannel`
     */
    icon: Nullable<Attachment> = null;

    /**
     * Channel description.
     * @requires `Group`, `TextChannel`, `VoiceChannel`
     */
    description: Nullable<string> = null;

    /**
     * Group / DM members.
     * @requires `Group`, `DM`
     */
    recipient_ids: Nullable<string[]> = null;

    /**
     * Id of last message in channel.
     * @requires `Group`, `DM`, `TextChannel`, `VoiceChannel`
     */
    last_message_id: Nullable<string> = null;

    /**
     * Users typing in channel.
     */
    typing_ids: Set<string> = new Set();

    /**
     * Channel is not safe for work.
     * @requires `Group`, `TextChannel`, `VoiceChannel`
     */
    nsfw: Nullable<boolean> = null;

    /**
     * Internal rate limiter for message sending.
     */
    #msgRatelimiter: Ratelimiter;

    /**
     * The group owner.
     * @requires `Group`
     */
    get owner() {
        if (this.owner_id === null) return;
        return this.client.users.get(this.owner_id);
    }

    /**
     * Server this channel belongs to.
     * @requires `Server`
     */
    get server() {
        if (this.server_id === null) return;
        return this.client.servers.get(this.server_id);
    }

    /**
     * The DM recipient.
     * @requires `DM`
     */
    get recipient() {
        const user_id = this.recipient_ids?.find(
            (x) => this.client.user!._id !== x,
        );
        if (!user_id) return;

        return this.client.users.get(user_id);
    }

    /**
     * Last message sent in this channel.
     * @requires `Group`, `DM`, `TextChannel`, `VoiceChannel`
     */
    get last_message() {
        const id = this.last_message_id;
        if (!id) return;

        return this.client.messages.get(id);
    }

    /**
     * Get the last message ID if it is present or the origin timestamp.
     */
    get last_message_id_or_past() {
        return this.last_message_id ?? "0";
    }

    /**
     * Group recipients.
     * @requires `Group`
     */
    get recipients() {
        return this.recipient_ids?.map((id) => this.client.users.get(id));
    }

    /**
     * Users typing.
     */
    get typing() {
        return Array.from(this.typing_ids).map((id) =>
            this.client.users.get(id),
        );
    }

    /**
     * Get timestamp when this channel was created.
     */
    get createdAt() {
        return decodeTime(this._id);
    }

    /**
     * Absolute pathname to this channel in the client.
     */
    get path() {
        if (this.server_id) {
            return `/server/${this.server_id}/channel/${this._id}`;
        } else {
            return `/channel/${this._id}`;
        }
    }

    /**
     * Get URL to this channel.
     */
    get url() {
        return this.client.configuration?.app + this.path;
    }

    @computed isUnread(permit: INotificationChecker) {
        if (permit.isMuted(this)) return false;
        return this.unread;
    }

    @computed getMentions(permit: INotificationChecker) {
        if (permit.isMuted(this)) return [];
        return this.mentions;
    }

    /**
     * Get whether this channel is unread.
     */
    get unread() {
        if (!this.last_message_id
            || this.channel_type === 'SavedMessages'
            || this.channel_type === 'VoiceChannel') return false;
        
        return (
            (
                this.client.unreads?.getUnread(this._id)?.last_id ?? "0"
            ).localeCompare(this.last_message_id) === -1
        );
    }

    /**
     * Get mentions in this channel for user.
     */
    get mentions() {
        if (this.channel_type === 'SavedMessages'
            || this.channel_type === 'VoiceChannel') return [];
        return this.client.unreads?.getUnread(this._id)?.mentions ?? [];
    }

    constructor(client: Client, data: ChannelI) {
        this.client = client;

        this._id = data._id;
        this.channel_type = data.channel_type;
        this.#msgRatelimiter = new Ratelimiter(this.client, "POST", `/channels/${this._id}/messages` as "/channels/id/messages");

        switch (data.channel_type) {
            case "DirectMessage": {
                this.active = toNullable(data.active);
                this.recipient_ids = toNullable(data.recipients);
                this.last_message_id = toNullable(data.last_message_id);
                break;
            }
            case "Group": {
                this.recipient_ids = toNullable(data.recipients);
                this.name = toNullable(data.name);
                this.owner_id = toNullable(data.owner);
                this.description = toNullable(data.description);
                this.last_message_id = toNullable(data.last_message_id);
                this.icon = toNullable(data.icon);
                this.permissions = toNullable(data.permissions);
                this.nsfw = toNullable(data.nsfw);
                break;
            }
            case "TextChannel":
            case "VoiceChannel": {
                this.server_id = toNullable(data.server);
                this.name = toNullable(data.name);
                this.description = toNullable(data.description);
                this.icon = toNullable(data.icon);
                this.default_permissions = toNullable(data.default_permissions);
                this.role_permissions = toNullable(data.role_permissions);

                if (data.channel_type === "TextChannel") {
                    this.last_message_id = toNullable(data.last_message_id);
                    this.nsfw = toNullable(data.nsfw);
                }

                break;
            }
        }

        makeAutoObservable(this, {
            _id: false,
            client: false,
        });
    }

    @action update(data: Partial<ChannelI>, clear?: RemoveChannelField) {
        const apply = (key: string, target?: string) => {
            if (
                // @ts-expect-error TODO: clean up types here
                typeof data[key] !== "undefined" &&
                // @ts-expect-error TODO: clean up types here
                !isEqual(this[target ?? key], data[key])
            ) {
                // @ts-expect-error TODO: clean up types here
                this[target ?? key] = data[key];
            }
        };

        switch (clear) {
            case "Description":
                this.description = null;
                break;
            case "Icon":
                this.icon = null;
                break;
        }

        apply("active");
        apply("owner", "owner_id");
        apply("permissions");
        apply("default_permissions");
        apply("role_permissions");
        apply("name");
        apply("icon");
        apply("description");
        apply("recipients", "recipient_ids");
        apply("last_message_id");
        apply("nsfw");
    }

    @action updateGroupJoin(user: string) {
        this.recipient_ids?.push(user);
    }

    @action updateGroupLeave(user: string) {
        this.recipient_ids = toNullable(
            this.recipient_ids?.filter((x) => x !== user),
        );
    }

    @action updateStartTyping(id: string) {
        this.typing_ids.add(id);
    }

    @action updateStopTyping(id: string) {
        this.typing_ids.delete(id);
    }

    /**
     * Fetch a channel's members.
     * @requires `Group`
     * @returns An array of the channel's members.
     */
    async fetchMembers() {
        const members = await this.client.req(
            "GET",
            `/channels/${this._id}/members` as "/channels/id/members",
        );
        return members.map(this.client.users.createObj);
    }

    /**
     * Edit a channel
     * @param data Channel editing route data
     */
    async edit(data: Route<"PATCH", "/channels/id">["data"]) {
        return await this.client.req(
            "PATCH",
            `/channels/${this._id}` as "/channels/id",
            data,
        );
        // ! FIXME: return $set in req
    }

    /**
     * Delete a channel
     * @requires `DM`, `Group`, `TextChannel`, `VoiceChannel`
     */
    async delete(avoidReq?: boolean) {
        if (!avoidReq)
            await this.client.req(
                "DELETE",
                `/channels/${this._id}` as "/channels/id",
            );

        runInAction(() => {
            if (this.channel_type === "DirectMessage") {
                this.active = true;
                return;
            }

            if (
                this.channel_type === "TextChannel" ||
                this.channel_type === "VoiceChannel"
            ) {
                const server = this.server;
                if (server) {
                    server.channel_ids = server.channel_ids.filter(
                        (x) => x !== this._id,
                    );
                }
            }

            this.client.channels.delete(this._id);
        });
    }

    /**
     * Add a user to a group
     * @param user_id ID of the target user
     */
    async addMember(user_id: string) {
        return await this.client.req(
            "PUT",
            `/channels/${this._id}/recipients/${user_id}` as "/channels/id/recipients/id",
        );
    }

    /**
     * Remove a user from a group
     * @param user_id ID of the target user
     */
    async removeMember(user_id: string) {
        return await this.client.req(
            "DELETE",
            `/channels/${this._id}/recipients/${user_id}` as "/channels/id/recipients/id",
        );
    }

    /**
     * Send a message
     * @param data Either the message as a string or message sending route data
     * @returns The message
     */
    async sendMessage(
        data:
            | string
            | (Omit<Route<"POST", "/channels/id/messages">["data"], "nonce"> & {
                  nonce?: string;
                  noRatelimiter?: boolean;
              }),
    ) {
        const msg: Route<"POST", "/channels/id/messages">["data"] = {
            nonce: ulid(),
            ...(typeof data === "string" ? { content: data } : data),
        };

        let message: MessageI;
        if (typeof data != 'string' && data.noRatelimiter == true) {
            message = await this.client.req(
                "POST",
                `/channels/${this._id}/messages` as "/channels/id/messages",
                msg,
            );
        } else {
            message = await this.#msgRatelimiter.send(
                "POST",
                `/channels/${this._id}/messages` as "/channels/id/messages",
                msg,
                this._id
            );
        }

        return this.client.messages.createObj(message, true);
    }

    /**
     * Fetch a message by its ID
     * @param message_id ID of the target message
     * @returns The message
     */
    async fetchMessage(message_id: string) {
        const message = await this.client.req(
            "GET",
            `/channels/${this._id}/messages/${message_id}` as "/channels/id/messages/id",
        );
        return this.client.messages.createObj(message);
    }

    /**
     * Fetch multiple messages from a channel
     * @param params Message fetching route data
     * @returns The messages
     */
    async fetchMessages(
        params?: Omit<
            Route<"GET", "/channels/id/messages">["data"],
            "include_users"
        >,
    ) {
        const messages = (await this.client.request(
            "GET",
            `/channels/${this._id}/messages` as "/channels/id/messages",
            { params },
        )) as MessageI[];
        return runInAction(() => messages.map(this.client.messages.createObj));
    }

    /**
     * Fetch multiple messages from a channel including the users that sent them
     * @param params Message fetching route data
     * @returns Object including messages and users
     */
    async fetchMessagesWithUsers(
        params?: Omit<
            Route<"GET", "/channels/id/messages">["data"],
            "include_users"
        >,
    ) {
        const data = (await this.client.request(
            "GET",
            `/channels/${this._id}/messages` as "/channels/id/messages",
            { params: { ...params, include_users: true } },
        )) as { messages: MessageI[]; users: User[]; members?: Member[] };
        return runInAction(() => {
            return {
                messages: data.messages.map(this.client.messages.createObj),
                users: data.users.map(this.client.users.createObj),
                members: data.members?.map(this.client.members.createObj),
            };
        });
    }

    /**
     * Search for messages
     * @param params Message searching route data
     * @returns The messages
     */
    async search(
        params: Omit<
            Route<"POST", "/channels/id/search">["data"],
            "include_users"
        >,
    ) {
        const messages = (await this.client.req(
            "POST",
            `/channels/${this._id}/search` as "/channels/id/search",
            params,
        )) as MessageI[];
        return runInAction(() => messages.map(this.client.messages.createObj));
    }

    /**
     * Search for messages including the users that sent them
     * @param params Message searching route data
     * @returns The messages
     */
    async searchWithUsers(
        params: Omit<
            Route<"POST", "/channels/id/search">["data"],
            "include_users"
        >,
    ) {
        const data = (await this.client.req(
            "POST",
            `/channels/${this._id}/search` as "/channels/id/search",
            { ...params, include_users: true },
        )) as { messages: MessageI[]; users: User[]; members?: Member[] };
        return runInAction(() => {
            return {
                messages: data.messages.map(this.client.messages.createObj),
                users: data.users.map(this.client.users.createObj),
                members: data.members?.map(this.client.members.createObj),
            };
        });
    }

    /**
     * Fetch stale messages
     * @param ids IDs of the target messages
     * @returns The stale messages
     */
    async fetchStale(ids: string[]) {
        const data = await this.client.req(
            "POST",
            `/channels/${this._id}/messages/stale` as "/channels/id/messages/stale",
            { ids },
        );

        runInAction(() => {
            data.deleted.forEach((id) => this.client.messages.delete(id));
            data.updated.forEach((data) =>
                this.client.messages.get(data._id)?.update(data),
            );
        });

        return data;
    }

    /**
     * Create an invite to the channel
     * @returns Newly created invite code
     */
    async createInvite() {
        const res = await this.client.req(
            "POST",
            `/channels/${this._id}/invites` as "/channels/id/invites",
        );
        return res.code;
    }

    /**
     * Join a call in a channel
     * @returns Join call response data
     */
    async joinCall() {
        return await this.client.req(
            "POST",
            `/channels/${this._id}/join_call` as "/channels/id/join_call",
        );
    }

    private ackTimeout?: number;
    private ackLimit?: number;

    /**
     * Mark a channel as read
     * @param message Last read message or its ID
     * @param skipRateLimiter Whether to skip the internal rate limiter
     */
    async ack(message?: Message | string, skipRateLimiter?: boolean) {
        const id =
            (typeof message === "string" ? message : message?._id) ??
            this.last_message_id ??
            ulid();
        const performAck = () => {
            delete this.ackLimit;
            this.client.req(
                "PUT",
                `/channels/${this._id}/ack/${id}` as "/channels/id/ack/id",
            );
        };

        if (!this.client.options.ackRateLimiter || skipRateLimiter)
            return performAck();

        clearTimeout(this.ackTimeout);
        if (this.ackLimit && +new Date() > this.ackLimit) {
            performAck();
        }

        // We need to use setTimeout here for both Node.js and browser.
        this.ackTimeout = setTimeout(performAck, 5000) as unknown as number;

        if (!this.ackLimit) {
            this.ackLimit = +new Date() + 15e3;
        }
    }

    /**
     * Set role permissions
     * @param role_id Role Id, set to 'default' to affect all users
     * @param permissions Permission number, removes permission if unset
     */
    async setPermissions(role_id = "default", permissions?: number) {
        return await this.client.req(
            "PUT",
            `/channels/${this._id}/permissions/${role_id}` as "/channels/id/permissions/id",
            { permissions },
        );
    }

    /**
     * Start typing in this channel
     */
    startTyping() {
        this.client.websocket.send({ type: "BeginTyping", channel: this._id });
    }

    /**
     * Stop typing in this channel
     */
    stopTyping() {
        this.client.websocket.send({ type: "EndTyping", channel: this._id });
    }

    generateIconURL(...args: FileArgs) {
        return this.client.generateFileURL(this.icon ?? undefined, ...args);
    }

    @computed get permission() {
        switch (this.channel_type) {
            case "SavedMessages":
                return U32_MAX;
            case "DirectMessage": {
                const user_permissions = this.recipient?.permission || 0;

                if (user_permissions & UserPermission.SendMessage) {
                    return DEFAULT_PERMISSION_DM;
                } else {
                    return 0;
                }
            }
            case "Group": {
                if (this.owner_id === this.client.user!._id) {
                    return DEFAULT_PERMISSION_DM;
                } else {
                    return this.permissions ?? DEFAULT_PERMISSION_DM;
                }
            }
            case "TextChannel":
            case "VoiceChannel": {
                const server = this.server;
                if (typeof server === "undefined") return 0;

                if (server.owner === this.client.user?._id) {
                    return U32_MAX;
                } else {
                    const member = this.client.members.getKey({
                        user: this.client.user!._id,
                        server: server._id,
                    }) ?? { roles: null };

                    if (!member) return 0;

                    let perm =
                        (this.default_permissions ??
                            server.default_permissions[1]) >>> 0;

                    if (member.roles) {
                        for (const role of member.roles) {
                            perm |= (this.role_permissions?.[role] ?? 0) >>> 0;
                            perm |=
                                (server.roles?.[role].permissions[1] ?? 0) >>>
                                0;
                        }
                    }

                    return perm;
                }
            }
        }
    }
}

export default class Channels extends Collection<string, Channel> {
    constructor(client: Client) {
        super(client);
        this.createObj = this.createObj.bind(this);
    }

    @action $get(id: string, data?: ChannelI) {
        const channel = this.get(id)!;
        if (data) channel.update(data);
        return channel;
    }

    /**
     * Fetch a channel
     * @param id Channel ID
     * @returns The channel
     */
    async fetch(id: string, data?: ChannelI) {
        if (this.has(id)) return this.$get(id);
        const res =
            data ??
            (await this.client.req("GET", `/channels/${id}` as "/channels/id"));
        return this.createObj(res);
    }

    /**
     * Create a channel object.
     * This is meant for internal use only.
     * @param data: Channel Data
     * @param emit Whether to emit creation event
     * @returns Channel
     */
    createObj(data: ChannelI, emit?: boolean | number) {
        if (this.has(data._id)) return this.$get(data._id);
        const channel = new Channel(this.client, data);

        runInAction(() => {
            this.set(data._id, channel);
        });

        if (emit === true) this.client.emit("channel/create", channel);
        return channel;
    }

    /**
     * Create a group
     * @param data Group create route data
     * @returns The newly-created group
     */
    async createGroup(data: Route<"POST", "/channels/create">["data"]) {
        const group = await this.client.req("POST", `/channels/create`, data);
        return (await this.fetch(group._id, group))!;
    }
}
