import { Channel, Channels as ChannelsNS } from '../api/objects';
import { Route } from '../api/routes';
import Collection from './Collection';
import { Client } from '..';
import { ulid } from 'ulid';

export default class Channels extends Collection<Channel> {
    constructor(client: Client) {
        super(client, 'channels');
    }

    /**
     * Get the recipient of a direct message channel.
     * @param id ID of the target channel
     * @returns 
     * @throws An error if the channel is not of type `DirectMessage`
     */
    getRecipient(id: string) {
        let channel = this.getThrow(id);
        if (channel.channel_type !== 'DirectMessage') throw "Not a DirectMessage.";
        return channel.recipients.find(user => user !== this.client.user?._id) as string;
    }

    /**
     * Attempts to parse a system message into a string with a fallback for non-JSON messages
     * @param content Content of the system message
     * @returns The parsed system message
     */
    tryParseSystemMessage(content: string): ChannelsNS.SystemMessage {
        try {
            return JSON.parse(content);
        } catch (e) {
            return { type: 'text', content }
        }
    }

    /**
     * Fetch a channel, but do not make the return value read-only
     * @param id Channel ID
     * @returns The channel
     */
    async fetchMutable(id: string) {
        if (this.map[id]) return this.get(id) as Channel;
        let res = await this.client.req('GET', `/channels/${id}` as '/channels/id');

        // Fetch user information if this is the first time we are seeing this object.
        // We shouldn't need to fetch for anything apart from groups.
        if (res.channel_type === 'Group') {
            let hasUnknowns = res.recipients.find(id => typeof this.client.users.get(id) === 'undefined');
            if (hasUnknowns) {
                let members = await this.fetchMembers(id);
                for (let member of members) {
                    this.client.users.set(member);
                }
            }
        }

        this.set(res);
        return this.get(id) as Channel;
    }

    /**
     * Fetch a channel and make the return value read-only
     * @param id Channel ID
     * @returns The channel in read-only state 
     */
    async fetch(id: string) {
        return await this.fetchMutable(id) as Readonly<Channel>;
    }

    /**
     * Fetch a channel's members.
     * @param id Channel ID
     * @returns An array of the channel's members.
     */
    async fetchMembers(id: string) {
        return await this.client.req('GET', `/channels/${id}/members` as '/channels/id/members');
    }

    /**
     * Edit a channel
     * @param id ID of the target channel
     * @param data Channel editing route data
     */
    async edit(id: string, data: Route<'PATCH', '/channels/id'>["data"]) {
        let channel = this.getThrow(id);
        if (channel.channel_type !== 'Group') throw "Channel is not group channel.";
        await this.client.req('PATCH', `/channels/${id}` as '/channels/id', data);
        
        if (data.name) channel.name = data.name;
        if (data.description) channel.description = data.description;
    }

    /**
     * Delete a channel
     * @param id ID of the target channel
     * @param avoidRequest Whether to disable the API request, essentially making the change client-side only
     */
    async delete(id: string, avoidRequest?: boolean) {
        let channel = this.getMutable(id);
        if (channel?.channel_type === 'SavedMessages') throw "Cannot delete Saved Messages.";
        if (!avoidRequest)
            await this.client.req('DELETE', `/channels/${id}` as '/channels/id');
        
        if (channel?.channel_type === 'DirectMessage') {
            channel.active = false;
        } else {
            super.delete(id);
        }
    }

    /**
     * Create a group
     * @param data Group create route data
     * @returns The newly-created group
     */
    async createGroup(data: Route<'POST', '/channels/create'>["data"]) {
        let res = await this.client.req('POST', `/channels/create`, data);
        this.set(res);
        return this.get(res._id) as Readonly<ChannelsNS.GroupChannel>;
    }

    /**
     * Add a user to a channel
     * @param id ID of the target channel
     * @param user_id ID of the target user
     */
    async addMember(id: string, user_id: string) {
        let channel = this.getThrow(id);
        if (channel.channel_type !== 'Group') throw "Channel is not group channel.";
        await this.client.req('PUT', `/channels/${id}/recipients/${user_id}` as '/channels/id/recipients/id');
        channel.recipients = [
            ...channel.recipients.filter(user => user !== user_id),
            user_id
        ];
    }

