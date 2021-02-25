import Collection from './Collection';
import { User } from '../api/objects';
import { Client } from '..';

export default class Users extends Collection<User> {
    constructor(client: Client) {
        super(client, 'users');

        this.set({
            _id: '00000000000000000000000000',
            username: 'revolt'
        });
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
        let channel = await this.client.req<'GET', '/users/:id/dm'>('GET', `/users/${id}/dm` as any);
        this.client.channels.create(channel);
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

    getAvatarURL(id: string) {
        return `${this.client.apiURL}/users/${id}/avatar`;
    }

    getDefaultAvatarURL(id: string) {
        return `${this.client.apiURL}/users/${id}/default_avatar`;
    }
}
