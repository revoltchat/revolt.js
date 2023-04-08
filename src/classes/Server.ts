import { SetStoreFunction } from "solid-js/store";

import type { Server as ApiServer, Category } from "revolt-api";
import { decodeTime } from "ulid";

import { Channel, Client } from "../Client";
import { StoreCollection } from "../collections/Collection";
import { HydratedServer } from "../hydration/server";
import { bitwiseAndEq, calculatePermission } from "../permissions/calculator";
import { Permission } from "../permissions/definitions";

export default (
  client: Client,
  collection: StoreCollection<unknown, unknown>
) =>
  /**
   * Server Class
   */
  class Server {
    static #collection: StoreCollection<
      InstanceType<typeof this>,
      HydratedServer
    >;
    static #set: SetStoreFunction<Record<string, HydratedServer>>;
    static #get: (id: string) => HydratedServer;

    static {
      Server.#collection = collection as never;
      Server.#set = collection.updateUnderlyingObject as never;
      Server.#get = collection.getUnderlyingObject as never;
    }

    /**
     * Fetch server by ID
     * @param id ID
     * @returns Server
     */
    static async fetch(id: string): Promise<Server | undefined> {
      const server = Server.#collection.get(id);
      if (server) return server;

      const data = await client.api.get(`/servers/${id as ""}`);
      return new Server(id, data);
    }

    readonly id: string;

    /**
     * Construct
     * @param id Id
     * @param data Data
     */
    constructor(id: string, data?: ApiServer) {
      this.id = id;
      Server.#collection.create(id, "server", this, data);
    }

    /**
     * Get or create
     * @param id Id
     * @param data Data
     */
    static new(id: string, data?: ApiServer) {
      return client.servers.get(id) ?? new Server(id, data);
    }

    /**
     * Time when this server was created
     */
    get createdAt() {
      return new Date(decodeTime(this.id));
    }

    /**
     * Owner's user ID
     */
    get ownerId() {
      return Server.#get(this.id).ownerId;
    }

    /**
     * Owner
     */
    get owner() {
      return client.users.get(Server.#get(this.id).ownerId);
    }

    /**
     * Name
     */
    get name() {
      return Server.#get(this.id).name;
    }

    /**
     * Description
     */
    get description() {
      return Server.#get(this.id).description;
    }

    /**
     * Icon
     */
    get icon() {
      return Server.#get(this.id).icon;
    }

    /**
     * Banner
     */
    get banner() {
      return Server.#get(this.id).banner;
    }

    /**
     * Channel IDs
     */
    get channelIds() {
      return Server.#get(this.id).channelIds;
    }

    /**
     * Channels
     */
    get channels() {
      return [...Server.#get(this.id).channelIds.values()]
        .map((id) => client.channels.get(id)!)
        .filter((x) => x);
    }

    /**
     * Categories
     */
    get categories() {
      return Server.#get(this.id).categories;
    }

    /**
     * System message channels
     */
    get systemMessages() {
      return Server.#get(this.id).systemMessages;
    }

    /**
     * Roles
     */
    get roles() {
      return Server.#get(this.id).roles;
    }

    /**
     * Default permissions
     */
    get defaultPermissions() {
      return Server.#get(this.id).defaultPermissions;
    }

    /**
     * Server flags
     */
    get flags() {
      return Server.#get(this.id).flags;
    }

    /**
     * Whether analytics are enabled for this server
     */
    get analytics() {
      return Server.#get(this.id).analytics;
    }

    /**
     * Whether this server is publicly discoverable
     */
    get discoverable() {
      return Server.#get(this.id).discoverable;
    }

    /**
     * Whether this server is marked as mature
     */
    get mature() {
      return Server.#get(this.id).nsfw;
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

    get unread() {
      return false;
    }

    get mentions() {
      return [];
    }

    /**
     * URL to the server's icon
     */
    get iconURL() {
      return client.generateFileURL(this.icon, { max_side: 256 });
    }

    /**
     * URL to the server's animated icon
     */
    get animatedIconURL() {
      return client.generateFileURL(this.icon, { max_side: 256 }, true);
    }

    /**
     * URL to the server's banner
     */
    get bannerURL() {
      return client.generateFileURL(this.banner, {
        max_side: 256,
      });
    }

    /**
     * Own member object for this server
     */
    get member() {
      return client.serverMembers.getByKey({
        server: this.id,
        user: client.user!.id,
      });
    }

    /**
     * Permission the currently authenticated user has against this server
     */
    get permission() {
      return calculatePermission(client, this);
    }

    /**
     * Check whether we have a given permission in a server
     * @param permission Permission Names
     * @returns Whether we have this permission
     */
    havePermission(...permission: (keyof typeof Permission)[]) {
      return bitwiseAndEq(
        this.permission,
        ...permission.map((x) => Permission[x])
      );
    }
  };
