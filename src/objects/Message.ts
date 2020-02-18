import { Channel } from './Channel';
import { RawMessage, Channels } from '../api';
import { User } from './User';

export interface MessageSnapshot {
	id: string,
	author: User,
	content: string,
}

export enum Sent {
	UNSENT,
	SENT,
	FAILED,
}

export class Message {
	channel: Channel;

	id: string;
	nonce: string;
	sent: Sent;

	user: User;
	content: string;
	edited: Date | null;

	author: string;

	constructor(channel: Channel, data: RawMessage) {
		this.channel = channel;
		this.sent = Sent.UNSENT;
		this.update(data);
	}

	update(data: RawMessage & { channel?: string }) {
		if (data.edited) {
			this.edited = new Date(data.edited);
			delete data.edited;
		}

		delete data.channel;

		Object.assign(this, data);
	}

	async $init() {
		this.user = await this.channel.client.findUser(this.author);
	}

	$snapshot(): MessageSnapshot {
		return {
			id: this.id,
			author: this.user,
			content: this.content,
		}
	}

	static async from(id: string, channel: Channel, data?: RawMessage) {
		let message;
		if (channel.messages.has(id)) {
			message = channel.messages.get(id) as Message;
			data && message.update(data);
		} else if (data) {
			message = new Message(channel, data);
		} else {
			message = new Message(channel, await channel.client.$req<Request, RawMessage>('GET', '/channels/' + channel.id + '/messages/' + id));
		}

		message.sent = Sent.SENT;
		await message.$init();
		channel.messages.set(id, message);
		return message;
	}

	async edit(content: string) {
		if (this.sent === Sent.FAILED) {
			throw new Error("Cannot edit failed message!");
		}

		if (this.sent === Sent.UNSENT) {
			throw new Error("Cannot delete unsent message!");
		}

		let res = await this.channel.client.$req<Channels.EditMessageRequest, Channels.EditMessageResponse>('PATCH', '/channels/' + this.channel.id + '/messages/' + this.id, { content });

		if (res.success) {
			this.content = content;
		} else {
			throw new Error(res.error);
		}
	}

	async delete() {
		if (this.sent === Sent.FAILED) {
			this.channel.messages.delete(this.id);
			return;
		}

		if (this.sent === Sent.UNSENT) {
			throw new Error("Cannot delete unsent message!");
		}

		let res = await this.channel.client.$req<Request, Channels.DeleteMessageResponse>('DELETE', '/channels/' + this.channel.id + '/messages/' + this.id);

		if (res.success) {
			this.channel.messages.delete(this.id);
		} else {
			throw new Error(res.error);
		}
	}
}
