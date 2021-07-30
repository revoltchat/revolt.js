import type { Message as MessageI, SystemMessage } from 'revolt-api/types/Channels';
import type { Attachment } from 'revolt-api/types/Autumn';
import type { Embed } from 'revolt-api/types/January';
import type { Route } from '../api/routes';

import { makeAutoObservable, runInAction, action } from 'mobx';
import isEqual from 'lodash.isequal';

import { Nullable, toNullable, toNullableDate } from '../util/null';
import Collection from './Collection';
import { Client } from "..";

export class Message {
    client: Client;

    _id: string;
    nonce?: string;
    channel_id: string;
    author_id: string;

    content: string | SystemMessage;
    attachments: Nullable<Attachment[]>;
    edited: Nullable<Date>;
    embeds: Nullable<Embed[]>;
    mention_ids: Nullable<string[]>;
    reply_ids: Nullable<string[]>;

    get channel() {
        return this.client.channels.get(this.channel_id);
    }

    get author() {
        return this.client.channels.get(this.author_id);
    }

    get member() {
        const channel = this.channel;
        if (channel?.channel_type === 'TextChannel') {
            return this.client.members.get({
                server: channel.server_id!,
                user: this.author_id
            });
        }
    }

    get mentions() {
        return this.mention_ids?.map(id => this.client.users.get(id));
    }

    constructor(client: Client, data: MessageI) {
        this.client = client;
        this._id = data._id;
        this.nonce = data.nonce;
        this.channel_id = data.channel;
        this.author_id = data.author;

        this.content = data.content;
        this.attachments = toNullable(data.attachments);
        this.edited = toNullableDate(data.edited);
        this.embeds = toNullable(data.embeds);
        this.mention_ids = toNullable(data.mentions);
        this.reply_ids = toNullable(data.replies);

        makeAutoObservable(this, {
            _id: false,
            client: false,
        });
    }

    @action update(data: Partial<MessageI>) {
        const apply = (key: string, target?: string) => {
            // This code has been tested.
            // @ts-expect-error
            if (data[key] && !isEqual(this[target ?? key], data[key])) {
                // @ts-expect-error
                this[target ?? key] = data[key];
            }
        };

        apply("content");
        apply("attachments");
        apply("edited");
        apply("embeds");
        apply("mentions", "mention_ids");
    }

    /**
     * Edit a message
     * @param data Message edit route data
     */
     async editMessage(data: Route<'PATCH', '/channels/id/messages/id'>["data"]) {
        return await this.client.req('PATCH', `/channels/${this.channel_id}/messages/${this._id}` as '/channels/id/messages/id', data);
    }

    /**
     * Delete a message
     */
    async deleteMessage() {
        return await this.client.req('DELETE', `/channels/${this.channel_id}/messages/${this._id}` as '/channels/id/messages/id');
    }
}

export default class Messages extends Collection<string, Message> {
    constructor(client: Client) {
        super(client);
        this.createObj = this.createObj.bind(this);
    }

    /**
     * Create a message object.
     * This is meant for internal use only.
     * @param data Message Data
     * @returns Message
     */
    createObj(data: MessageI) {
        if (this.has(data._id)) return this.get(data._id)!;
        let message = new Message(this.client, data);

        runInAction(() => {
            this.set(data._id, message);
        });

        return message;
    }
}
