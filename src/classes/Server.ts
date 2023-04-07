import type { Server as ApiServer, Category } from "revolt-api";
import { decodeTime } from "ulid";

import { Channel, Client } from "../Client";
import { HydratedServer } from "../hydration/server";
import { ObjectStorage } from "../storage/ObjectStorage";

export default (client: Client) =>
  /**
   * Server Class
   */
  class Server {
    static #storage = new ObjectStorage<HydratedServer>();
    static #objects: Record<string, Server> = {};

    /**
     * Get an existing Server
     * @param id Server ID
     * @returns Server
     */
    static get(id: string): Server | undefined {
      return Server.#objects[id];
    }

    /**
     * Fetch server by ID
     * @param id ID
     * @returns Server
     */
    static async fetch(id: string): Promise<Server | undefined> {
      const server = Server.get(id);
      if (server) return server;

      const data = await client.api.get(`/servers/${id as ""}`);
      return new Server(id, data);
    }

    readonly id: string;

    /**
     * Construct Server
     * @param id Server Id
     */
    constructor(id: string, data?: ApiServer) {
      Server.#storage.hydrate(id, "server", data);
      Server.#objects[id] = this;
      this.id = id;
    }

    /**
     * Time when this server was created
     */
    get createdAt() {
      return new Date(decodeTime(this.id));
    }

    /**
     * Owner
     */
    get owner() {
      return client.users.get(Server.#storage.get(this.id).ownerId);
    }

    /**
     * Name
     */
    get name() {
      return Server.#storage.get(this.id).name;
    }

    /**
     * Description
     */
    get description() {
      return Server.#storage.get(this.id).description;
    }

    /**
     * Icon
     */
    get icon() {
      return Server.#storage.get(this.id).icon;
    }

    /**
     * Banner
     */
    get banner() {
      return Server.#storage.get(this.id).banner;
    }

    /**
     * Channels
     */
    get channels() {
      return [...Server.#storage.get(this.id).channelIds.values()]
        .map((id) => client.channels.get(id)!)
        .filter((x) => x);
    }

    /**
     * Categories
     */
    get categories() {
      return Server.#storage.get(this.id).categories;
    }

    /**
     * System message channels
     */
    get systemMessages() {
      return Server.#storage.get(this.id).systemMessages;
    }

    /**
     * Roles
     */
    get roles() {
      return Server.#storage.get(this.id).roles;
    }

    /**
     * Default permissions
     */
    get defaultPermissions() {
      return Server.#storage.get(this.id).defaultPermissions;
    }

    /**
     * Server flags
     */
    get flags() {
      return Server.#storage.get(this.id).flags;
    }

    /**
     * Whether analytics are enabled for this server
     */
    get analytics() {
      return Server.#storage.get(this.id).analytics;
    }

    /**
     * Whether this server is publicly discoverable
     */
    get discoverable() {
      return Server.#storage.get(this.id).discoverable;
    }

    /**
     * Whether this server is marked as mature
     */
    get mature() {
      return Server.#storage.get(this.id).nsfw;
    }

    /**
     * Get an array of ordered categories with their respective channels.
     * Uncategorised channels are returned in `id="default"` category.
     */
    get orderedChannels(): (Omit<Category, "channels"> & {
      channels: Channel[];
    })[] {
      const uncategorised = new Set(this.channels.map((channel) => channel.id));

      const elements = [];
      let defaultCategory;

      const categories = this.categories;
      if (categories) {
        for (const category of categories) {
          const channels = [];
          for (const key of category.channels) {
            if (uncategorised.delete(key)) {
              channels.push(client.channels.get(key)!);
            }
          }

          const cat = {
            ...category,
            channels,
          };

          if (cat.id === "default") {
            if (channels.length === 0) continue;

            defaultCategory = cat;
          }

          elements.push(cat);
        }
      }

      if (uncategorised.size > 0) {
        const channels = [...uncategorised].map(
          (key) => client.channels.get(key)!
        );

        if (defaultCategory) {
          defaultCategory.channels = [...defaultCategory.channels, ...channels];
        } else {
          elements.unshift({
            id: "default",
            title: "Default",
            channels,
          });
        }
      }

      return elements;
    }

    /**
     * Default channel for this server
     */
    get defaultChannel(): Channel | undefined {
      return this.orderedChannels.find((cat) => cat.channels.length)
        ?.channels[0];
    }

    /**
     * Get an ordered array of roles with their IDs attached.
     * The highest ranking roles will be first followed by lower
     * ranking roles. This is dictated by the "rank" property
     * which is smaller for higher priority roles.
     */
    get orderedRoles() {
      const roles = this.roles;
      return roles
        ? [...roles.entries()]
            .map(([id, role]) => ({ id, ...role }))
            .sort((a, b) => (a.rank || 0) - (b.rank || 0))
        : [];
    }
  };
