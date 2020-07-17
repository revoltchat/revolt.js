import { Client } from '../Client';

import { Users, Relationship } from '../api/users';
import { Channel } from './Channel';

export class User {
    client: Client;
    id: string;
    username: string;

    // only fetched if self
    email?: string;
    verified?: boolean;

    // only fetched if other
    relationship: Relationship;

	constructor(client: Client, data: Users.UserResponse) {
        this.client = client;
        this.id = data.id;
        this.username = data.username;

        this.email = data.email;
        this.verified = data.verified;

        this.relationship = data.relationship ?? Relationship.SELF;
    }
    
    static async fetch(client: Client, id: string): Promise<User> {
        if (id === client.userId)
            id = '@me';

        let existing = client.users.get(id);
        if (existing) {
            return existing;
        }

        let data = await client.$req<any, Users.UserResponse>('GET', `/users/${id}`);
        let user = new User(client, data);
        client.users.set(id, user);
        return user;
    }

    async openDM(): Promise<Channel> {
        let res = await this.client.$req<any, Users.OpenDMResponse>('GET', `/users/${this.id}/dm`);
        return await Channel.fetch(this.client, res.id);
    }

    async fetchRelationship(): Promise<Relationship> {
        let res = await this.client.$req<any, Users.FriendResponse>('GET', `/users/${this.id}/friend`);
        this.relationship = res.status;
        return res.status;
    }

    async addFriend() {
        let res = await this.client.$req<any, Users.AddFriendResponse>('PUT', `/users/${this.id}/friend`);
        this.relationship = res.status;
    }

    async removeFriend() {
        let res = await this.client.$req<any, Users.RemoveFriendResponse>('DELETE', `/users/${this.id}/friend`);
        this.relationship = res.status;
    }

    async block() {
        let res = await this.client.$req<any, Users.BlockUserResponse>('PUT', `/users/${this.id}/block`);
        this.relationship = res.status;
    }

    async unblock() {
        let res = await this.client.$req<any, Users.UnblockUserResponse>('DELETE', `/users/${this.id}/block`);
        this.relationship = res.status;
    }

    get avatarURL() {
        return `https://dl.insrt.uk/projects/revolt/user.png`;
    }
}
