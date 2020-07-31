import { Client } from '../Client';
import { Channel } from './Channel';
import { User } from './User';

import { Guild as GuildAPI, CoreGuild, RawChannel, ChannelType } from '../api';

export class Guild {
    client: Client;
    id: string;

    _owner: string;
    _channels: RawChannel[];

    name: string;
    description: string;
    owner: User;

    channels: Map<String, Channel>;
    members: Map<String, User>;

	constructor(client: Client, data: CoreGuild) {
        this.client = client;
        this.id = data.id;

        this._owner = data.owner;
        this._channels = data.channels ?
            data.channels
                .map(x => {
                    return {
                        id: x.id,
                        type: ChannelType.GUILDCHANNEL,
                        guild: data.id,
                        name: x.name,
                        description: x.description
                    };
                })
                : [];

        this.name = data.name;
        this.description = data.description;

        this.channels = new Map();
        this.members = new Map();
    }

    async $sync() {
        this.owner = await User.fetch(this.client, this._owner);
        
        for (let raw of this._channels) {
            let channel = await Channel.fetch(this.client, raw.id);
            await channel.$sync(this);
            this.channels.set(raw.id, channel);
            // TODO: MAKE CHANNELS COMPULSARY IN CORE GUILD HENCE USE IT HERE INSTEAD OF FETCHING AGAIN
        }
    }
    
    static async fetch(client: Client, id: string): Promise<Guild> {
        let existing = client.guilds.get(id);
        if (existing) {
            return existing;
        }

        let data = await client.$req<any, GuildAPI.GuildResponse>('GET', `/guild/${id}`);
        let guild = new Guild(client, data);
        await guild.$sync();
        client.guilds.set(id, guild);
        client.emit('create/guild', guild);

        return guild;
    }

    async delete() {
        this.client.$req<any, GuildAPI.GuildDeleteResponse>('DELETE', `/guild/${this.id}`);
        this._delete();
    }

    _delete() {
        this.client.guilds.delete(this.id);

        for (let channel of this.channels.values()) {
            channel._delete();
        }
    }

    get iconURL(): string | undefined {
        return undefined;
    }
}