    /**
     * Remove a user from a channel
     * @param id ID of the target channel
     * @param user_id ID of the target user
     */
    async removeMember(id: string, user_id: string) {
        let channel = this.getThrow(id);
        if (channel.channel_type !== 'Group') throw "Channel is not group channel.";
        await this.client.req('DELETE', `/channels/${id}/recipients/${user_id}` as '/channels/id/recipients/id');
        channel.recipients = channel.recipients
            .filter(user => user !== user_id);
    }

    /**
     * Send a message
     * @param id ID of the target channel
     * @param data Either the message as a string or message sending route data
     * @returns The message
     */
    async sendMessage(id: string, data: string | (Omit<Route<'POST', '/channels/id/messages'>["data"], 'nonce'> & { nonce?: string })) {
        let msg: Route<'POST', '/channels/id/messages'>["data"] = {
            nonce: ulid(),
            ...(typeof data === 'string' ? { content: data } : data)
        };

        this.getThrow(id);
        let message = await this.client.req('POST', `/channels/${id}/messages` as '/channels/id/messages', msg);
        if (!this.client.messages.includes(id)) {
            this.client.messages.push(id);
            this.client.emit('message', message);
        }
        return message;
    }

    /**
     * Fetch a message by its ID
     * @param id ID of the target channel
     * @param message_id ID of the target message
     * @returns The message
     */
    async fetchMessage(id: string, message_id: string) {
        return await this.client.req('GET', `/channels/${id}/messages/${message_id}` as '/channels/id/messages/id');
    }

    /**
     * Fetch multiple messages from a channel
     * @param id ID of the target channel
     * @param params Message fetching route data
     * @returns The messages
     */
    async fetchMessages(id: string, params: Route<'GET', '/channels/id/messages'>["data"]) {
        return await this.client.request('GET', `/channels/${id}/messages` as '/channels/id/messages', { params });
    }

    /**
     * Fetch stale messages
     * @param id ID of the target channel
     * @param ids IDs of the target messages
     * @returns The stale messages
     */
    async fetchStale(id: string, ids: string[]) {
        return await this.client.req('POST', `/channels/${id}/messages/stale` as '/channels/id/messages/stale', { ids });
    }

    /**
     * Edit a message
     * @param id ID of the target channel
     * @param message_id ID of the target message
     * @param data Message edit route data
     */
    async editMessage(id: string, message_id: string, data: Route<'PATCH', '/channels/id/messages/id'>["data"]) {
        await this.client.req('PATCH', `/channels/${id}/messages/${message_id}` as '/channels/id/messages/id', data);
        this.client.emit('message/edit', message_id, data);
    }

    /**
     * Delete a message
     * @param id ID of the target channel
     * @param message_id ID of the target message
     */
    async deleteMessage(id: string, message_id: string) {
        await this.client.req('DELETE', `/channels/${id}/messages/${message_id}` as '/channels/id/messages/id');
        this.client.emit('message/delete', message_id);
    }

    /**
     * Join a call in a channeö
     * @param id ID of the target channel
     * @returns Join call response data
     */
    async joinCall(id: string) {
        return await this.client.req('POST', `/channels/${id}/join_call` as '/channels/id/join_call');
    }

    /**
     * Get the icon URL of a channel
     * @param id ID of the target channel
     * @param size Size to resize image to
     */
    getIconURL(id: string, size?: number, allowAnimation?: boolean) {
        let url = this.client.configuration?.features.autumn.url;
        let channel = this.getMutable(id);
        if (url && channel?.channel_type === 'Group') {
            let attachment = channel.icon;
            if (attachment) {
                let baseURL = `${url}/icons/${attachment._id}`;
                if (allowAnimation && attachment.content_type === 'image/gif') {
                    return baseURL;
                } else {
                    return baseURL + (size ? `?size=${size}` : '');
                }
            }
        }
    }
}
