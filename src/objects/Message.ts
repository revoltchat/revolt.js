import { Channel, Client, User } from '..';
import { hasChanged } from '../util/object';
import { Channels } from '../api/objects';

export default class Message {
    _data: Channels.Message;
    client: Client;
    id: string;

    author: User;
    channel: Channel;
    content: string;
    edited?: Date;

    _author: string;
    _nonce?: string;

    constructor(client: Client, channel: Channel, data: Channels.Message) {
        this._data = data;
        this.client = client;
        this.id = data._id;
        this.channel = channel;
        this._author = data.author;
        this._nonce = data.nonce;

        this.patch(data);
    }

    patch(data: Partial<Channels.Message>, emitPatch?: boolean) {
        let changedFields = hasChanged(this._data, data, !emitPatch);
        
        this.content = data.content ?? this.content;
        if (data.edited) {
            this.edited = new Date(data.edited.$date);
        }
        Object.assign(this._data, data);

        if (changedFields.length > 0) {
            this.client.emit('mutation/message', this, data);

            if (changedFields.includes('content')) {
                this.client.emit('message/edit', this);
            }
        }
    }

    async $sync() {
        this.author = await User.fetch(this.client, this._author);
    }

    async edit(content: string) {
        await this.client.req<'PATCH', '/channels/:id/messages/:id'>('PATCH', `/channels/${this.channel.id}/messages/${this.id}` as any, { content });
        this.patch({ content, edited: { $date: new Date().toUTCString() } }, true);
    }

    async delete(preventRequest?: boolean) {
        if (!preventRequest)
            await this.client.req<'DELETE', '/channels/:id/messages/:id'>('DELETE', `/channels/${this.channel.id}/messages/${this.id}` as any);
        
        this.client.messages.delete(this.id);
        this.channel.messages.delete(this.id);
        this.client.emit('delete/message', this.id);
    }
}
