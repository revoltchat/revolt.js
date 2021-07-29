import { Servers } from '../api/objects';
import Collection from './Collection';
import { Client } from '..';
import { Route } from '../api/routes';

export type MemberFlatKey = Omit<Servers.Member, '_id'> & { _id: string };

export function flatKeyToObject(key: string) {
    return {
        server: key.substr(0, 26),
        user: key.substr(26)
    }
}

export function objectToFlatKey(obj: { server: string, user: string }) {
    return `${obj.server}${obj.user}`;
}

export function flattenMember(obj: Servers.Member): MemberFlatKey {
    return {
        ...obj,
        _id: objectToFlatKey(obj._id)
    }
}

export function unflattenMember(obj: MemberFlatKey): Servers.Member {
    return {
        ...obj,
        _id: flatKeyToObject(obj._id)
    }
}

export default class Members extends Collection<MemberFlatKey> {
    constructor(client: Client) {
        super(client, 'members');
    }

    findMembers(server_id: string): MemberFlatKey[] {
        return this.keys()
            .filter(key => this.map[key]._id.substr(0, 26) === server_id)
            .map(k => this.map[k])
    }

    /**
     * Fetch a member, but do not make the return value read-only
     * @param id Server ID
     * @param user_id User ID
     * @returns The member
     */
    async fetchMutable(id: string, user_id: string): Promise<MemberFlatKey> {
        if (this.map[id]) return this.get(id) as MemberFlatKey;
        let res = await this.client.req('GET', `/servers/${id}/members/${user_id}` as '/servers/id/members/id');

        this.set(flattenMember(res));
        return this.get(id) as MemberFlatKey;
    }

    /**
     * Fetch a server and make the return value read-only
     * @param id Server ID
     * @param user_id User ID
     * @returns The server in read-only state 
     */
    async fetch(id: string, user_id: string) {
        return await this.fetchMutable(id, user_id) as Readonly<MemberFlatKey>;
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
        await this.client.req('PATCH', `/servers/${id}/members/${user_id}` as '/servers/id/members/id', data);
    }

    /**
     * Kick server member
     * @param id Server ID
     * @param user_id User ID
     */
    async kickMember(id: string, user_id: string) {
        await this.client.req('DELETE', `/servers/${id}/members/${user_id}` as '/servers/id/members/id');
    }

    /**
     * Fetch a server's members.
     * @param id Server ID
     * @returns An array of the server's members and their user objects.
     */
    async fetchMembers(id: string) {
        let res = await this.client.req('GET', `/servers/${id}/members` as '/servers/id/members');

        for (let user of res.users) {
            this.client.users.set(user);
        }

        for (let member of res.members) {
            this.set(flattenMember(member));
        }

        return res;
    }
}
