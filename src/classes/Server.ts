import type { Category } from "revolt-api";
import { decodeTime } from "ulid";

import { ServerCollection } from "../collections";
import { bitwiseAndEq, calculatePermission } from "../permissions/calculator";
import { Permission } from "../permissions/definitions";

import { Channel } from "./Channel";

/**
 * Server Class
 */
export class Server {
  readonly collection: ServerCollection;
  readonly id: string;

  /**
   * Construct Server
   * @param collection Collection
   * @param id Id
   */
  constructor(collection: ServerCollection, id: string) {
    this.collection = collection;
    this.id = id;
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
    return this.collection.getUnderlyingObject(this.id).ownerId;
  }

  /**
   * Owner
   */
  get owner() {
    return this.collection.client.users.get(
      this.collection.getUnderlyingObject(this.id).ownerId
    );
  }

  /**
   * Name
   */
  get name() {
    return this.collection.getUnderlyingObject(this.id).name;
  }

  /**
   * Description
   */
  get description() {
    return this.collection.getUnderlyingObject(this.id).description;
  }

  /**
   * Icon
   */
  get icon() {
    return this.collection.getUnderlyingObject(this.id).icon;
  }

  /**
   * Banner
   */
  get banner() {
    return this.collection.getUnderlyingObject(this.id).banner;
  }

  /**
   * Channel IDs
   */
  get channelIds() {
    return this.collection.getUnderlyingObject(this.id).channelIds;
  }

  /**
   * Channels
   */
  get channels() {
    return [...this.collection.getUnderlyingObject(this.id).channelIds.values()]
      .map((id) => this.collection.client.channels.get(id)!)
      .filter((x) => x);
  }

  /**
   * Categories
   */
  get categories() {
    return this.collection.getUnderlyingObject(this.id).categories;
  }

  /**
   * System message channels
   */
  get systemMessages() {
    return this.collection.getUnderlyingObject(this.id).systemMessages;
  }

  /**
   * Roles
   */
  get roles() {
    return this.collection.getUnderlyingObject(this.id).roles;
  }

  /**
   * Default permissions
   */
  get defaultPermissions() {
    return this.collection.getUnderlyingObject(this.id).defaultPermissions;
  }

  /**
   * Server flags
   */
  get flags() {
    return this.collection.getUnderlyingObject(this.id).flags;
  }

  /**
   * Whether analytics are enabled for this server
   */
  get analytics() {
    return this.collection.getUnderlyingObject(this.id).analytics;
  }

  /**
   * Whether this server is publicly discoverable
   */
  get discoverable() {
    return this.collection.getUnderlyingObject(this.id).discoverable;
  }

  /**
   * Whether this server is marked as mature
   */
  get mature() {
    return this.collection.getUnderlyingObject(this.id).nsfw;
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
            channels.push(this.collection.client.channels.get(key)!);
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
        (key) => this.collection.client.channels.get(key)!
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
    return this.orderedChannels.find((cat) => cat.channels.length)?.channels[0];
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
    return this.collection.client.createFileURL(this.icon, { max_side: 256 });
  }

  /**
   * URL to the server's animated icon
   */
  get animatedIconURL() {
    return this.collection.client.createFileURL(
      this.icon,
      { max_side: 256 },
      true
    );
  }

  /**
   * URL to the server's banner
   */
  get bannerURL() {
    return this.collection.client.createFileURL(this.banner, {
      max_side: 256,
    });
  }

  /**
   * Own member object for this server
   */
  get member() {
    return this.collection.client.serverMembers.getByKey({
      server: this.id,
      user: this.collection.client.user!.id,
    });
  }

  /**
   * Permission the currently authenticated user has against this server
   */
  get permission() {
    return calculatePermission(this.collection.client, this);
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
}
