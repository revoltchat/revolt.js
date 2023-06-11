import { runInAction } from "mobx";

import { Client } from "../Client";

import {
    InviteBotDestination,
    DataEditBot,
    DataCreateBot,
    OwnedBotsResponse,
} from "revolt-api";

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
        const { bot, user } = await this.client.api.get(`/bots/${id as ""}`);

        return {
            bot,
            user: await this.client.users.fetch(user._id, user),
        };
    }

    /**
     * Delete a bot
     * @param id Bot ID
     */
    async delete(id: string) {
        await this.client.api.delete(`/bots/${id as ""}`);
    }

    /**
     * Fetch a public bot
     * @param id Bot ID
     * @returns Public Bot object
     */
    async fetchPublic(id: string) {
        return await this.client.api.get(`/bots/${id as ""}/invite`);
    }

    /**
     * Invite a public bot
     * @param id Bot ID
     * @param destination The group or server to add to
     */
    async invite(id: string, destination: InviteBotDestination) {
        return await this.client.api.post(
            `/bots/${id as ""}/invite`,
            destination,
        );
    }

    /**
     * Fetch a bot
     * @param id Bot ID
     * @returns Bot and User objects
     */
    async fetchOwned() {
        const { bots, users: userObjects } = (await this.client.api.get(
            `/bots/@me`,
        )) as OwnedBotsResponse;

        const users = [];
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
    async edit(id: string, data: DataEditBot) {
        await this.client.api.patch(`/bots/${id as ""}`, data);

        if (data.name) {
            const user = this.client.users.get(id);
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
    async create(data: DataCreateBot) {
        const bot = await this.client.api.post("/bots/create", data);
        const user = await this.client.users.fetch(bot._id, {
            _id: bot._id,
            username: data.name,
            discriminator: "0000", // no data
            display_name: data.name, // typing issue
            bot: {
                owner: this.client.user!._id,
            },
        });

        return {
            bot,
            user,
        };
    }
}
