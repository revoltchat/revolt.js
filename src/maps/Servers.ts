import type {
    Category,
    Channel as ChannelI,
    DataBanCreate,
    DataCreateChannel,
    DataCreateServer,
    DataEditRole,
    DataEditServer,
    FieldsServer,
    Role,
    Server as ServerI,
    SystemMessageChannels,
} from "revolt-api";
import type { File } from "revolt-api";

import { makeAutoObservable, action, runInAction, computed } from "mobx";
import isEqual from "lodash.isequal";

import { Nullable, toNullable } from "../util/null";
import { Permission } from "../permissions/definitions";
import Collection from "./Collection";
import { User } from "./Users";
import { Channel, Client, FileArgs } from "..";
import { decodeTime } from "ulid";
import { INotificationChecker } from "../util/Unreads";
import { Override } from "revolt-api";
import { bitwiseAndEq, calculatePermission } from "../permissions/calculator";

export class Server {
    client: Client;

    _id: string;
    owner: string;
    name: string;
    description: Nullable<string> = null;

    channel_ids: string[] = [];
    categories: Nullable<Category[]> = null;
    system_messages: Nullable<SystemMessageChannels> = null;

    roles: Nullable<{ [key: string]: Role }> = null;
    default_permissions: number;

    icon: Nullable<File> = null;
    banner: Nullable<File> = null;

    nsfw: Nullable<boolean> = null;
    flags: Nullable<number> = null;

    get channels() {
        return this.channel_ids
            .map((x) => this.client.channels.get(x))
            .filter((x) => x);
    }

    /**
     * Get timestamp when this server was created.
     */
    get createdAt() {
        return decodeTime(this._id);
    }

    /**
     * Absolute pathname to this server in the client.
     */
    get path() {
        return `/server/${this._id}`;
    }

    /**
     * Get URL to this server.
     */
    get url() {
        return this.client.configuration?.app + this.path;
    }

