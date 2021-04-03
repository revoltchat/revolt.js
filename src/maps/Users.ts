import Collection from './Collection';
import { User } from '../api/objects';
import { Client } from '..';
import { Route } from '../api/routes';

export default class Users extends Collection<User> {
    constructor(client: Client) {
        super(client, 'users');
    }

    async fetchMutable(id: string) {
        if (this.map[id]) return this.get(id) as User;
        let res = await this.client.req<'GET', '/users/:id'>('GET', `/users/${id}` as any);
        this.set(res);
        return this.get(id) as User;
    }

    async fetch(id: string) {
        return await this.fetchMutable(id) as Readonly<User>;
    }

    async openDM(id: string) {
        this.getThrow(id);

        let channel;
        if (id === this.client.user?._id) {
            channel = this.client
                .channels
                .toArray()
                .find(channel => channel.channel_type === 'SavedMessages');
        } else {
            channel = this.client
                .channels
                .toArray()
                .find(channel =>
                    (channel.channel_type === 'DirectMessage'
                    && channel.recipients.find(user => user === id))
                );
        }
        
        if (typeof channel === 'undefined') {
            channel = await this.client.req<'GET', '/users/:id/dm'>('GET', `/users/${id}/dm` as any);
            this.client.channels.set(channel);
        }
        
        return this.client.channels.get(channel._id);
    }

    async addFriend(username: string) {
        await this.client.req<'PUT', '/users/:id/friend'>('PUT', `/users/${username}/friend` as any);
        // ! WE NEED TO GET THE ID HERE SOMEHOW
        // ! IDEALLY WE WANT TO CHANGE THE ONES BELOW
        // ! TO USE USERNAME AS WELL
    }

    async removeFriend(id: string) {
        await this.client.req<'DELETE', '/users/:id/friend'>('DELETE', `/users/${id}/friend` as any);
    }

    async blockUser(id: string) {
        await this.client.req<'PUT', '/users/:id/block'>('PUT', `/users/${id}/block` as any);
    }

    async unblockUser(id: string) {
        await this.client.req<'DELETE', '/users/:id/block'>('DELETE', `/users/${id}/block` as any);
    }

    async fetchProfile(id: string) {
        return await this.client.req<'GET', '/users/:id/profile'>('GET', `/users/${id}/profile` as any);
    }

    async fetchMutual(id: string) {
        return await this.client.req<'GET', '/users/:id/mutual'>('GET', `/users/${id}/mutual` as any);
    }

    async editUser(data: Route<'PATCH', '/users/:id'>["data"]) {
        await this.client.req('PATCH', '/users/:id', data);
    }

    async changeUsername(username: string, password: string) {
        await this.client.req('PATCH', '/users/:id/username', { username, password });
    }

    getAvatarURL(id: string) {
        return `${this.client.apiURL}/users/${id}/avatar`;
    }

    getDefaultAvatarURL(id: string) {
        return `${this.client.apiURL}/users/${id}/default_avatar`;
    }
}
