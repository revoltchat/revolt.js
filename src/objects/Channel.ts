import { Channels, ChannelType } from '../api';
import { Client } from '../Client';
import { User } from './User';
import { Message } from './Message';

export class Channel {
	client: Client;

	id: string;
	type: ChannelType;

	// DM / GROUP DM
	recipients?: Set<string>;
	users?: Set<User>;

	messages: Map<string, Message>;

	constructor(client: Client, data: Channels.ChannelResponse) {
		this.client = client;
		this.messages = new Map();
		this.update(data);
	}

	update(data: Channels.ChannelResponse) {
		if (data.type !== ChannelType.GUILDCHANNEL) {
			this.recipients = new Set();
			data.recipients.forEach(x => this.recipients?.add(x));
			delete data.recipients;
		}

		Object.assign(this, data);
	}

	async $init() {
		if (this.type !== ChannelType.GUILDCHANNEL) {
			this.users = new Set();
			for (let user of this.recipients ?? []) {
				this.users.add(await User.from(user, this.client));
			}
		}
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

		await channel.$init();
		client.channels.set(id, channel);
		return channel;
	}

	findMessage(id: string) {
		return Message.from(id, this);
	}

	async fetchMessages() {
		let messages = [];
		for (let x of await this.client.$req<Request, Channels.MessagesResponse>('GET', '/channels/' + this.id + '/messages')) {
			messages.push(await Message.from(x.id, this, x));
		}

		return messages;
	}

	async sendMessage(content: string) {
		let res = await this.client.$req<Channels.SendMessageRequest, Channels.SendMessageResponse>('POST', '/channels/' + this.id + '/messages', { content });

		if (res.success) {
			let message = new Message(this, {
				id: res.id,
				author: this.client.userId as string,
				content,
				edited: null
			});

			this.messages.set(this.id, message);
			return message;
		} else {
			throw new Error(res.error);
		}
	}
}
