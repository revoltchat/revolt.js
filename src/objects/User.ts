import { Users } from '../api';
import { Client } from '../Client';

export class User {
	client: Client;

	id: string;
	username: string;

	email?: string;
	verified?: boolean;

	constructor(client: Client, data: Users.UserResponse) {
		this.client = client;

		this.id = data.id;
		this.username = data.username;

		this.email = data.email;
		this.verified = data.verified;
	}

	update(data: Users.UserResponse) {
		Object.assign(this, data);
	}

	static async from(id: string, client: Client, data?: Users.UserResponse) {
		let user;
		if (client.users.has(id)) {
			user = client.users.get(id) as User;
			data && user?.update(data);
		} else if (data) {
			user = new User(client, data);
		} else {
			user = new User(client, await client.$req<Request, Users.UserResponse>('GET', '/users/@me'));
		}

		client.users.set(id, user);
		return user;
	}
}
