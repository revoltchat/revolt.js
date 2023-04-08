import { Accessor, Setter, createSignal } from "solid-js";

import EventEmitter from "eventemitter3";
import { API, Metadata, RelationshipStatus, Role } from "revolt-api";
import type { DataLogin, RevoltConfig } from "revolt-api";

import { Channel, Emoji, Message, Server, ServerMember, User } from "./classes";
import {
  ChannelCollection,
  EmojiCollection,
  MessageCollection,
  ServerCollection,
  ServerMemberCollection,
  UserCollection,
} from "./collections";
import { ConnectionState, EventClient } from "./events/client";
import { handleEvent } from "./events/v1";
import {
  HydratedChannel,
  HydratedEmoji,
  HydratedMessage,
  HydratedServer,
  HydratedServerMember,
  HydratedUser,
} from "./hydration";

export type Session = { _id: string; token: string; user_id: string } | string;

/**
 * Events provided by the client
 */
type Events = {
  error(error: Error): void;

  connected(): void;
  connecting(): void;
  disconnected(): void;
  ready(): void;
  logout(): void;

  messageCreate(message: Message): void;
  messageUpdate(message: Message, previousMessage: HydratedMessage): void;
  messageDelete(message: HydratedMessage): void;
  messageDeleteBulk(messages: HydratedMessage[], channel?: Channel): void;
  messageReactionAdd(message: Message, userId: string, emoji: string): void;
  messageReactionRemove(message: Message, userId: string, emoji: string): void;
  messageReactionRemoveEmoji(message: Message, emoji: string): void;

  channelCreate(channel: Channel): void;
  channelUpdate(channel: Channel, previousChannel: HydratedChannel): void;
  channelDelete(channel: HydratedChannel): void;
  channelGroupJoin(channel: Channel, user: User): void;
  channelGroupLeave(channel: Channel, user?: User): void;
  channelStartTyping(channel: Channel, user?: User): void;
  channelStopTyping(channel: Channel, user?: User): void;
  channelAcknowledged(channel: Channel, messageId: string): void;

  serverCreate(server: Server): void;
  serverUpdate(server: Server, previousServer: HydratedServer): void;
  serverDelete(server: HydratedServer): void;
  serverRoleUpdate(server: Server, roleId: string, previousRole: Role): void;
  serverRoleDelete(server: Server, roleId: string, role: Role): void;

  serverMemberUpdate(
    member: ServerMember,
    previousMember: HydratedServerMember
  ): void;
  serverMemberJoin(member: ServerMember): void;
  serverMemberLeave(member: HydratedServerMember): void;

  userUpdate(user: User, previousUser: HydratedUser): void;
  // ^ userRelationshipChanged(user: User, previousRelationship: RelationshipStatus): void;
  // ^ userPresenceChanged(user: User, previousPresence: boolean): void;
  userSettingsUpdate(
    id: string,
    update: Record<string, [number, string]>
  ): void;

  emojiCreate(emoji: Emoji): void;
  emojiDelete(emoji: HydratedEmoji): void;
};

/**
 * Client options object
 */
export interface ClientOptions {
  baseURL: string;

  /**
   * Whether to allow partial objects to emit from events.
   */
  partials: boolean;
}

/**
 * Revolt.js Clients
 */
export class Client extends EventEmitter<Events> {
  readonly channels;
  readonly emojis;
  readonly messages;
  readonly users;
  readonly servers;
  readonly serverMembers;

  readonly api: API;
  readonly options: ClientOptions;
  readonly events: EventClient<1>;

  configuration: RevoltConfig | undefined;
  session: Session | undefined;
  user: User | undefined;

  readonly ready: Accessor<boolean>;
  #setReady: Setter<boolean>;