    /**
     * Get an array of ordered categories with their respective channels.
     * Uncategorised channels are returned in `id="default"` category.
     */
    @computed get orderedChannels(): (Omit<Category, "channels"> & {
        channels: Channel[];
    })[] {
        const uncategorised = new Set(
            this.channel_ids.filter((key) => this.client.channels.has(key)),
        );

        const elements = [];
        let defaultCategory;

        if (this.categories) {
            for (const category of this.categories) {
                const channels = [];
                for (const key of category.channels) {
                    if (uncategorised.delete(key)) {
                        channels.push(this.client.channels.get(key)!);
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
                (key) => this.client.channels.get(key)!,
            );

            if (defaultCategory) {
                defaultCategory.channels = [
                    ...defaultCategory.channels,
                    ...channels,
                ];
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
     * Get the default channel for this server
     */
    @computed get defaultChannel(): Channel | undefined {
        return this.orderedChannels.find((cat) => cat.channels.length)
            ?.channels[0];
    }

    /**
     * Get an ordered array of roles with their IDs attached.
     * The highest ranking roles will be first followed by lower
     * ranking roles. This is dictated by the "rank" property
     * which is smaller for higher priority roles.
     */
    @computed get orderedRoles() {
        return Object.keys(this.roles ?? {})
            .map((id) => {
                return {
                    id,
                    ...this.roles![id],
                };
            })
            .sort((a, b) => (a.rank || 0) - (b.rank || 0));
    }

    /**
     * Check whether the server is currently unread
     * @param permit Callback function to determine whether a server has certain properties
     * @returns Whether the server is unread
     */
    @computed isUnread(permit?: INotificationChecker) {
        if (permit?.isMuted(this)) return false;
        return this.channels.find(
            (channel) => !permit?.isMuted(channel) && channel?.unread,
        );
    }

    /**
     * Find all message IDs of unread messages
     * @param permit Callback function to determine whether a server has certain properties
     * @returns Array of message IDs which are unread
     */
    @computed getMentions(permit?: INotificationChecker) {
        if (permit?.isMuted(this)) return [];
        const arr = this.channels
            .filter((channel) => !permit?.isMuted(channel))
            .map((channel) => channel?.mentions) as string[][];

        return ([] as string[]).concat(...arr);
    }

    constructor(client: Client, data: ServerI) {
        this.client = client;

        this._id = data._id;
        this.owner = data.owner;
        this.name = data.name;
        this.description = toNullable(data.description);

        this.channel_ids = data.channels;
        this.categories = toNullable(data.categories);
        this.system_messages = toNullable(data.system_messages);

        this.roles = toNullable(data.roles);
        this.default_permissions = data.default_permissions;

        this.icon = toNullable(data.icon);
        this.banner = toNullable(data.banner);

        this.nsfw = toNullable(data.nsfw);
        this.flags = toNullable(data.flags);

        makeAutoObservable(this, {
            _id: false,
            client: false,
        });
    }

    @action update(data: Partial<ServerI>, clear: FieldsServer[] = []) {
        const apply = (key: string, target?: string) => {
            // This code has been tested.
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
                case "Banner":
                    this.banner = null;
                    break;
                case "Description":
                    this.description = null;
                    break;
                case "Icon":
                    this.icon = null;
                    break;
            }
        }

        apply("owner");
        apply("name");
        apply("description");
        apply("channels", "channel_ids");
        apply("categories");
        apply("system_messages");
        apply("roles");
        apply("default_permissions");
        apply("icon");
        apply("banner");
        apply("nsfw");
        apply("flags");
    }

    /**
     * Create a channel
     * @param data Channel create route data
     * @returns The newly-created channel
     */
    async createChannel(data: DataCreateChannel) {
        return await this.client.api.post(
            `/servers/${this._id as ""}/channels`,
            data,
        );
    }

    /**
     * Edit a server
     * @param data Server editing route data
     */
    async edit(data: DataEditServer) {
        return await this.client.api.patch(`/servers/${this._id as ""}`, data);
    }

    /**
     * Delete a guild
     */
    async delete(leave_silently?: boolean, avoidReq?: boolean) {
        if (!avoidReq)
            await this.client.api.delete(`/servers/${this._id as ""}`, {
                leave_silently,
            });

        runInAction(() => {
            this.client.servers.delete(this._id);
        });
    }

    /**
     * Mark a server as read
     */
    async ack() {
        return await this.client.api.put(`/servers/${this._id}/ack`);
    }

    /**
     * Ban user
     * @param user_id User ID
     */
    async banUser(user_id: string, data: DataBanCreate) {
        return await this.client.api.put(
            `/servers/${this._id as ""}/bans/${user_id}`,
            data,
        );
    }

    /**
     * Unban user
     * @param user_id User ID
     */
    async unbanUser(user_id: string) {
        return await this.client.api.delete(
            `/servers/${this._id as ""}/bans/${user_id}`,
        );
    }

    /**
     * Fetch a server's invites
     * @returns An array of the server's invites
     */
    async fetchInvites() {
        return await this.client.api.get(`/servers/${this._id as ""}/invites`);
    }

    /**
     * Fetch a server's bans
     * @returns An array of the server's bans.
     */
    async fetchBans() {
        return await this.client.api.get(`/servers/${this._id as ""}/bans`);
    }

    /**
     * Set role permissions
     * @param role_id Role Id, set to 'default' to affect all users
     * @param permissions Permission value
     */
    async setPermissions(role_id = "default", permissions: Override | number) {
        return await this.client.api.put(
            `/servers/${this._id as ""}/permissions/${role_id as ""}`,
            { permissions: permissions as Override },
        );
    }

    /**
     * Create role
     * @param name Role name
     */
    async createRole(name: string) {
        return await this.client.api.post(`/servers/${this._id as ""}/roles`, {
            name,
        });
    }

    /**
     * Edit a role
     * @param role_id Role ID
     * @param data Role editing route data
     */
    async editRole(role_id: string, data: DataEditRole) {
        return await this.client.api.patch(
            `/servers/${this._id as ""}/roles/${role_id as ""}`,
            data,
        );
    }

    /**
     * Delete role
     * @param role_id Role ID
     */
    async deleteRole(role_id: string) {
        return await this.client.api.delete(
            `/servers/${this._id as ""}/roles/${role_id as ""}`,
        );
    }

    /**
     * Fetch a server member
     * @param user User or User ID
     * @returns Server member object
     */
    async fetchMember(user: User | string) {
        const user_id = typeof user === "string" ? user : user._id;
        const existing = this.client.members.getKey({
            server: this._id,
            user: user_id,
        });
        if (existing) return existing;

        const member = await this.client.api.get(
            `/servers/${this._id as ""}/members/${user_id as ""}`,
        );

        return this.client.members.createObj(member);
    }

    /**
     * Optimised member fetch route.
     * @param exclude_offline
     */
    async syncMembers(exclude_offline?: boolean) {
        const data = await this.client.api.get(
            `/servers/${this._id as ""}/members`,
            { exclude_offline },
        );

        runInAction(() => {
            if (exclude_offline) {
                for (let i = 0; i < data.users.length; i++) {
                    const user = data.users[i];
                    if (user.online) {
                        this.client.users.createObj(user);
                        this.client.members.createObj(data.members[i]);
                    }
                }
            } else {
                for (let i = 0; i < data.users.length; i++) {
                    this.client.users.createObj(data.users[i]);
                    this.client.members.createObj(data.members[i]);
                }
            }
        });
    }

    /**
     * Fetch a server's members.
     * @returns An array of the server's members and their user objects.
     */
    async fetchMembers() {
        const data = await this.client.api.get(
            `/servers/${this._id as ""}/members`,
            { exclude_offline: false },
        );

        // Note: this takes 986 ms (Testers server)
        return runInAction(() => {
            return {
                members: data.members.map(this.client.members.createObj),
                users: data.users.map(this.client.users.createObj),
            };
        });
    }

    /**
     * Generate URL to icon for this server
     * @param args File parameters
     * @returns File URL
     */
    @computed generateIconURL(...args: FileArgs) {
        return this.client.generateFileURL(this.icon ?? undefined, ...args);
    }

    /**
     * Generate URL to banner for this server
     * @param args File parameters
     * @returns File URL
     */
    @computed generateBannerURL(...args: FileArgs) {
        return this.client.generateFileURL(this.banner ?? undefined, ...args);
    }

    /**
     * Get our own member object for this server
     */
    @computed get member() {
        return this.client.members.getKey({
            server: this._id,
            user: this.client.user!._id,
        });
    }

    /**
     * Permission the currently authenticated user has against this server
     */
    @computed get permission() {
        return calculatePermission(this);
    }

    /**
     * Check whether we have a given permission in a server
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

export default class Servers extends Collection<string, Server> {
    constructor(client: Client) {
        super(client);
        this.createObj = this.createObj.bind(this);
    }

    @action $get(id: string, data?: ServerI) {
        const server = this.get(id)!;
        if (data) server.update(data);
        return server;
    }

    /**
     * Fetch a server
     * @param id Server ID
     * @returns The server
     */
    async fetch(id: string, data?: ServerI, channels?: ChannelI[]) {
        if (this.has(id)) return this.$get(id, data);
        const res =
            data ??
            (await this.client.api.get(`/servers/${id as ""}`, {
                include_channels: false,
            }));

        return runInAction(async () => {
            if (channels) {
                for (const channel of channels) {
                    await this.client.channels.fetch(channel._id, channel);
                }
            } else {
                for (const channel of res.channels) {
                    // ! FIXME: add route for fetching all channels
                    // ! FIXME: OR the WHOLE server
                    try {
                        await this.client.channels.fetch(channel);
                        // future proofing for when not
                    } catch (err) {}
                }
            }

            return this.createObj(res);
        });
    }

    /**
     * Create a server object.
     * This is meant for internal use only.
     * @param data: Server Data
     * @returns Server
     */
    createObj(data: ServerI) {
        if (this.has(data._id)) return this.$get(data._id, data);
        const server = new Server(this.client, data);

        runInAction(() => {
            this.set(data._id, server);
        });

        return server;
    }

    /**
     * Create a server
     * @param data Server create route data
     * @returns The newly-created server
     */
    async createServer(data: DataCreateServer) {
        const { server, channels } = await this.client.api.post(
            `/servers/create`,
            data,
        );
        return await this.fetch(server._id, server, channels);
    }
}
