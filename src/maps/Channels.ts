import type { Channel, Message, SystemMessage } from 'revolt-api/types/Channels';
import type { Member } from 'revolt-api/types/Servers';
import type { User } from 'revolt-api/types/Users';

import { ulid } from 'ulid';
import { Client } from '..';
import { Route } from '../api/routes';
import Collection from './Collection';

export default class Channels extends Collection<Channel> {
    constructor(client: Client) {
        super(client);
    }

    /**
     * Attempts to parse a system message into a string with a fallback for non-JSON messages
     * @param content Content of the system message
     * @returns The parsed system message
     */
    tryParseSystemMessage(content: string): SystemMessage {
        try {
            return JSON.parse(content);
        } catch (e) {
            return { type: 'text', content }
        }
    }

    /**
     * Fetch a channel
     * @param id Channel ID
     * @returns The channel
     */
    async fetch(id: string) {
        return await this.client.req('GET', `/channels/${id}` as '/channels/id');
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
        return await this.client.req('PATCH', `/channels/${id}` as '/channels/id', data);
    }

    /**
     * Delete a channel
     * @param id ID of the target channel
     */
    async delete(id: string) {
        return await this.client.req('DELETE', `/channels/${id}` as '/channels/id');
    }

    /**
     * Create a group
     * @param data Group create route data
     * @returns The newly-created group
     */
    async createGroup(data: Route<'POST', '/channels/create'>["data"]) {
        return await this.client.req('POST', `/channels/create`, data);
    }

    /**
     * Add a user to a group
     * @param id ID of the target channel
     * @param user_id ID of the target user
     */
    async addMember(id: string, user_id: string) {
        return await this.client.req('PUT', `/channels/${id}/recipients/${user_id}` as '/channels/id/recipients/id');
    }

    /**
     * Remove a user from a group
     * @param id ID of the target channel
     * @param user_id ID of the target user
     */
    async removeMember(id: string, user_id: string) {
        return await this.client.req('DELETE', `/channels/${id}/recipients/${user_id}` as '/channels/id/recipients/id');
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

        return await this.client.req('POST', `/channels/${id}/messages` as '/channels/id/messages', msg);
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
    async fetchMessages(id: string, params?: Omit<Route<'GET', '/channels/id/messages'>["data"], 'include_users'>) {
        return await this.client.request('GET', `/channels/${id}/messages` as '/channels/id/messages', { params }) as Message[];
    }

    /**
     * Fetch multiple messages from a channel including the users that sent them
     * @param id ID of the target channel
     * @param params Message fetching route data
     * @returns Object including messages and users
     */
    async fetchMessagesWithUsers(id: string, params?: Omit<Route<'GET', '/channels/id/messages'>["data"], 'include_users'>) {
        return await this.client.request('GET', `/channels/${id}/messages` as '/channels/id/messages', { params: { ...params, include_users: true } }) as { messages: Message[], users: User[], members?: Member[] };
    }

    /**
     * Search for messages
     * @param id ID of the target channel
     * @param params Message searching route data
     * @returns The messages
     */
    async search(id: string, params: Omit<Route<'POST', '/channels/id/search'>["data"], 'include_users'>) {
        return await this.client.req('POST', `/channels/${id}/search` as '/channels/id/search', params) as Message[];
    }

    /**
     * Search for messages including the users that sent them
     * @param id ID of the target channel
     * @param params Message searching route data
     * @returns The messages
     */
    async searchWithUsers(id: string, params: Omit<Route<'POST', '/channels/id/search'>["data"], 'include_users'>) {
        return await this.client.req('POST', `/channels/${id}/search` as '/channels/id/search', { ...params, include_users: true }) as { messages: Message[], users: User[], members?: Member[] };;
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
        return await this.client.req('PATCH', `/channels/${id}/messages/${message_id}` as '/channels/id/messages/id', data);
    }

    /**
     * Delete a message
     * @param id ID of the target channel
     * @param message_id ID of the target message
     */
    async deleteMessage(id: string, message_id: string) {
        return await this.client.req('DELETE', `/channels/${id}/messages/${message_id}` as '/channels/id/messages/id');
    }

    /**
     * Create an invite to the channel
     * @returns Newly created invite code
     */
    async createInvite(id: string) {
        let res = await this.client.req('POST', `/channels/${id}/invites` as '/channels/id/invites');
        return res.code;
    }

    /**
     * Join a call in a channel
     * @param id ID of the target channel
     * @returns Join call response data
     */
    async joinCall(id: string) {
        return await this.client.req('POST', `/channels/${id}/join_call` as '/channels/id/join_call');
    }

    /**
     * Mark a channel as read
     * @param id ID of the target channel
     * @param message_id ID of the last read message
     * @returns Join call response data
     */
    async markAsRead(id: string, message_id: string) {
        return await this.client.req('POST', `/channels/${id}/ack/${message_id}` as '/channels/id/ack/id');
    }

    /**
     * Set role permissions
     * @param id ID of the target channel
     * @param role_id Role Id, set to 'default' to affect all users
     * @param permissions Permission number, removes permission if unset
     */
    async setPermissions(id: string, role_id: string = 'default', permissions?: number) {
        return await this.client.req('PUT', `/channels/${id}/permissions/${role_id}` as '/channels/id/permissions/id', { permissions });
    }
}
