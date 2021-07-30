import type { Member } from 'revolt-api/types/Servers';

import { Client } from '..';
import Collection from './Collection';
import { Route } from '../api/routes';

export default class Members extends Collection<Member> {
    constructor(client: Client) {
        super(client);
    }

    /**
     * Fetch a member
     * @param id Server ID
     * @param user_id User ID
     * @returns The member
     */
    async fetch(id: string, user_id: string): Promise<Member> {
        return await this.client.req('GET', `/servers/${id}/members/${user_id}` as '/servers/id/members/id');
    }

    /**
     * Fetch a server member
     * @param id Server ID
     * @param user_id User ID
     * @returns Server member object
     */
    async fetchMember(id: string, user_id: string) {
        return await this.client.req('GET', `/servers/${id}/members/${user_id}` as '/servers/id/members/id');
    }

    /**
     * Edit a server member
     * @param id Server ID
     * @param user_id User ID
     * @param data Member editing route data
     * @returns Server member object
     */
    async editMember(id: string, user_id: string, data: Route<'PATCH', '/servers/id/members/id'>["data"]) {
        return await this.client.req('PATCH', `/servers/${id}/members/${user_id}` as '/servers/id/members/id', data);
    }

    /**
     * Kick server member
     * @param id Server ID
     * @param user_id User ID
     */
    async kickMember(id: string, user_id: string) {
        return await this.client.req('DELETE', `/servers/${id}/members/${user_id}` as '/servers/id/members/id');
    }

    /**
     * Fetch a server's members.
     * @param id Server ID
     * @returns An array of the server's members and their user objects.
     */
    async fetchMembers(id: string) {
        return await this.client.req('GET', `/servers/${id}/members` as '/servers/id/members');
    }
}
