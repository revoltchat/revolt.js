import { Client } from '..';
import { Channels } from '../api/channels';
import { Users, Relationships, Relationship } from '../api/users';
import Channel from './Channel';

export default class User {
    client: Client;
    id: string;
    username: string;
    relationship: Relationship;

    _relations?: Relationships;

    constructor(client: Client, data: Users.User) {
        this.client = client;
        this.id = data._id;
        this.username = data.username;

        this._relations = data.relations;
    }

    static async fetch(client: Client, id: string, data?: Users.User): Promise<User> {
        let existing;
        if (existing = client.users.get(id)) {
            return existing;
        }

        let user = new User(client, data ?? (await client.Axios.get(`/users/${id}`)).data);
        client.users.set(id, user);
        
        return user;
    }

    async openDM(): Promise<Channel> {
        let data = (await this.client.Axios.get(`/users/${this.id}/dm`)).data as Channels.Channel;
        return await Channel.fetch(
            this.client,
            data._id,
            data
        );
    }

    async fetchRelationship(): Promise<Relationship> {
        let res = await this.client.Axios.get(`/users/${this.id}/relationship`);
        let relationship = res.data.status;
        this.relationship = relationship;
        return relationship;
    }

    async addFriend() {
        let res = await this.client.Axios.put(`/users/${this.username}/friend`);
        let relationship = res.data.status;
        this.relationship = relationship;
    }

    async removeFriend() {
        let res = await this.client.Axios.delete(`/users/${this.id}/friend`);
        let relationship = res.data.status;
        this.relationship = relationship;
    }

    async block() {
        let res = await this.client.Axios.put(`/users/${this.id}/block`);
        let relationship = res.data.status;
        this.relationship = relationship;
    }

    async unblock() {
        let res = await this.client.Axios.delete(`/users/${this.id}/block`);
        let relationship = res.data.status;
        this.relationship = relationship;
    }

    get avatarURL(): string {
        return `${this.client.options.apiURL}/users/${this.id}/avatar`;
    }
}
