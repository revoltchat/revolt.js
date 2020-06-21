import { Client } from '../Client';

import { RawMessage, Channels } from '../api';
import Channel from './Channel';
import User from './User';

export default class Message {
    client: Client;
    channel: Channel;
    id: string;

    _author: string;

    author: User;
    content: string;
    edited?: Date;
    nonce?: string;

	constructor(client: Client, channel: Channel, data: RawMessage) {
        this.client = client;
        this.channel = channel;
        this.id = this.id;

        this._author = data.author;
        this.content = data.content;
        this.edited = data.edited === null ? undefined : new Date(data.edited);
        this.nonce = data.nonce;
    }

    async $sync() {
        this.author = await this.client.fetchUser(this._author);
    }
    
    static async fetch(client: Client, channel: Channel, id: string, raw: RawMessage): Promise<Message> {
        let existing = channel.messages.get(id);
        if (existing) {
            return existing;
        }

        let data = raw ?? await client.$req<any, Channels.MessageResponse>('GET', `/channels/${channel.id}/messages/${id}`);
        let message = new Message(client, channel, data);
        await message.$sync();
        client.messages.set(message.id, message);
        channel.messages.set(message.id, message);
        return message;
    }

    async edit(content: string) {
        await this.client.$req<Channels.EditMessageRequest, Channels.EditMessageResponse>('PATCH', `/channels/${this.channel.id}/messages/${this.id}`);
        this.content = content;
        this.edited = new Date();
    }

    async delete() {
        await this.client.$req<any, Channels.DeleteMessageResponse>('DELETE', `/channels/${this.channel.id}/messages/${this.id}`);
        this._delete();
    }

    _delete() {
        this.client.messages.delete(this.id);
        this.channel.messages.delete(this.id);
    }
}
