import type { User } from 'revolt-api/types/Users';

import { Client } from '..';
import Collection from './Collection';
import { Route } from '../api/routes';

export default class Users extends Collection<User> {
    constructor(client: Client) {
        super(client);
    }

    /**
     * Fetch a user, but do not make the return value read-only
     * @param id User ID
     * @returns The user
     */
    async fetch(id: string) {
        return await this.client.req('GET', `/users/${id}` as '/users/id');
    }

    /**
     * Open a DM with a user
     * @param id Target user ID
     * @returns The DM channel
     */
    async openDM(id: string) {
        return await this.client.req('GET', `/users/${id}/dm` as '/users/id/dm');
    }

    /**
     * Send a friend request to a user
     * @param username Username of the target user
     */
    async addFriend(username: string) {
        return await this.client.req('PUT', `/users/${username}/friend` as '/users/id/friend');
    }

    /**
     * Remove a user from the friend list
     * @param id ID of the target user
     */
    async removeFriend(id: string) {
        return await this.client.req('DELETE', `/users/${id}/friend` as '/users/id/friend');
    }

    /**
     * Block a user
     * @param id ID of the target user
     */
    async blockUser(id: string) {
        return await this.client.req('PUT', `/users/${id}/block` as '/users/id/block');
    }

    /**
     * Unblock a user
     * @param id ID of the target user
     */
    async unblockUser(id: string) {
        return await this.client.req('DELETE', `/users/${id}/block` as '/users/id/block');
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
        return await this.client.req('PATCH', '/users/id', data);
    }

    /**
     * Change the username of the current user
     * @param username New username
     * @param password Current password
     */
    async changeUsername(username: string, password: string) {
        return await this.client.req('PATCH', '/users/id/username', { username, password });
    }

    /**
     * Get the default avatar URL of a user
     * @param id ID of the target user
     */
    getDefaultAvatarURL(id: string) {
        return `${this.client.apiURL}/users/${id}/default_avatar`;
    }
}
