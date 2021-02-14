import { Client, Channel } from '..';
import { Users } from '../api/objects';
import { hasChanged } from '../util/object';

export default class User {
    _data: Users.User;
    client: Client;
    id: string;
    username: string;

    relationship: Users.Relationship;
    online: boolean;

    _relations?: Users.Relationships;

    constructor(client: Client, data: Users.User) {
        this._data = data;
        this.client = client;
        this.id = data._id;
        this.patch(data);
    }

    patch(data: Partial<Users.User>, emitPatch?: boolean) {
        let changedFields = hasChanged(this._data, data, !emitPatch);

        this.username = data.username ?? this.username;
        this.relationship = data.relationship ?? this.relationship ?? Users.Relationship.None;
        this.online = data.online ?? this.online ?? false;
        this._relations = data.relations ?? this._relations;
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

        let user = new User(client,
            data ?? (await client.req<'GET', '/users/:id'>('GET', `/users/${id}` as any))
        );
        client.users.set(id, user);
        client.emit('create/user', user);
        
        return user;
    }

    async openDM(): Promise<Channel> {
        let data = await this.client.req<'GET', '/users/:id/dm'>('GET', `/users/${this.id}/dm` as any);
        return await Channel.fetch(
            this.client,
            data._id,
            data
        );
    }

    async fetchRelationship(): Promise<Users.Relationship> {
        let data = await this.client.req<'GET', '/users/:id/relationship'>('GET', `/users/${this.id}/relationship` as any);
        let relationship = data.status;

        if (this.relationship !== relationship) {
            this.patch({ relationship }, true);
        }

        return relationship;
    }

    async addFriend() {
        let data = await this.client.req<'PUT', '/users/:id/friend'>('PUT', `/users/${this.username}/friend` as any);
        this.patch({ relationship: data.status }, true);
    }

    async removeFriend() {
        let data = await this.client.req<'DELETE', '/users/:id/friend'>('DELETE', `/users/${this.id}/friend` as any);
        this.patch({ relationship: data.status }, true);
    }

    async block() {
        let data = await this.client.req<'PUT', '/users/:id/block'>('PUT', `/users/${this.id}/block` as any);
        this.patch({ relationship: data.status }, true);
    }

    async unblock() {
        let data = await this.client.req<'DELETE', '/users/:id/block'>('DELETE', `/users/${this.id}/block` as any);
        this.patch({ relationship: data.status }, true);
    }

    async delete() {
        this.client.users.delete(this.id);
        this.client.emit('delete/user', this.id);
    }

    get avatarURL(): string {
        return `${this.client.apiURL}/users/${this.id}/avatar`;
    }
}

export class SystemUser extends User {
    constructor(client: Client) {
        super(client, {
            _id: "00000000000000000000000000",
            username: "revolt",
            online: true
        });
    }

    get avatarURL(): string {
        return `${this.client.apiURL}/users/${this.id}/avatar`;
    }
}
