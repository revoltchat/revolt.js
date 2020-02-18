import { Channels, ChannelType } from '../api';
import { Client } from '../Client';
import { User } from './User';
import { Message } from './Message';
import { ulid } from 'ulid';

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

	sendMessage(content: string): [ Message, Promise<Message> ] {
		if (content.length > 2000)
			throw new Error("Message too long! > 2000 characters.");

		let nonce = ulid();
		let message = new Message(this, {
			id: nonce,
			nonce,
			author: this.client.userId as string,
			content,
			edited: null
		});

		this.messages.set(nonce, message);

		return [
			message,
			(async () => {
				let res = await this.client.$req<Channels.SendMessageRequest, Channels.SendMessageResponse>('POST', '/channels/' + this.id + '/messages', { content, nonce });
				if (res.success) {
					this.messages.delete(nonce);
					Message.from(res.id, this,
						{
							id: this.id,
							author: this.client.userId as string,
							content,
							edited: null,
						}
					);

					return message;
				} else {
					throw new Error(res.error);
				}
			})()
		]
	}
}
