import { ReactiveMap } from "@solid-primitives/map";
import type { Channel as ApiChannel } from "revolt-api";
import { decodeTime } from "ulid";

import { Client } from "../Client";
import { hydrate } from "../hydration";
import { HydratedChannel } from "../hydration/channel";
import { bitwiseAndEq, calculatePermission } from "../permissions/calculator";
import { Permission } from "../permissions/definitions";
import { ObjectStorage } from "../storage/ObjectStorage";

export default (client: Client) =>
  /**
   * Channel Class
   */
  class Channel {
    static #storage = new ObjectStorage<HydratedChannel>();

    static {
      client.events.on("event", (event) => {
        switch (event.type) {
          case "ChannelUpdate": {
            this.#storage.set(event.id, hydrate("channel", event.data));
            break;
          }
        }
      });
    }

    // * Object Map Definition
    static #objects = new ReactiveMap<string, InstanceType<typeof this>>();

    /**
     * Get an existing object
     * @param id ID
     * @returns Object
     */
    static get(id: string): InstanceType<typeof this> | undefined {
      return this.#objects.get(id);
    }

    /**
     * Number of stored objects
     * @returns Size
     */
    static size() {
      return this.#objects.size;
    }

    /**
     * Iterable of keys in the map
     * @returns Iterable
     */
    static keys() {
      return this.#objects.keys();
    }

    /**
     * Iterable of values in the map
     * @returns Iterable
     */
    static values() {
      return this.#objects.values();
    }

    /**
     * List of values in the map
     * @returns List
     */
    static toList() {
      return [...this.#objects.values()];
    }

    /**
     * Iterable of key, value pairs in the map
     * @returns Iterable
     */
    static entries() {
      return this.#objects.entries();
    }

    /**
     * Execute a provided function over each key, value pair in the map
     * @param cb Callback for each pair
     * @returns Iterable
     */
    static forEach(
      cb: (
        value: InstanceType<typeof this>,
        key: string,
        map: ReactiveMap<string, InstanceType<typeof this>>
      ) => void
    ) {
      return this.#objects.forEach(cb);
    }
    // * End Object Map Definition

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
      this.id = id;
      Channel.#storage.hydrate(id, "channel", data);
      Channel.#objects.set(id, this);
    }

    updateSomething() {
      Channel.#storage.set(this.id, "name", "troling");
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
     * User Ids of recipients of the group
     */
    get recipientIds() {
      return Channel.#storage.get(this.id).recipientIds;
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
     * Find recipient of this DM
     */
    get recipient() {
      return this.type === "DirectMessage"
        ? this.recipients.find((user) => user.id !== client.user!.id)
        : undefined;
    }

    /**
     * User ID
     */
    get userId() {
      return Channel.#storage.get(this.id).userId!;
    }

    /**
     * User this channel belongs to
     */
    get user() {
      return client.users.get(Channel.#storage.get(this.id).userId!);
    }

    /**
     * Owner ID
     */
    get ownerId() {
      return Channel.#storage.get(this.id).ownerId!;
    }

    /**
     * Owner of the group
     */
    get owner() {
      return client.users.get(Channel.#storage.get(this.id).ownerId!);
    }

    /**
     * Server ID
     */
    get serverId() {
      return Channel.#storage.get(this.id).serverId!;
    }

    /**
     * Server this channel is in
     */
    get server() {
      return client.servers.get(Channel.#storage.get(this.id).serverId!);
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

    /**
     * Time when the last message was sent
     */
    get lastMessageAt() {
      return this.lastMessageId
        ? new Date(decodeTime(this.lastMessageId))
        : undefined;
    }

    /**
     * Time when the channel was last updated (either created or a message was sent)
     */
    get updatedAt() {
      return this.lastMessageAt ?? this.createdAt;
    }

    // TODO: lastMessage

    get unread() {
      return false;
    }

    get mentions() {
      return [];
    }

    /**
     * URL to the channel icon
     */
    get iconURL() {
      return client.generateFileURL(this.icon ?? this.recipient?.avatar, {
        max_side: 256,
      });
    }

    /**
     * URL to a small variant of the channel icon
     */
    get smallIconURL() {
      return client.generateFileURL(this.icon ?? this.recipient?.avatar, {
        max_side: 64,
      });
    }

    /**
     * URL to the animated channel icon
     */
    get animatedIconURL() {
      return client.generateFileURL(
        this.icon ?? this.recipient?.avatar,
        { max_side: 256 },
        true
      );
    }

    /**
     * Permission the currently authenticated user has against this channel
     */
    get permission() {
      return calculatePermission(client, this);
    }

    /**
     * Check whether we have a given permission in a channel
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
