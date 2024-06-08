import { batch } from "solid-js";

import { OwnedBotsResponse } from "revolt-api";

import { HydratedBot } from "../hydration/bot.js";
import { API, Bot, PublicBot } from "../index.js";

import { ClassCollection } from "./index.js";

/**
 * Collection of Bots
 */
export class BotCollection extends ClassCollection<Bot, HydratedBot> {
  /**
   * Fetch bot by ID
   * @param id Id
   * @returns Bot
   */
  async fetch(id: string): Promise<Bot> {
    const bot = this.get(id);
    if (bot) return bot;
    const data = await this.client.api.get(`/bots/${id as ""}`);
    this.client.users.getOrCreate(data.user._id, data.user);
    return this.getOrCreate(data.bot._id, data.bot);
  }

  /**
   * Fetch owned bots
   * @returns List of bots
   */
  async fetchOwned(): Promise<Bot[]> {
    const data = (await this.client.api.get("/bots/@me")) as OwnedBotsResponse;
    return batch(() => {
      data.users.forEach((user) =>
        this.client.users.getOrCreate(user._id, user)
      );
      return data.bots.map((bot) => this.getOrCreate(bot._id, bot));
    });
  }

  /**
   * Fetch public bot by ID
   * @param id Id
   * @returns Public Bot
   */
  async fetchPublic(id: string): Promise<PublicBot> {
    const data = await this.client.api.get(`/bots/${id as ""}/invite`);
    return new PublicBot(this.client, data);
  }

  /**
   * Get or create
   * @param id Id
   * @param data Data
   * @returns Bot
   */
  getOrCreate(id: string, data: API.Bot) {
    if (this.has(id)) {
      return this.get(id)!;
    } else {
      const instance = new Bot(this, id);
      this.create(id, "bot", instance, this.client, data);
      return instance;
    }
  }

  /**
   * Create a bot
   * @param name Bot name
   * @returns The newly-created bot
   */
  async createBot(name: string) {
    const bot = await this.client.api.post(`/bots/create`, {
      name,
    });

    return this.getOrCreate(bot._id, bot);
  }
}
