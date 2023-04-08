import type * as API from "revolt-api";

import { Client } from "..";
import {
  Channel,
  Emoji,
  Message,
  Server,
  ServerMember,
  User,
} from "../classes";
import {
  HydratedChannel,
  HydratedEmoji,
  HydratedMessage,
  HydratedServer,
  HydratedServerMember,
  HydratedUser,
} from "../hydration";

import { StoreCollection } from "./Collection";

class ClassCollection<T, V> extends StoreCollection<T, V> {
  readonly client: Client;

  constructor(client: Client) {
    super();
    this.client = client;
  }
}

export class ChannelCollection extends ClassCollection<
  Channel,
  HydratedChannel
> {
  /**
   * Delete an object
   * @param id Id
   */
  override delete(id: string): void {
    let channel = this.get(id);
    channel?.server?.channelIds.delete(id);
    super.delete(id);
  }

  /**
   * Fetch channel by ID
   * @param id Id
   * @returns Channel
   */
  async fetch(id: string): Promise<Channel> {
    const channel = this.get(id);
    if (channel) return channel;
    const data = await this.client.api.get(`/channels/${id as ""}`);
    return this.getOrCreate(data._id, data);
  }

  /**
   * Get or create
   * @param id Id
   * @param data Data
   * @param isNew Whether this object is new
   */
  getOrCreate(id: string, data: API.Channel, isNew = false) {
    if (this.has(id)) {
      return this.get(id)!;
    } else {
      const instance = new Channel(this, id);
      this.create(id, "channel", instance, data);
      isNew && this.client.emit("channelCreate", instance);
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
      const instance = new Channel(this, id);
      this.create(id, "channel", instance, {
        id,
        partial: true,
      });
      return instance;
    }
  }
}

export class EmojiCollection extends ClassCollection<Emoji, HydratedEmoji> {
  /**
   * Fetch emoji by ID
   * @param id Id
   * @returns Emoji
   */
  async fetch(id: string): Promise<Emoji> {
    const emoji = this.get(id);
    if (emoji) return emoji;
    const data = await this.client.api.get(`/custom/emoji/${id as ""}`);
    return this.getOrCreate(data._id, data);
  }

  /**
   * Get or create
   * @param id Id
   * @param data Data
   * @param isNew Whether this object is new
   */
  getOrCreate(id: string, data: API.Emoji, isNew = false) {
    if (this.has(id)) {
      return this.get(id)!;
    } else {
      const instance = new Emoji(this, id);
      this.create(id, "emoji", instance, data);
      isNew && this.client.emit("emojiCreate", instance);
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
      const instance = new Emoji(this, id);
      this.create(id, "emoji", instance, {
        id,
      });
      return instance;
    }
  }
}

export class MessageCollection extends ClassCollection<
  Message,
  HydratedMessage
> {
  /**
   * Fetch message by Id
   * @param channelId Channel Id
   * @param messageId Message Id
   * @returns Message
   */
  async fetch(channelId: string, messageId: string): Promise<Message> {
    const message = this.get(messageId);
    if (message) return message;

    const data = await this.client.api.get(
      `/channels/${channelId as ""}/messages/${messageId as ""}`
    );

    return this.getOrCreate(data._id, data, false);
  }

  /**
   * Get or create
   * @param id Id
   * @param data Data
   * @param isNew Whether this object is new
   */
  getOrCreate(id: string, data: API.Message, isNew = false) {
    if (this.has(id)) {
      return this.get(id)!;
    } else {
      const instance = new Message(this, id);
      this.create(id, "message", instance, data);
      isNew && this.client.emit("messageCreate", instance);
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
      const instance = new Message(this, id);
      this.create(id, "message", instance, {
        id,
        partial: true,
      });
      return instance;
    }
  }
}

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

export class UserCollection extends ClassCollection<User, HydratedUser> {
  /**
   * Fetch user by ID
   * @param id Id
   * @returns User
   */
  async fetch(id: string): Promise<User> {
    const user = this.get(id);
    if (user) return user;
    const data = await this.client.api.get(`/users/${id as ""}`);
    return this.getOrCreate(data._id, data);
  }

  /**
   * Get or create
   * @param id Id
   * @param data Data
   * @param isNew Whether this object is new
   */
  getOrCreate(id: string, data: API.User) {
    if (this.has(id)) {
      return this.get(id)!;
    } else {
      const instance = new User(this, id);
      this.create(id, "user", instance, data);
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
      const instance = new User(this, id);
      this.create(id, "user", instance, {
        id,
        partial: true,
      });
      return instance;
    }
  }
}

export class ServerMemberCollection extends ClassCollection<
  ServerMember,
  HydratedServerMember
> {
  /**
   * Check if member exists by composite key
   * @param id Id
   * @returns Whether it exists
   */
  hasByKey(id: API.MemberCompositeKey) {
    return super.has(id.server + id.user);
  }

  /**
   * Get member by composite key
   * @param id Id
   * @returns Member
   */
  getByKey(id: API.MemberCompositeKey) {
    return super.get(id.server + id.user);
  }

  /**
   * Fetch server member by Id
   * @param serverId Server Id
   * @param userId User Id
   * @returns Message
   */
  async fetch(serverId: string, userId: string): Promise<ServerMember> {
    const member = this.get(userId);
    if (member) return member;

    const data = await this.client.api.get(
      `/servers/${serverId as ""}/members/${userId as ""}`
    );

    return this.getOrCreate(data._id, data);
  }

  /**
   * Get or create
   * @param id Id
   * @param data Data
   */
  getOrCreate(id: API.MemberCompositeKey, data: API.Member) {
    if (this.hasByKey(id)) {
      return this.getByKey(id)!;
    } else {
      const instance = new ServerMember(this, id);
      this.create(id.server + id.user, "serverMember", instance, data);
      return instance;
    }
  }

  /**
   * Get or return partial
   * @param id Id
   */
  getOrPartial(id: API.MemberCompositeKey) {
    if (this.hasByKey(id)) {
      return this.getByKey(id)!;
    } else if (this.client.options.partials) {
      const instance = new ServerMember(this, id);
      this.create(id.server + id.user, "serverMember", instance, {
        id,
        partial: true,
      });
      return instance;
    }
  }
}
