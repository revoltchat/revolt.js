import { Client } from '..';
import { Users, Relationships } from '../api/users';

export default class User {
    client: Client;
    id: string;
    username: string;

    _relations?: Relationships;

    constructor(client: Client, data: Users.User) {
        this.client = client;
        this.id = data._id;
        this.username = data.username;

        this._relations = data.relations;
    }

    static async fetch(client: Client, id: string, data?: Users.User): Promise<User> {
        let existing;
        if (existing = client.users.get(id)) {
            return existing;
        }

        let user = new User(client, data ?? (await client.Axios.get(`/users/${id}`)).data);
        client.users.set(id, user);
        
        return user;
    }
}
