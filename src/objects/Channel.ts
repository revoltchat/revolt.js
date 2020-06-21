import { Client } from '../Client';

import User from './User';
import Guild from './Guild';
import Message from './Message';

import { Channels, RawChannel, ChannelType } from '../api/channels';

import { ulid } from 'ulid';

export default abstract class Channel {
    client: Client;
    id: string;
    type: ChannelType;

    messages: Map<string, Message>;

	constructor(client: Client, data: RawChannel) {
        this.client = client;
        this.id = data.id;
        this.type = data.type;

        this.messages = new Map();
    }

    abstract async $sync(guild?: Guild): Promise<void>;
    
    static async fetch(client: Client, id: string, fetched?: RawChannel): Promise<Channel> {
        let existing = client.channels.get(id);
        if (existing) {
            return existing;
        }

        let data = fetched ?? await client.$req<any, Channels.ChannelResponse>('GET', `/channels/${id}`);

        let channel;
        if (data.type === ChannelType.GUILDCHANNEL) {
            channel = new GuildChannel(client, data);

            let guild = client.guilds.get(data.guild);
            if (guild) {
                await channel.$sync(guild);
            }
        } else if (data.type === ChannelType.GROUPDM) {
            channel = new GroupChannel(client, data);
            await channel.$sync();
        } else {
            channel = new DMChannel(client, data);
            await channel.$sync();
        }

        client.channels.set(id, channel);
        return channel;
    }

    async fetchMessages() {
        let res = await this.client.$req<any, Channels.MessagesResponse>('GET', `/channels/${this.id}/messages`);
        let messages = [];
        for (let message of res) {
            messages.push(await Message.fetch(this.client, this, message.id, message));
        }

        return messages;
    }

    async sendMessage(content: string) {
        let res = await this.client.$req<Channels.SendMessageRequest, Channels.SendMessageResponse>(
            'POST',
            `/channels/${this.id}/messages`,
            {
                content,
                nonce: ulid()
            }
        );

        return res.id;
    }

    _delete() {
        this.client.channels.delete(this.id);

        if (this instanceof GuildChannel) {
            this.guild.channels.delete(this.id);
        }

        for (let message of this.messages.values()) {
            message._delete();
        }
    }
}

export class GuildChannel extends Channel {
    _guild: string;

    guild: Guild;
    name: string;
    description: string;

    constructor(client: Client, data: RawChannel & { type: ChannelType.GUILDCHANNEL }) {
        super(client, data);

        if (data.type !== ChannelType.GUILDCHANNEL)
            throw new Error("Trying to instantiate non-guild, guild channel.");
        
        this._guild = data.guild;
        this.name = data.name;
        this.description = data.description;
    }

    async $sync(guild?: Guild) {
        this.guild = guild ?? await Guild.fetch(this.client, this._guild);
    }

    async delete() {
        await this.client.$req<any, Channels.DeleteChannelResponse>('DELETE', `/channels/${this.id}`);
        this.guild.channels.delete(this.id);
        this.client.channels.delete(this.id);
    }
}

export class GroupChannel extends Channel {
    _recipients: string[];
    _owner: string;

    name: string;
    description: string;
    recipients: Map<String, User>;
    owner: User;

    constructor(client: Client, data: RawChannel & { type: ChannelType.GROUPDM }) {
        super(client, data);

        if (data.type !== ChannelType.GROUPDM)
            throw new Error("Trying to instantiate non-group, group channel.");
        
        this.name = data.name;
        this.description = data.description;
        this._recipients = data.recipients;
        this._owner = data.owner;
    }

    async $sync() {
        this.recipients = new Map();
        for (let id of this._recipients) {
            this.recipients.set(id, await User.fetch(this.client, id));
        }

        this.owner = await User.fetch(this.client, this._owner);
    }

    async delete() {
        await this.client.$req<any, Channels.DeleteChannelResponse>('DELETE', `/channels/${this.id}`);
        this.client.channels.delete(this.id);
    }

    async addUser(user: User) {
        await this.client.$req<any, Channels.AddToGroupResponse>('PUT', `/channels/${this.id}/recipients/${user.id}`);
        this.recipients.set(user.id, user);
    }

    async removeUser(user: User) {
        await this.client.$req<any, Channels.RemoveFromGroupResponse>('DELETE', `/channels/${this.id}/recipients/${user.id}`);
        this.recipients.delete(user.id);
    }
}

export class DMChannel extends Channel {
    _recipients: string[];

    recipient: User;

    constructor(client: Client, data: RawChannel & { type: ChannelType.DM }) {
        super(client, data);

        if (data.type !== ChannelType.DM)
            throw new Error("Trying to instantiate non-dm, dm channel.");
        
        this._recipients = data.recipients;
    }

    async $sync() {
        let filtered = this._recipients.filter(x => x !== this.client.userId);
        if (filtered.length > 0) {
            this.recipient = await User.fetch(this.client, filtered[0]);
        } else {
            this.recipient = this.client.user as User;
        }
    }

    async delete() {
        await this.client.$req<any, Channels.DeleteChannelResponse>('DELETE', `/channels/${this.id}`);
        this.client.channels.delete(this.id);
    }
}
