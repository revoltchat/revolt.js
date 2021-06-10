import { Channels, Server, Servers as ServersNS } from '../api/objects';
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
     * @param data Group create route data
     * @returns The newly-created group
     */
    async createServer(data: Route<'POST', '/servers/create'>["data"]) {
        let res = await this.client.req('POST', `/servers/create`, data);
        this.set(res);
        return this.get(res._id) as Readonly<ServersNS.Server>;
    }

    /**
     * Create a channel
     * @param id ID of the target server
     * @param data Group create route data
     * @returns The newly-created group
     */
    async createChannel(id: string, data: Route<'POST', '/servers/id/channels'>["data"]) {
        let res = await this.client.req('POST', `/servers/${id}/channels` as '/servers/id/channels', data);
        this.client.channels.set(res);
        return this.client.channels.get(res._id) as Readonly<Channels.TextChannel>;
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
            if (channel.channel_type === 'TextChannel' && channel.server === id) {
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
     * Fetch a server's invites.
     * @param id Server ID
     * @returns An array of the server's invites.
     */
    async fetchInvites(id: string) {
        return await this.client.req('GET', `/servers/${id}/invites` as '/servers/id/invites');
    }

    /**
     * Fetch a server's bans.
     * @param id Server ID
     * @returns An array of the server's bans.
     */
    async fetchBans(id: string) {
        return await this.client.req('GET', `/servers/${id}/bans` as '/servers/id/bans');
    }

    /**
     * Get the icon URL of a server
     * @param id ID of the target server
     * @param size Size to resize image to
     * @param allowAnimation Whether to allow links to the original GIFs to be returned
     */
    getIconURL(id: string, size?: number, allowAnimation?: boolean) {
        let url = this.client.configuration?.features.autumn.url;
        let server = this.getMutable(id);
        if (server?.icon) {
            let baseURL = `${url}/icons/${server.icon._id}`;
            if (allowAnimation && server.icon.content_type === 'image/gif') {
                return baseURL;
            } else {
                return baseURL + (size ? `?size=${size}` : '');
            }
        }
    }

    /**
     * Get the banner URL of a server
     * @param id ID of the target server
     * @param width Width to resize image to
     * @param allowAnimation Whether to allow links to the original GIFs to be returned
     */
    getBannerURL(id: string, width?: number, allowAnimation?: boolean) {
        let url = this.client.configuration?.features.autumn.url;
        let server = this.getMutable(id);
        if (server?.banner) {
            let baseURL = `${url}/banners/${server.banner._id}`;
            if (allowAnimation && server.banner.content_type === 'image/gif') {
                return baseURL;
            } else {
                return baseURL + (width ? `?width=${width}` : '');
            }
        }
    }
}