  /**
   * Create Revolt.js Client
   */
  constructor(options?: Partial<ClientOptions>) {
    super();

    this.options = {
      baseURL: "https://api.revolt.chat",
      partials: false,
      ...options,
    };

    this.api = new API({
      baseURL: this.options.baseURL,
    });

    const [ready, setReady] = createSignal(false);
    this.ready = ready;
    this.#setReady = setReady;

    this.channels = new ChannelCollection(this);
    this.emojis = new EmojiCollection(this);
    this.messages = new MessageCollection(this);
    this.users = new UserCollection(this);
    this.servers = new ServerCollection(this);
    this.serverMembers = new ServerMemberCollection(this);

    this.events = new EventClient(1);
    this.events.on("error", (error) => this.emit("error", error));
    this.events.on("state", (state) => {
      console.info("[state]", state);
      switch (state) {
        case ConnectionState.Connected:
          this.emit("connected");
          break;
        case ConnectionState.Connecting:
          this.emit("connecting");
          break;
        case ConnectionState.Disconnected:
          this.emit("disconnected");
          setTimeout(() => this.connect(), 10000);
          break;
      }
    });

    this.events.on("event", (event) =>
      handleEvent(this, event, this.#setReady)
    );
  }

  /**
   * Connect to Revolt
   */
  connect() {
    this.events.disconnect();
    this.#setReady(false);
    this.events.connect(
      "wss://ws.revolt.chat",
      typeof this.session === "string" ? this.session : this.session!.token
    );
  }

  /**
   * Fetches the configuration of the server if it has not been already fetched.
   */
  async #fetchConfiguration() {
    if (!this.configuration) {
      this.configuration = await this.api.get("/");
    }
  }

  /**
   * Update API object to use authentication.
   */
  #updateHeaders() {
    (this.api as API) = new API({
      baseURL: this.options.baseURL,
      authentication: {
        revolt: this.session,
      },
    });
  }

  /**
   * Log in with auth data, creating a new session in the process.
   * @param details Login data object
   * @returns An on-boarding function if on-boarding is required, undefined otherwise
   */
  async login(details: DataLogin) {
    await this.#fetchConfiguration();
    const data = await this.api.post("/auth/session/login", details);
    if (data.result === "Success") {
      this.session = data;
      // TODO: return await this.connect();
    } else {
      throw "MFA not implemented!";
    }
  }

  /**
   * Use an existing session to log into Revolt.
   * @param session Session data object
   * @returns An on-boarding function if on-boarding is required, undefined otherwise
   */
  async useExistingSession(session: Session) {
    await this.#fetchConfiguration();
    this.session = session;
    this.#updateHeaders();
    this.connect();
  }

  /**
   * Log in as a bot.
   * @param token Bot token
   */
  async loginBot(token: string) {
    await this.#fetchConfiguration();
    this.session = token;
    this.#updateHeaders();
    this.connect();
  }

  /**
   * Creates a URL to a given file with given options.
   * @param attachment Partial of attachment object
   * @param options Optional query parameters to modify object
   * @param allowAnimation Returns GIF if applicable, no operations occur on image
   * @param fallback Fallback URL
   * @returns Generated URL or nothing
   */
  createFileURL(
    attachment?: {
      tag: string;
      _id: string;
      content_type?: string;
      metadata?: Metadata;
    },
    ...args: FileArgs
  ) {
    const [options, allowAnimation, fallback] = args;

    const autumn = this.configuration?.features.autumn;
    if (!autumn?.enabled) return fallback;
    if (!attachment) return fallback;

    const { tag, _id, content_type, metadata } = attachment;

    // TODO: server-side
    if (metadata?.type === "Image") {
      if (
        Math.min(metadata.width, metadata.height) <= 0 ||
        (content_type === "image/gif" &&
          Math.max(metadata.width, metadata.height) >= 4096)
      )
        return fallback;
    }

    let query = "";
    if (options) {
      if (!allowAnimation || content_type !== "image/gif") {
        query =
          "?" +
          Object.keys(options)
            .map((k) => `${k}=${options[k as keyof FileArgs[0]]}`)
            .join("&");
      }
    }

    return `${autumn.url}/${tag}/${_id}${query}`;
  }

  /**
   * Proxy a file through January.
   * @param url URL to proxy
   * @returns Proxied media URL
   */
  proxyFile(url: string): string | undefined {
    if (this.configuration?.features.january.enabled) {
      return `${
        this.configuration.features.january.url
      }/proxy?url=${encodeURIComponent(url)}`;
    }
  }
}

export type FileArgs = [
  options?: {
    max_side?: number;
    size?: number;
    width?: number;
    height?: number;
  },
  allowAnimation?: boolean,
  fallback?: string
];
