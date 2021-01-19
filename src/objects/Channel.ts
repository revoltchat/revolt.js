import { Client } from '..';
import { Channels } from '../api/channels';
import User from './User';

export default abstract class Channel {
    client: Client;
    id: string;

    constructor(client: Client, data: Channels.Channel) {
        this.client = client;
        this.id = data._id;

        this.patch(data);
    }

    abstract patch(data: Channels.Channel): void;
    abstract $sync(): Promise<void>;

    static async fetch(client: Client, id: string, raw?: Channels.Channel): Promise<Channel> {
        let existing;
        if (existing = client.channels.get(id)) {
            if (raw) {
                existing.patch(raw);
                await existing.$sync();
            }

            return existing;
        }

        let data = raw ?? (await client.Axios.get(`/channels/${id}`)).data;
        let channel: Channel;
        switch (data.type) {
            case 'SavedMessages': channel = new SavedMessagesChannel(client, data); break;
            case 'DirectMessage': channel = new DirectMessageChannel(client, data); break;
            case 'Group': channel = new GroupChannel(client, data); break;
            default: throw new Error("Unknown channel type.");
        }

        await channel.$sync();
        client.channels.set(id, channel);
        
        return channel;
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

    patch(data: Channels.Channel) {
        if (data.type !== 'SavedMessages') throw new Error("Trying to create SavedMessagesChannel with incorrect type.");
        this._user = data.user;
    }

    async $sync() {}
}

export class DirectMessageChannel extends TextChannel {
    recipients: Set<User>;

    _recipients: string[];

    constructor(client: Client, data: Channels.Channel) {
        super(client, data);
    }

    patch(data: Channels.Channel) {
        if (data.type !== 'DirectMessage') throw new Error("Trying to create DirectMessageChannel with incorrect type.");
        this._recipients = data.recipients;
    }

    async $sync() {
        for (let recipient of this._recipients) {
            this.recipients.add(await User.fetch(this.client, recipient));
        }
    }
}

export class GroupChannel extends TextChannel {
    name: string;
    description: string;
    recipients: Set<User>;
    owner: User;
    
    _owner: string;
    _recipients: string[];

    constructor(client: Client, data: Channels.Channel) {
        super(client, data);
    }

    patch(data: Channels.Channel) {
        if (data.type !== 'Group') throw new Error("Trying to create GroupChannel with incorrect type.");
        this.name = data.name;
        this.description = data.description;
        this._owner = data.owner;
        this._recipients = data.recipients;
    }

    async $sync() {
        this.owner = await User.fetch(this.client, this._owner);

        for (let recipient of this._recipients) {
            this.recipients.add(await User.fetch(this.client, recipient));
        }
    }
}
