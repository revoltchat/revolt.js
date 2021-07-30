import type { Server } from 'revolt-api/types/Servers';

import { Client } from '..';
import { Route } from '../api/routes';
import Collection from './Collection';

export default class Servers extends Collection<Server> {
    constructor(client: Client) {
        super(client);
    }

    /**
     * Fetch a server, but do not make the return value read-only
     * @param id Server ID
     * @returns The server
     */
    async fetch(id: string): Promise<Server> {
        return await this.client.req('GET', `/servers/${id}` as '/servers/id');
    }

    /**
     * Create a server
     * @param data Server create route data
     * @returns The newly-created server
     */
    async createServer(data: Route<'POST', '/servers/create'>["data"]) {
        return await this.client.req('POST', `/servers/create`, data);
    }

    /**
     * Create a channel
     * @param id ID of the target server
     * @param data Channel create route data
     * @returns The newly-created channel
     */
    async createChannel(id: string, data: Route<'POST', '/servers/id/channels'>["data"]) {
        return await this.client.req('POST', `/servers/${id}/channels` as '/servers/id/channels', data);
    }

    /**
     * Edit a server
     * @param id ID of the target server
     * @param data Server editing route data
     */
    async edit(id: string, data: Route<'PATCH', '/servers/id'>["data"]) {
        return await this.client.req('PATCH', `/servers/${id}` as '/servers/id', data);
    }

    /**
     * Delete a guild
     * @param id ID of the target server
     */
    async delete(id: string) {
        return await this.client.req('DELETE', `/servers/${id}` as '/servers/id');
    }

    /**
     * Ban user
     * @param id Server ID
     * @param user_id User ID
     */
    async banUser(id: string, user_id: string, data: Route<'PUT', '/servers/id/bans/id'>["data"]) {
        return await this.client.req('PUT', `/servers/${id}/bans/${user_id}` as '/servers/id/bans/id', data);
    }

    /**
     * Unban user
     * @param id Server ID
     * @param user_id User ID
     */
    async unbanUser(id: string, user_id: string) {
        return await this.client.req('DELETE', `/servers/${id}/bans/${user_id}` as '/servers/id/bans/id');
    }

    /**
     * Fetch a server's invites
     * @param id Server ID
     * @returns An array of the server's invites
     */
    async fetchInvites(id: string) {
        return await this.client.req('GET', `/servers/${id}/invites` as '/servers/id/invites');
    }

    /**
     * Fetch a server's bans
     * @param id Server ID
     * @returns An array of the server's bans.
     */
    async fetchBans(id: string) {
        return await this.client.req('GET', `/servers/${id}/bans` as '/servers/id/bans');
    }

    /**
     * Set role permissions
     * @param id ID of the target server
     * @param role_id Role Id, set to 'default' to affect all users
     * @param permissions Permission number, removes permission if unset
     */
    async setPermissions(id: string, role_id: string = 'default', permissions?: { server: number, channel: number }) {
        return await this.client.req('PUT', `/servers/${id}/permissions/${role_id}` as '/servers/id/permissions/id', { permissions });
    }

    /**
     * Create role
     * @param id Server ID
     * @param name Role name
     */
    async createRole(id: string, name: string) {
        return await this.client.req('POST', `/servers/${id}/roles` as '/servers/id/roles', { name });
    }

    /**
     * Edit a role
     * @param id ID of the target server
     * @param role_id Role ID
     * @param data Role editing route data
     */
    async editRole(id: string, role_id: string, data: Route<'PATCH', '/servers/id/roles/id'>["data"]) {
        return await this.client.req('PATCH', `/servers/${id}/roles/${role_id}` as '/servers/id/roles/id', data);
    }

    /**
     * Delete role
     * @param id Server ID
     * @param role_id Role ID
     */
    async deleteRole(id: string, role_id: string) {
        return await this.client.req('DELETE', `/servers/${id}/roles/${role_id}` as '/servers/id/roles/id');
    }
}
