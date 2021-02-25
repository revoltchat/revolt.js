import { Channel, Channels as ChannelsNS } from '../api/objects';
import { Route } from '../api/routes';
import Collection from './Collection';
import { Client } from '..';

export default class Channels extends Collection<Channel> {
    constructor(client: Client) {
        super(client, 'channels');
    }

    async fetchMutable(id: string) {
        if (this.map[id]) return this.get(id) as Channel;
        let res = await this.client.req<'GET', '/channels/:id'>('GET', `/channels/${id}` as any);
        this.set(res);
        return this.get(id) as Channel;
    }

    async fetch(id: string) {
        return await this.fetchMutable(id) as Readonly<Channel>;
    }

    async delete(id: string) {
        await this.client.req<'DELETE', '/channels/:id'>('DELETE', `/channels/${id}` as any);
        this.delete(id);
    }

    async createGroup(data: Route<'POST', '/channels/create'>["data"]) {
        let res = await this.client.req('POST', `/channels/create`, data);
        this.set(res);
        return this.get(res._id) as Readonly<ChannelsNS.GroupChannel>;
    }

    async addMember(id: string, user_id: string) {
        let channel = this.getThrow(id);
        if (channel.channel_type !== 'Group') throw "Channel is not group channel.";
        await this.client.req<'PUT', '/channels/:id/recipients/:id'>('PUT', `/channels/${id}/recipients/${user_id}` as any);
        channel.recipients = [
            ...channel.recipients,
            user_id
        ];
    }

    async removeMember(id: string, user_id: string) {
        let channel = this.getThrow(id);
        if (channel.channel_type !== 'Group') throw "Channel is not group channel.";
        await this.client.req<'DELETE', '/channels/:id/recipients/:id'>('DELETE', `/channels/${id}/recipients/${user_id}` as any);
        channel.recipients = channel.recipients
            .filter(user => user !== user_id);
    }
}
