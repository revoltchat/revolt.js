import { Client, Message, User } from '..';
import { Channels } from '../api/channels';
import { hasChanged } from '../util/object';

import { ulid } from 'ulid';

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

        let data = raw ?? (await client.Axios.get(`/channels/${id}`)).data;
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

        let message = new Message(this.client, this, data ?? (await this.client.Axios.get(`/channels/${this.id}/messages/${id}`)).data);
        await message.$sync();
        this.messages.set(id, message);
        this.client.messages.set(id, message);
        this.client.emit('create/message', message, fetchingMultiple);
        
        return message;
    }

    async fetchMessages(params?: Channels.FetchMessagesRequest): Promise<Message[]> {
        let res = await this.client.Axios.get(`/channels/${this.id}/messages`, { params });
        let messages = [];

        for (let entry of res.data) {
            messages.push(await this.fetchMessage(entry._id, entry, true));
        }

        return messages;
    }

    async sendMessage(content: string, nonce: string = ulid()) {
        let res = await this.client.Axios.post(`/channels/${this.id}/messages`, { content, nonce });
        let fire = !this.client.messages.has(res.data.id);
        let message = await this.fetchMessage(res.data.id, res.data);
        fire && this.client.emit('message', message);
        return message;
    }

    async delete(preventRequest?: boolean) {
        if (!preventRequest)
            await this.client.Axios.delete(`/channels/${this.id}`);
        
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

        await this.client.Axios.put(`/channels/${this.id}/recipients/${user.id}`);
        await this.$addMember(user);
    }

    async removeMember(user: User | string) {
        if (typeof user !== 'string') {
            user = user.id;
        }

        await this.client.Axios.delete(`/channels/${this.id}/recipients/${user}`);
        await this.$removeMember(user);
    }

    getName() {
        return this.name;
    }

    get iconURL(): string {
        return `https://dl.insrt.uk/projects/revolt/group.png`;
    }
}
