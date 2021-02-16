import { hasChanged } from '../util/object';
import { Client, Message, User } from '..';
import { Channels } from '../api/objects';

import { ulid } from 'ulid';
import { Route } from '../api/routes';

export default abstract class Channel {
    _data: Channels.Channel;
    client: Client;
    id: string;
    messages: Map<string, Message>;

    constructor(client: Client, data: Channels.Channel) {
        this._data = data;
        this.client = client;
        this.id = data._id;
        this.messages = new Map();

        this.patch(data);
    }

    abstract patch(data: Partial<Channels.Channel>, emitPatch?: boolean): void;
    abstract $sync(): Promise<void>;
    abstract getName(): string;

    static async fetch(client: Client, id: string, raw?: Channels.Channel): Promise<Channel> {
        let existing;
        if (existing = client.channels.get(id)) {
            if (raw) {
                existing.patch(raw, true);
                await existing.$sync();
            }

            return existing;
        }

        let data = raw ?? (
            await client.req<'GET', '/channels/:id'>('GET', `/channels/${id}` as any)
        );
        let channel: Channel;
        switch (data.channel_type) {
            case 'SavedMessages': channel = new SavedMessagesChannel(client, data); break;
            case 'DirectMessage': channel = new DirectMessageChannel(client, data); break;
            case 'Group': channel = new GroupChannel(client, data); break;
            default: throw new Error("Unknown channel type.");
        }

        await channel.$sync();
        client.channels.set(id, channel);
        client.emit('create/channel', channel);
        
        return channel;
    }

    async fetchMessage(id: string, data?: Channels.Message, fetchingMultiple?: boolean): Promise<Message> {
        let existing;
        if (existing = this.messages.get(id)) {
            if (data) {
                existing.patch(data, true);
                await existing.$sync();
            }

            return existing;
        }

        let message = new Message(this.client, this,
            data ?? (await this.client.req<'GET', '/channels/:id/messages/:id'>('GET', `/channels/${this.id}/messages/${id}` as any))
        );
        await message.$sync();
        this.messages.set(id, message);
        this.client.messages.set(id, message);
        this.client.emit('create/message', message, fetchingMultiple);
        
        return message;
    }

    async fetchMessages(params?: Route<'GET', '/channels/:id/messages'>["data"]): Promise<Message[]> {
        let data = await this.client.request<'GET', '/channels/:id/messages'>('GET', `/channels/${this.id}/messages` as any, { params });
        let messages = [];

        for (let entry of data) {
            messages.push(await this.fetchMessage(entry._id, entry, true));
        }

        return messages;
    }

    async sendMessage(msg: Omit<Route<'POST', '/channels/:id/messages'>["data"], 'nonce'> & { nonce?: string }) {
        let data = await this.client.req<'POST', '/channels/:id/messages'>(
            'POST',
            `/channels/${this.id}/messages` as any,
            {
                nonce: ulid(),
                ...msg
            }
        );

        let fire = !this.client.messages.has(data._id);
        let message = await this.fetchMessage(data._id, data);
        fire && this.client.emit('message', message);
        return message;
    }

    async delete(preventRequest?: boolean) {
        if (!preventRequest)
            await this.client.req<'DELETE', '/channels/:id'>('DELETE', `/channels/${this.id}` as any);
        
        for (let id of this.messages.keys()) {
            this.client.messages.delete(id);
        }
        
        this.client.channels.delete(this.id);
        this.client.emit('delete/channel', this.id);
    }
}

export abstract class TextChannel extends Channel {
    abstract $sync(): Promise<void>;
}

export class SavedMessagesChannel extends TextChannel {
    _user: string;

    constructor(client: Client, data: Channels.Channel) {
        super(client, data);
    }

    patch(data: Channels.SavedMessagesChannel) {
        // ? info: there are no partial patches that can occur here
        this._user = data.user;
    }

    async $sync() {}

    getName() {
        return 'Saved Messages';
    }
}

export class DirectMessageChannel extends TextChannel {
    active: boolean;
    recipient: User;

    _recipients: string[];
    _lastMessage: Channels.LastMessage;

    constructor(client: Client, data: Channels.Channel) {
        super(client, data);
    }

    patch(data: Partial<Channels.DirectMessageChannel>, emitPatch?: boolean) {
        let changedFields = hasChanged(this._data, data, !emitPatch);

        this.active = data.active ?? this.active;
        this._recipients = data.recipients ?? this._recipients;
        this._lastMessage = data.last_message ?? this._lastMessage;
        Object.assign(this._data, data);

        if (changedFields.length > 0) {
            this.client.emit('mutation/channel', this, data);
        }
    }

    async $sync() {
        let user = this._recipients.find(user => user !== this.client.user?.id);
        if (typeof user === 'undefined') throw "No recipient.";
        this.recipient = await User.fetch(this.client, user);
    }

    getName() {
        return '@' + this.recipient.username;
    }
}

export class GroupChannel extends TextChannel {
    name: string;
    description: string;
    recipients: Set<User>;
    owner: User;
    
    _owner: string;
    _recipients: string[];
    _lastMessage: Channels.LastMessage;

    constructor(client: Client, data: Channels.Channel) {
        super(client, data);
        this.recipients = new Set();
    }

    patch(data: Partial<Channels.GroupChannel>, emitPatch?: boolean) {
        let changedFields = hasChanged(this._data, data, !emitPatch);

        this.name = data.name ?? this.name;
        this.description = data.description ?? this.description;
        this._owner = data.owner ?? this._owner;
        this._recipients = data.recipients ?? this._recipients;
        this._lastMessage = data.last_message ?? this._lastMessage;
        Object.assign(this._data, data);

        if (changedFields.length > 0) {
            this.client.emit('mutation/channel', this, data);
        }
    }

    async $addMember(user: User) {
        if (this._recipients.indexOf(user.id) === -1) {
            this.patch({ recipients: [ ...this._recipients, user.id ] }, true);
            await this.$sync();
            this.client.emit('channel/group/join', user);
        }
    }

    async $removeMember(user: string) {
        if (this._recipients.indexOf(user) !== -1) {
            this.patch({ recipients: this._recipients.filter(x => x !== user) }, true);
            await this.$sync();
            this.client.emit('channel/group/leave', user, this.client.users.get(user));
        }
    }

    async $sync() {
        this.owner = await User.fetch(this.client, this._owner);

        for (let recipient of this._recipients) {
            this.recipients.add(await User.fetch(this.client, recipient));
        }
    }

    async addMember(user: User | string) {
        if (typeof user === 'string') {
            user = await User.fetch(this.client, user);
        }

        await this.client.req<'PUT', '/channels/:id/recipients/:id'>('PUT', `/channels/${this.id}/recipients/${user.id}` as any);
        await this.$addMember(user);
    }

    async removeMember(user: User | string) {
        if (typeof user !== 'string') {
            user = user.id;
        }

        await this.client.req<'DELETE', '/channels/:id/recipients/:id'>('DELETE', `/channels/${this.id}/recipients/${user}` as any);
        await this.$removeMember(user);
    }

    getName() {
        return this.name;
    }

    get iconURL(): string {
        return `https://dl.insrt.uk/projects/revolt/group.png`;
    }
}
