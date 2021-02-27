import { Channel, Channels as ChannelsNS } from '../api/objects';
import { Route } from '../api/routes';
import Collection from './Collection';
import { Client } from '..';

export default class Channels extends Collection<Channel> {
    constructor(client: Client) {
        super(client, 'channels');
    }

    getRecipient(id: string) {
        let channel = this.getThrow(id);
        if (channel.channel_type !== 'DirectMessage') throw "Not a DirectMessage.";
        return channel.recipients.find(user => user !== this.client.user?._id) as string;
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

    async delete(id: string, avoidRequest?: boolean) {
        let channel = this.getMutable(id);
        if (channel?.channel_type === 'SavedMessages') throw "Cannot delete Saved Messages.";
        if (!avoidRequest)
            await this.client.req<'DELETE', '/channels/:id'>('DELETE', `/channels/${id}` as any);
        
        if (channel?.channel_type === 'DirectMessage') {
            channel.active = false;
        } else {
            super.delete(id);
        }
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
            ...channel.recipients.filter(user => user !== user_id),
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

    async sendMessage(id: string, data: Route<'POST', '/channels/:id/messages'>["data"]) {
        this.getThrow(id);
        let message = await this.client.req<'POST', '/channels/:id/messages'>('POST', `/channels/${id}/messages` as any, data);
        if (!this.client.messages.includes(id)) {
            this.client.messages.push(id);
            this.client.emit('message', message);
        }
        return message;
    }

    async fetchMessage(id: string, message_id: string) {
        return await this.client.req<'GET', '/channels/:id/messages/:id'>('GET', `/channels/${id}/messages/${message_id}` as any);
    }

    async fetchMessages(id: string, params: Route<'GET', '/channels/:id/messages'>["data"]) {
        return await this.client.request<'GET', '/channels/:id/messages'>('GET', `/channels/${id}/messages` as any, { params });
    }

    async fetchStale(id: string, ids: string[]) {
        return await this.client.req<'POST', '/channels/:id/messages/stale'>('POST', `/channels/${id}/messages/stale` as any, { ids });
    }

    async editMessage(id: string, message_id: string, data: Route<'PATCH', '/channels/:id/messages/:id'>["data"]) {
        await this.client.req<'PATCH', '/channels/:id/messages/:id'>('PATCH', `/channels/${id}/messages/${message_id}` as any, data);
        this.client.emit('message/edit', message_id, data);
    }

    async deleteMessage(id: string, message_id: string) {
        await this.client.req<'DELETE', '/channels/:id/messages/:id'>('DELETE', `/channels/${id}/messages/${message_id}` as any);
        this.client.emit('message/delete', message_id);
    }
}
