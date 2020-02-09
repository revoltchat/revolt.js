import { Users, Relationship } from '../api';
import { Client } from '../Client';

export class User {
	client: Client;

	id: string;
	username: string;

	relationship?: Relationship;

	email?: string;
	verified?: boolean;

	constructor(client: Client, data: Users.UserResponse) {
		this.client = client;
		this.$update(data);
	}

	$update(data: Users.UserResponse) {
		Object.assign(this, data);
	}

	static async from(id: string, client: Client, data?: Users.UserResponse) {
		let user;
		if (client.users.has(id)) {
			user = client.users.get(id) as User;
			data && user.$update(data);
		} else if (data) {
			user = new User(client, data);
		} else {
			user = new User(client, await client.$req<Request, Users.UserResponse>('GET', '/users/' + id));
		}

		client.users.set(id, user);
		return user;
	}

	async fetchRelationship() {
		let friend = await this.client.$req<Request, Users.FriendResponse>('GET', '/users/' + this.id + '/friend');
		this.relationship = friend.status;
		return friend.status;
	}

	async addFriend() {
		let res = await this.client.$req<Request, Users.AddFriendResponse>('PUT', '/users/' + this.id + '/friend');

		if (res.success) {
			this.relationship = res.status;
			return this.relationship;
		} else {
			throw new Error(res.error);
		}
	}

	async removeFriend() {
		let res = await this.client.$req<Request, Users.RemoveFriendResponse>('DELETE', '/users/' + this.id + '/friend');

		if (res.success) {
			this.relationship = Relationship.NONE;
			return this.relationship;
		} else {
			throw new Error(res.error);
		}
	}

	async getDM() {
		let res = await this.client.$req<Request, Users.OpenDMResponse>('GET', '/users/' + this.id + '/dm');

		if (res.success) {
			return this.client.findChannel(res.id);
		} else {
			throw new Error(res.error);
		}
	}
}
