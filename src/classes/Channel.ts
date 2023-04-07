import type { Channel as ApiChannel } from "revolt-api";
import { decodeTime } from "ulid";

import { Client } from "../Client";
import { HydratedChannel } from "../hydration/channel";
import { ObjectStorage } from "../storage/ObjectStorage";

export default (client: Client) =>
  /**
   * Channel Class
   */
  class Channel {
    static #storage = new ObjectStorage<HydratedChannel>();
    static #objects: Record<string, Channel> = {};

    /**
     * Get an existing Channel
     * @param id Channel ID
     * @returns Channel
     */
    static get(id: string): Channel | undefined {
      return Channel.#objects[id];
    }

    /**
     * Fetch channel by ID
     * @param id ID
     * @returns Channel
     */
    static async fetch(id: string): Promise<Channel | undefined> {
      const channel = Channel.get(id);
      if (channel) return channel;

      const data = await client.api.get(`/channels/${id as ""}`);
      return new Channel(id, data);
    }

    readonly id: string;

    /**
     * Construct Channel
     * @param id Channel Id
     */
    constructor(id: string, data?: ApiChannel) {
      Channel.#storage.hydrate(id, "channel", data);
      Channel.#objects[id] = this;
      this.id = id;
    }

    /**
     * Time when this server was created
     */
    get createdAt() {
      return new Date(decodeTime(this.id));
    }

    /**
     * Channel type
     */
    get type() {
      return Channel.#storage.get(this.id).channelType;
    }

    /**
     * Channel name
     */
    get name() {
      return Channel.#storage.get(this.id).name;
    }

    /**
     * Channel description
     */
    get description() {
      return Channel.#storage.get(this.id).description;
    }

    /**
     * Channel icon
     */
    get icon() {
      return Channel.#storage.get(this.id).icon;
    }

    /**
     * Whether the conversation is active
     */
    get active() {
      return Channel.#storage.get(this.id).active;
    }

    /**
     * Recipients of the group
     */
    get recipients() {
      return Channel.#storage
        .get(this.id)
        .recipientIds.map((id) => client.users.get(id)!);
    }

    /**
     * User this channel belongs to
     */
    get user() {
      return client.users.get(Channel.#storage.get(this.id).userId!);
    }

    /**
     * Owner of the group
     */
    get owner() {
      return client.users.get(Channel.#storage.get(this.id).ownerId!);
    }

    /**
     * Server this channel is in
     */
    get server() {
      return client.users.get(Channel.#storage.get(this.id).serverId!);
    }

    /**
     * Permissions allowed for users in this group
     */
    get permissions() {
      return Channel.#storage.get(this.id).permissions;
    }

    /**
     * Default permissions for this server channel
     */
    get defaultPermissions() {
      return Channel.#storage.get(this.id).defaultPermissions;
    }

    /**
     * Role permissions for this server channel
     */
    get rolePermissions() {
      return Channel.#storage.get(this.id).rolePermissions;
    }

    /**
     * Whether this channel is marked as mature
     */
    get mature() {
      return Channel.#storage.get(this.id).nsfw;
    }

    /**
     * ID of the last message sent in this channel
     */
    get lastMessageId() {
      return Channel.#storage.get(this.id).lastMessageId;
    }

    // TODO: lastMessage
  };
