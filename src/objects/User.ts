import { Client, Channel } from '..';
import { Channels } from '../api/channels';
import { hasChanged } from '../util/object';
import { Users, Relationships, Relationship } from '../api/users';

export default class User {
    _data: Users.User;
    client: Client;
    id: string;
    username: string;

    relationship: Relationship;
    online: boolean;

    _relations?: Relationships;

    constructor(client: Client, data: Users.User) {
        this._data = data;
        this.client = client;
        this.id = data._id;
        this.patch(data);
    }

    patch(data: Partial<Users.User>, emitPatch?: boolean) {
        let changedFields = hasChanged(this._data, data, !emitPatch);

        this.username = data.username ?? this.username;
        this.relationship = (data.relationship || Relationship.None) ?? this.relationship;
        this.online = (data.online ?? false) ?? this.online;
        this._relations = (data.relations) ?? this._relations;
        Object.assign(this._data, data);

        if (changedFields.length > 0) {
            this.client.emit('mutation/user', this, data);

            if (changedFields.includes('relationship')) {
                this.client.emit('user/relationship_changed', this);
            }

            if (changedFields.includes('online')) {
                this.client.emit('user/status_changed', this);
            }
        }
    }

    static async fetch(client: Client, id: string, data?: Users.User): Promise<User> {
        let existing;
        if (existing = client.users.get(id)) {
            if (data) existing.patch(data, true);
            return existing;
        }

        let user = new User(client, data ?? (await client.Axios.get(`/users/${id}`)).data);
        client.users.set(id, user);
        client.emit('create/user', user);
        
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

        if (this.relationship !== relationship) {
            this.patch({ relationship }, true);
        }

        return relationship;
    }

    async addFriend() {
        let res = await this.client.Axios.put(`/users/${this.username}/friend`);
        this.patch({ relationship: res.data.status }, true);
    }

    async removeFriend() {
        let res = await this.client.Axios.delete(`/users/${this.id}/friend`);
        this.patch({ relationship: res.data.status }, true);
    }

    async block() {
        let res = await this.client.Axios.put(`/users/${this.id}/block`);
        this.patch({ relationship: res.data.status }, true);
    }

    async unblock() {
        let res = await this.client.Axios.delete(`/users/${this.id}/block`);
        this.patch({ relationship: res.data.status }, true);
    }

    get avatarURL(): string {
        return `${this.client.options.apiURL}/users/${this.id}/avatar`;
    }

    async delete() {
        this.client.users.delete(this.id);
        this.client.emit('delete/user', this.id);
    }
}
