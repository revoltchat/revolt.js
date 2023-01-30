import type {
    Channel as ChannelI,
    DataCreateGroup,
    DataEditChannel,
    DataMessageSend,
    FieldsChannel,
    Message as MessageI,
    OptionsMessageSearch,
} from "revolt-api";
import type { File } from "revolt-api";
import type { Member } from "revolt-api";
import type { User } from "revolt-api";

import { action, computed, makeAutoObservable, runInAction } from "mobx";
import isEqual from "lodash.isequal";
import { decodeTime, ulid } from "ulid";

import { Nullable, toNullable } from "../util/null";
import Collection from "./Collection";
import { Message } from "./Messages";
import { Client, FileArgs } from "..";
import { Permission } from "../permissions/definitions";
import { INotificationChecker } from "../util/Unreads";
import { Override, OverrideField } from "revolt-api";
import type { APIRoutes } from "revolt-api/dist/routes";
import { bitwiseAndEq, calculatePermission } from "../permissions/calculator";

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
    default_permissions: Nullable<OverrideField> = null;

    /**
     * Channel permissions for each role.
     * @requires `TextChannel`, `VoiceChannel`
     */
    role_permissions: Nullable<{ [key: string]: OverrideField }> = null;

    /**
     * Channel name.
     * @requires `Group`, `TextChannel`, `VoiceChannel`
     */
    name: Nullable<string> = null;

    /**
     * Channel icon.
     * @requires `Group`, `TextChannel`, `VoiceChannel`
     */
    icon: Nullable<File> = null;

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
     * TODO: deprecate
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
     * Get timestamp when this channel last had a message sent or when it was created
     */
    get updatedAt() {
        return this.last_message_id
            ? decodeTime(this.last_message_id)
            : this.createdAt;
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

    /**
     * Check whether the channel is currently unread
     * @param permit Callback function to determine whether a channel has certain properties
     * @returns Whether the channel is unread
     */
    @computed isUnread(permit: INotificationChecker) {
        if (permit.isMuted(this)) return false;
        return this.unread;
    }

    /**
     * Find all message IDs of unread messages
     * @param permit Callback function to determine whether a channel has certain properties
     * @returns Array of message IDs which are unread
     */
    @computed getMentions(permit: INotificationChecker) {
        if (permit.isMuted(this)) return [];
        return this.mentions;
    }

    /**
     * Get whether this channel is unread.
     */
    get unread() {
        if (
            !this.last_message_id ||
            this.channel_type === "SavedMessages" ||
            this.channel_type === "VoiceChannel"
        )
            return false;

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
        if (
            this.channel_type === "SavedMessages" ||
            this.channel_type === "VoiceChannel"
        )
            return [];
        return this.client.unreads?.getUnread(this._id)?.mentions ?? [];
    }

    constructor(client: Client, data: ChannelI) {
        this.client = client;

        this._id = data._id;
        this.channel_type = data.channel_type;

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

    @action update(data: Partial<ChannelI>, clear: FieldsChannel[] = []) {
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

        for (const entry of clear) {
            switch (entry) {
                case "Description":
                    this.description = null;
                    break;
                case "Icon":
                    this.icon = null;
                    break;
            }
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
        const members = await this.client.api.get(
            `/channels/${this._id as ""}/members`,
        );

        return members.map(this.client.users.createObj);
    }

    /**
     * Edit a channel
     * @param data Edit data
     */
    async edit(data: DataEditChannel) {
        this.update(
            await this.client.api.patch(`/channels/${this._id as ""}`, data),
        );
    }

    /**
     * Delete a channel
     * @requires `DM`, `Group`, `TextChannel`, `VoiceChannel`
     */
    async delete(leave_silently?: boolean, avoidReq?: boolean) {
        if (!avoidReq)
            await this.client.api.delete(`/channels/${this._id as ""}`, {
                leave_silently,
            });

        runInAction(() => {
            if (this.channel_type === "DirectMessage") {
                this.active = false;
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
        return await this.client.api.put(
            `/channels/${this._id as ""}/recipients/${user_id as ""}`,
        );
    }

    /**
     * Remove a user from a group
     * @param user_id ID of the target user
     */
    async removeMember(user_id: string) {
        return await this.client.api.delete(
            `/channels/${this._id as ""}/recipients/${user_id as ""}`,
        );
    }

    /**
     * Send a message
     * @param data Either the message as a string or message sending route data
     * @returns The message
     */
    async sendMessage(
        data: string | DataMessageSend,
        idempotencyKey: string = ulid(),
    ) {
        const msg: DataMessageSend =
            typeof data === "string" ? { content: data } : data;

        const message = await this.client.api.post(
            `/channels/${this._id as ""}/messages`,
            msg,
            {
                headers: {
                    "Idempotency-Key": idempotencyKey,
                },
            },
        );

        return this.client.messages.createObj(message, true);
    }

    /**
     * Fetch a message by its ID
     * @param message_id ID of the target message
     * @returns The message
     */
    async fetchMessage(message_id: string) {
        const message = await this.client.api.get(
            `/channels/${this._id as ""}/messages/${message_id as ""}`,
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
            (APIRoutes & {
                method: "get";
                path: "/channels/{target}/messages";
            })["params"],
            "include_users"
        >,
    ) {
        const messages = (await this.client.api.get(
            `/channels/${this._id as ""}/messages`,
            { ...params },
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
            (APIRoutes & {
                method: "get";
                path: "/channels/{target}/messages";
            })["params"],
            "include_users"
        >,
    ) {
        const data = (await this.client.api.get(
            `/channels/${this._id as ""}/messages`,
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
     * Search for messages
     * @param params Message searching route data
     * @returns The messages
     */
    async search(params: Omit<OptionsMessageSearch, "include_users">) {
        const messages = (await this.client.api.post(
            `/channels/${this._id as ""}/search`,
            params,
        )) as MessageI[];
        return runInAction(() => messages.map(this.client.messages.createObj));
    }

    /**
     * Search for messages including the users that sent them
     * @param params Message searching route data
     * @returns The messages
     */
    async searchWithUsers(params: Omit<OptionsMessageSearch, "include_users">) {
        const data = (await this.client.api.post(
            `/channels/${this._id as ""}/search`,
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
        /*const data = await this.client.api.post(
            `/channels/${this._id as ''}/messages/stale`,
            { ids },
        );

        runInAction(() => {
            data.deleted.forEach((id) => this.client.messages.delete(id));
            data.updated.forEach((data) =>
                this.client.messages.get(data._id)?.update(data),
            );
        });

        return data;*/
        return { deprecated: ids };
    }

    async deleteMessages(ids: string[]) {
        await this.client.api.delete(
            `/channels/${this._id as ""}/messages/bulk`,
            { data: { ids } },
        );
    }

    /**
     * Create an invite to the channel
     * @returns Newly created invite code
     */
    async createInvite() {
        return await this.client.api.post(
            `/channels/${this._id as ""}/invites`,
        );
    }

    /**
     * Join a call in a channel
     * @returns Join call response data
     */
    async joinCall() {
        return await this.client.api.post(
            `/channels/${this._id as ""}/join_call`,
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
            this.client.api.put(`/channels/${this._id}/ack/${id as ""}`);
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
     * @param permissions Permission value
     */
    async setPermissions(role_id = "default", permissions: Override) {
        return await this.client.api.put(
            `/channels/${this._id as ""}/permissions/${role_id as ""}`,
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

    /**
     * Generate URL to icon for this channel
     * @param args File parameters
     * @returns File URL
     */
    generateIconURL(...args: FileArgs) {
        if (this.channel_type === "DirectMessage") {
            return this.client.generateFileURL(
                this.recipient?.avatar ?? undefined,
                ...args,
            );
        }

        return this.client.generateFileURL(this.icon ?? undefined, ...args);
    }

    /**
     * Permission the currently authenticated user has against this channel
     */
    @computed get permission() {
        return calculatePermission(this);
    }

    /**
     * Check whether we have a given permission in a channel
     * @param permission Permission Names
     * @returns Whether we have this permission
     */
    @computed havePermission(...permission: (keyof typeof Permission)[]) {
        return bitwiseAndEq(
            this.permission,
            ...permission.map((x) => Permission[x]),
        );
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
     * Check whether a channel should currently exist
     * @param id Channel ID
     * @returns Whether it should current exist
     */
    exists(id: string) {
        const channel = this.get(id);
        if (channel) {
            switch (channel.channel_type) {
                case "DirectMessage":
                    return channel.active;
                default:
                    return true;
            }
        } else {
            return false;
        }
    }

    /**
     * Fetch a channel
     * @param id Channel ID
     * @returns The channel
     */
    async fetch(id: string, data?: ChannelI) {
        if (this.has(id)) return this.$get(id);
        const res =
            data ?? (await this.client.api.get(`/channels/${id as ""}`));
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
    async createGroup(data: DataCreateGroup) {
        const group = await this.client.api.post(`/channels/create`, data);
        return (await this.fetch(group._id, group))!;
    }
}
