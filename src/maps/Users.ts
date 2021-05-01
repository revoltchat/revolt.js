import Collection from './Collection';
import { User } from '../api/objects';
import { Client } from '..';
import { Route } from '../api/routes';

export default class Users extends Collection<User> {
    constructor(client: Client) {
        super(client, 'users');
    }

    /**
     * Fetch a user, but do not make the return value read-only
     * @param id User ID
     * @returns The user
     */
    async fetchMutable(id: string) {
        if (this.map[id]) return this.get(id) as User;
        let res = await this.client.req('GET', `/users/${id}` as '/users/id');
        this.set(res);
        return this.get(id) as User;
    }

    /**
     * Fetch a user and make the return value read-only
     * @param id User ID
     * @returns The user in read-only state 
     */
    async fetch(id: string) {
        return await this.fetchMutable(id) as Readonly<User>;
    }

    /**
     * Open a DM with a user
     * @param id Target user ID
     * @returns The DM channel
     */
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
            channel = await this.client.req('GET', `/users/${id}/dm` as '/users/id/dm');
            this.client.channels.set(channel);
        }
        
        return this.client.channels.get(channel._id);
    }

    /**
     * Send a friend request to a user
     * @param username Username of the target user
     */
    async addFriend(username: string) {
        await this.client.req('PUT', `/users/${username}/friend` as '/users/id/friend');
        // ! FIXME
        // ! WE NEED TO GET THE ID HERE SOMEHOW
        // ! IDEALLY WE WANT TO CHANGE THE ONES BELOW
        // ! TO USE USERNAME AS WELL
    }

    /**
     * Remove a user from the friend list
     * @param id ID of the target user
     */
    async removeFriend(id: string) {
        await this.client.req('DELETE', `/users/${id}/friend` as '/users/id/friend');
    }

    /**
     * Block a user
     * @param id ID of the target user
     */
    async blockUser(id: string) {
        await this.client.req('PUT', `/users/${id}/block` as '/users/id/block');
    }

    /**
     * Unblock a user
     * @param id ID of the target user
     */
    async unblockUser(id: string) {
        await this.client.req('DELETE', `/users/${id}/block` as '/users/id/block');
    }

    /**
     * Fetch the profile of a user
     * @param id ID of the target user
     * @returns The profile of the user
     */
    async fetchProfile(id: string) {
        return await this.client.req('GET', `/users/${id}/profile` as '/users/id/profile');
    }

    /**
     * Fetch the mutual connections of the current user and a target user
     * @param id ID of the target user
     * @returns The mutual connections of the current user and a target user
     */
    async fetchMutual(id: string) {
        return await this.client.req('GET', `/users/${id}/mutual` as '/users/id/mutual');
    }

    /**
     * Edit the current user
     * @param data User edit data object
     */
    async editUser(data: Route<'PATCH', '/users/id'>["data"]) {
        await this.client.req('PATCH', '/users/id', data);
    }

    /**
     * Change the username of the current user
     * @param username New username
     * @param password Current password
     */
    async changeUsername(username: string, password: string) {
        await this.client.req('PATCH', '/users/id/username', { username, password });
    }

    /**
     * Get the avatar URL of a user
     * @param id ID of the target user
     */
    getAvatarURL(id: string) {
        let attachment_id = this.getMutable(id)?.avatar?._id;
        if (attachment_id) {
            return `${this.client.configuration?.features.autumn.url}/avatars/${attachment_id}`;
        } else {
            return this.getDefaultAvatarURL(id);
        }
    }

    /**
     * Get the default avatar URL of a user
     * @param id ID of the target user
     */
    getDefaultAvatarURL(id: string) {
        return `${this.client.apiURL}/users/${id}/default_avatar`;
    }
}
