import { Autumn, Channels, Server, Servers as ServersNS } from '../api/objects';
import { Route } from '../api/routes';
import Collection from './Collection';
import Members from './Members';
import { Client } from '..';

export default class Servers extends Collection<Server> {
    members: Members;

    constructor(client: Client) {
        super(client, 'servers');
        
        this.members = new Members(client);
    }

    /**
     * Fetch a server, but do not make the return value read-only
     * @param id Server ID
     * @returns The server
     */
    async fetchMutable(id: string, data?: Server): Promise<Server> {
        if (this.map[id]) return this.get(id) as Server;
        let res = data ?? await this.client.req('GET', `/servers/${id}` as '/servers/id');

        // Fetch channel information.
        for (let channel of res.channels) {
            // ! FIXME: add route for fetching all channels in future, copy code for fetching group recipients
            await this.client.channels.fetch(channel);
        }

        this.set(res);
        return this.get(id) as Server;
    }

    /**
     * Fetch a server and make the return value read-only
     * @param id Server ID
     * @returns The server in read-only state 
     */
    async fetch(id: string, data?: Server) {
        return await this.fetchMutable(id, data) as Readonly<Server>;
    }

    /**
     * Create a server
     * @param data Server create route data
     * @returns The newly-created server
     */
    async createServer(data: Route<'POST', '/servers/create'>["data"]) {
        let res = await this.client.req('POST', `/servers/create`, data);
        this.set(res);
        return this.get(res._id) as Readonly<ServersNS.Server>;
    }

    /**
     * Create a channel
     * @param id ID of the target server
     * @param data Channel create route data
     * @returns The newly-created channel
     */
    async createChannel(id: string, data: Route<'POST', '/servers/id/channels'>["data"]) {
        let server = this.client.servers.getMutable(id);
        if (!server) throw "Server does not exist!";

        let res = await this.client.req('POST', `/servers/${id}/channels` as '/servers/id/channels', data);
        this.client.channels.set(res);
        
        server.channels = [
            ...server.channels.filter(x => x !== res._id),
            res._id
        ];

        return this.client.channels.get(res._id) as Readonly<Channels.TextChannel | Channels.VoiceChannel>;
    }

    /**
     * Edit a server
     * @param id ID of the target server
     * @param data Server editing route data
     */
    async edit(id: string, data: Route<'PATCH', '/servers/id'>["data"]) {
        let server = this.getThrow(id);
        await this.client.req('PATCH', `/servers/${id}` as '/servers/id', data);
        
        if (data.name) server.name = data.name;
        if (data.description) server.description = data.description;
    }

    /**
     * Delete a guild
     * @param id ID of the target server
     */
    async delete(id: string, avoidRequest?: boolean) {
        if (!avoidRequest)
            await this.client.req('DELETE', `/servers/${id}` as '/servers/id');
        
        for (let channel of this.client.channels.toArray()) {
            if ((channel.channel_type === 'TextChannel' || channel.channel_type === 'VoiceChannel') && channel.server === id) {
                this.client.channels.delete(channel._id, true); 
            }
        }

        this.client.servers.members.findMembers(id)
            .forEach(member => this.client.servers.members.delete(member._id));
        
        super.delete(id);
    }

    /**
     * Ban user
     * @param id Server ID
     * @param user_id User ID
     */
    async banUser(id: string, user_id: string, data: Route<'PUT', '/servers/id/bans/id'>["data"]) {
        await this.client.req('PUT', `/servers/${id}/bans/${user_id}` as '/servers/id/bans/id', data);
    }

    /**
     * Unban user
     * @param id Server ID
     * @param user_id User ID
     */
    async unbanUser(id: string, user_id: string) {
        await this.client.req('DELETE', `/servers/${id}/bans/${user_id}` as '/servers/id/bans/id');
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
     * Delete role
     * @param id Server ID
     * @param role_id Role ID
     */
    async deleteRole(id: string, role_id: string) {
        await this.client.req('DELETE', `/servers/${id}/roles/${role_id}` as '/servers/id/roles/id');
    }

    /**
     * Get the icon URL of a server
     * @param id ID of the target server
     * @param options Optional query parameters to modify object
     * @param allowAnimation Whether to allow links to the original GIFs to be returned
     */
    getIconURL(id: string, options?: Autumn.SizeOptions, allowAnimation?: boolean) {
        let server = this.getMutable(id);
        return this.client.generateFileURL(server?.icon, options, allowAnimation);
    }

    /**
     * Get the banner URL of a server
     * @param id ID of the target server
     * @param options Optional query parameters to modify object
     * @param allowAnimation Whether to allow links to the original GIFs to be returned
     */
    getBannerURL(id: string, options?: Autumn.SizeOptions, allowAnimation?: boolean) {
        let server = this.getMutable(id);
        return this.client.generateFileURL(server?.banner, options, allowAnimation);
    }
}
