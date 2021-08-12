import { runInAction } from 'mobx';
import { Route } from '../api/routes';
import { Client } from '../Client';

export default class Bots {
    client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    /**
     * Fetch a bot
     * @param id Bot ID
     * @returns Bot and User object
     */
    async fetch(id: string) {
        let { bot, user } = await this.client.req('GET', `/bots/${id}` as '/bots/id');
        return {
            bot,
            user: await this.client.users.fetch(user._id, user)
        };
    }

    /**
     * Delete a bot
     * @param id Bot ID
     */
    async delete(id: string) {
        await this.client.req('DELETE', `/bots/${id}` as '/bots/id');
    }

    /**
     * Fetch a public bot
     * @param id Bot ID
     * @returns Public Bot object
     */
    async fetchPublic(id: string) {
        return await this.client.req('GET', `/bots/${id}/invite` as '/bots/id/invite');
    }

    /**
     * Invite a public bot
     * @param id Bot ID
     * @param destination The group or server to add to
     */
    async invite(id: string, destination: Route<'POST', '/bots/id/invite'>["data"]) {
        return await this.client.req('POST', `/bots/${id}/invite` as '/bots/id/invite', destination);
    }

    /**
     * Fetch a bot
     * @param id Bot ID
     * @returns Bot and User objects
     */
    async fetchOwned() {
        const { bots, users: userObjects } = await this.client.req('GET', `/bots/@me`);

        let users = [];
        for (const obj of userObjects) {
            users.push(await this.client.users.fetch(obj._id, obj));
        }
        
        return { bots, users };
    }

    /**
     * Edit a bot
     * @param id Bot ID
     * @param data Bot edit data object
     */
    async edit(id: string, data: Route<'PATCH', '/bots/id'>["data"]) {
        await this.client.req('PATCH', `/bots/${id}` as '/bots/id', data);

        if (data.name) {
            let user = this.client.users.get(id);
            if (user) {
                runInAction(() => {
                    user!.username = data.name!;
                });
            }
        }
    }

    /**
     * Create a bot
     * @param data Bot creation data
     */
    async create(data: Route<'POST', '/bots/create'>["data"]) {
        let bot = await this.client.req('POST', '/bots/create', data);
        let user = await this.client.users.fetch(bot._id, {
            _id: bot._id,
            username: data.name,
            bot: {
                owner: this.client.user!._id
            }
        });

        return {
            bot,
            user
        };
    }
}
