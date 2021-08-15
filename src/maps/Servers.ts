import type { Category, PermissionTuple, Role, Server as ServerI, SystemMessageChannels } from 'revolt-api/types/Servers';
import type { RemoveServerField, Route } from '../api/routes';
import type { Attachment } from 'revolt-api/types/Autumn';

import { makeAutoObservable, action, runInAction, computed } from 'mobx';
import isEqual from 'lodash.isequal';

import { Nullable, toNullable } from '../util/null';
import { U32_MAX } from '../api/permissions';
import Collection from './Collection';
import { User } from './Users';
import { Client, FileArgs } from '..';

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
    default_permissions: PermissionTuple;

    icon: Nullable<Attachment> = null;
    banner: Nullable<Attachment> = null;

    get channels() {
        return this.channel_ids.map(x => this.client.channels.get(x));
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

        makeAutoObservable(this, {
            _id: false,
            client: false,
        });
    }

    @action update(data: Partial<ServerI>, clear?: RemoveServerField) {
        const apply = (key: string, target?: string) => {
            // This code has been tested.
            // @ts-expect-error
            if (typeof data[key] !== 'undefined' && !isEqual(this[target ?? key], data[key])) {
                // @ts-expect-error
                this[target ?? key] = data[key];
            }
        };

        switch (clear) {
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
    }

    /**
     * Create a channel
     * @param data Channel create route data
     * @returns The newly-created channel
     */
    async createChannel(data: Route<'POST', '/servers/id/channels'>["data"]) {
        return await this.client.req('POST', `/servers/${this._id}/channels` as '/servers/id/channels', data);
    }

    /**
     * Edit a server
     * @param data Server editing route data
     */
    async edit(data: Route<'PATCH', '/servers/id'>["data"]) {
        return await this.client.req('PATCH', `/servers/${this._id}` as '/servers/id', data);
    }

    /**
     * Delete a guild
     */
    async delete(avoidReq?: boolean) {
        if (!avoidReq)
            await this.client.req('DELETE', `/servers/${this._id}` as '/servers/id');

        runInAction(() => {
            this.client.servers.delete(this._id);
        });
    }

    /**
     * Mark a server as read
     */
    async ack() {
        return await this.client.req('PUT', `/servers/${this._id}/ack` as '/servers/id/ack');
    }

    /**
     * Ban user
     * @param user_id User ID
     */
    async banUser(user_id: string, data: Route<'PUT', '/servers/id/bans/id'>["data"]) {
        return await this.client.req('PUT', `/servers/${this._id}/bans/${user_id}` as '/servers/id/bans/id', data);
    }

    /**
     * Unban user
     * @param user_id User ID
     */
    async unbanUser(user_id: string) {
        return await this.client.req('DELETE', `/servers/${this._id}/bans/${user_id}` as '/servers/id/bans/id');
    }

    /**
     * Fetch a server's invites
     * @returns An array of the server's invites
     */
    async fetchInvites() {
        return await this.client.req('GET', `/servers/${this._id}/invites` as '/servers/id/invites');
    }

    /**
     * Fetch a server's bans
     * @returns An array of the server's bans.
     */
    async fetchBans() {
        return await this.client.req('GET', `/servers/${this._id}/bans` as '/servers/id/bans');
    }

    /**
     * Set role permissions
     * @param role_id Role Id, set to 'default' to affect all users
     * @param permissions Permission number, removes permission if unset
     */
    async setPermissions(role_id: string = 'default', permissions?: { server: number, channel: number }) {
        return await this.client.req('PUT', `/servers/${this._id}/permissions/${role_id}` as '/servers/id/permissions/id', { permissions });
    }

    /**
     * Create role
     * @param name Role name
     */
    async createRole(name: string) {
        return await this.client.req('POST', `/servers/${this._id}/roles` as '/servers/id/roles', { name });
    }

    /**
     * Edit a role
     * @param role_id Role ID
     * @param data Role editing route data
     */
    async editRole(role_id: string, data: Route<'PATCH', '/servers/id/roles/id'>["data"]) {
        return await this.client.req('PATCH', `/servers/${this._id}/roles/${role_id}` as '/servers/id/roles/id', data);
    }

    /**
     * Delete role
     * @param role_id Role ID
     */
    async deleteRole(role_id: string) {
        return await this.client.req('DELETE', `/servers/${this._id}/roles/${role_id}` as '/servers/id/roles/id');
    }

    /**
     * Fetch a server member
     * @param user User or User ID
     * @returns Server member object
     */
    async fetchMember(user: User | string) {
        const user_id = typeof user === 'string' ? user : user._id;
        const existing = this.client.members.getKey({ server: this._id, user: user_id });
        if (existing) return existing;

        const member = await this.client.req('GET', `/servers/${this._id}/members/${user_id}` as '/servers/id/members/id');
        return this.client.members.createObj(member);
    }

    /**
     * Fetch a server's members.
     * @returns An array of the server's members and their user objects.
     */
    async fetchMembers() {
        let data = await this.client.req('GET', `/servers/${this._id}/members` as '/servers/id/members');
        return runInAction(() => {
            return {
                members: data.members.map(this.client.members.createObj),
                users: data.users.map(this.client.users.createObj)
            }
        });
    }

    @computed generateIconURL(...args: FileArgs) {
        return this.client.generateFileURL(this.icon ?? undefined, ...args);
    }

    @computed generateBannerURL(...args: FileArgs) {
        return this.client.generateFileURL(this.banner ?? undefined, ...args);
    }

    @computed get permission() {
        if (this.owner === this.client.user?._id) {
            return U32_MAX;
        } else {
            let member = this.client.members.getKey({
                user: this.client.user!._id,
                server: this._id
            }) ?? { roles: null };

            if (!member) return 0;

            let perm = this.default_permissions[0] >>> 0;
            if (member.roles) {
                for (let role of member.roles) {
                    perm |= (this.roles?.[role].permissions[0] ?? 0) >>> 0;
                }
            }

            return perm;
        }
    }
}

export default class Servers extends Collection<string, Server> {
    constructor(client: Client) {
        super(client);
        this.createObj = this.createObj.bind(this);
    }

    @action $get(id: string, data?: ServerI) {
        let server = this.get(id)!;
        if (data) server.update(data);
        return server;
    }

    /**
     * Fetch a server
     * @param id Server ID
     * @returns The server
     */
    async fetch(id: string, data?: ServerI) {
        if (this.has(id)) return this.$get(id, data);
        let res = data ?? await this.client.req('GET', `/servers/${id}` as '/servers/id');

        return runInAction(async () => {
            for (let channel of res.channels) {
                // ! FIXME: add route for fetching all channels
                // ! FIXME: OR the WHOLE server
                try {
                    await this.client.channels.fetch(channel);
                // future proofing for when not
                } catch (err) {}
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
        let server = new Server(this.client, data);

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
    async createServer(data: Route<'POST', '/servers/create'>["data"]) {
        let server = await this.client.req('POST', `/servers/create`, data);
        return this.fetch(server._id, server);
    }
}
