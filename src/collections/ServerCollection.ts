import { API, Server } from "..";
import { HydratedServer } from "../hydration";

import { ClassCollection } from ".";

export class ServerCollection extends ClassCollection<Server, HydratedServer> {
  /**
   * Fetch server by ID
   * @param id Id
   * @returns Server
   */
  async fetch(id: string): Promise<Server> {
    const server = this.get(id);
    if (server) return server;
    const data = await this.client.api.get(`/servers/${id as ""}`);
    return this.getOrCreate(data._id, data);
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
      this.create(id, "server", instance, data);
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
      this.create(id, "server", instance, {
        id,
        partial: true,
      });
      return instance;
    }
  }
}
