import { Channels, ChannelType } from '../api';
import { Client } from '../Client';
import { User } from './User';

export class Channel {
	client: Client;

	id: string;
	type: ChannelType;

	recipients?: User[];

	constructor(client: Client, data: Channels.ChannelResponse) {
		this.client = client;
		this.update(data);
	}

	update(data: Channels.ChannelResponse) {
		if (data.type !== ChannelType.GUILDCHANNEL) {
			let ids = data.recipients;
			delete data.recipients;
			ids.map(x => User.from(x, this.client));
		}

		Object.assign(this, data);
	}

	static async from(id: string, client: Client, data?: Channels.ChannelResponse) {
		let channel;
		if (client.channels.has(id)) {
			channel = client.channels.get(id) as Channel;
			data && channel.update(data);
		} else if (data) {
			channel = new Channel(client, data);
		} else {
			channel = new Channel(client, await client.$req<Request, Channels.ChannelResponse>('GET', '/channels/' + id));
		}

		client.channels.set(id, channel);
		return channel;
	}
}
