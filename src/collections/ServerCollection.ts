import { batch } from "solid-js";

import { DataCreateServer } from "revolt-api";

import { API, Server } from "..";
import { HydratedServer } from "../hydration";

import { ClassCollection } from ".";

/**
 * Collection of Servers
 */
export class ServerCollection extends ClassCollection<Server, HydratedServer> {
  /**
   * Fetch server by ID
   *
   * This will not fetch channels!
   * @param id Id
   * @returns Server
   */
  async fetch(id: string): Promise<Server> {
    const server = this.get(id);
    if (server) return server;
    const data = await this.client.api.get(`/servers/${id as ""}`, {
      include_channels: true,
    });

    return batch(() => {
      for (const channel of data.channels as unknown as API.Channel[]) {
        if (typeof channel !== "string") {
          this.client.channels.getOrCreate(channel._id, channel);
        }
      }

      // @ts-expect-error TODO
      return this.getOrCreate(data._id, data);
    });
  }

  /**
   * Get or create
   * @param id Id
   * @param data Data
   * @param isNew Whether this object is new
   */
  getOrCreate(id: string, data: API.Server, isNew = false) {
    if (this.has(id)) {
      return this.get(id)!;
    } else {
      const instance = new Server(this, id);
      this.create(id, "server", instance, this.client, data);
      isNew && this.client.emit("serverCreate", instance);
      return instance;
    }
  }

  /**
   * Get or return partial
   * @param id Id
   */
  getOrPartial(id: string) {
    if (this.has(id)) {
      return this.get(id)!;
    } else if (this.client.options.partials) {
      const instance = new Server(this, id);
      this.create(id, "server", instance, this.client, {
        id,
        partial: true,
      });
      return instance;
    }
  }

  /**
   * Create a server
   * @param data Server options
   * @returns The newly-created server
   */
  async createServer(data: DataCreateServer) {
    const { server, channels } = await this.client.api.post(
      `/servers/create`,
      data
    );

    return batch(() => {
      for (const channel of channels) {
        this.client.channels.getOrCreate(channel._id, channel);
      }

      return this.getOrCreate(server._id, server, true);
    });
  }
}
