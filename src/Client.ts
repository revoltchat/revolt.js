import EventEmitter from "eventemitter3";
import type { DataLogin, RevoltConfig } from "revolt-api";
import { API, Role } from "revolt-api";

import { Channel } from "./classes/Channel.js";
import { Emoji } from "./classes/Emoji.js";
import { Message } from "./classes/Message.js";
import { Server } from "./classes/Server.js";
import { ServerMember } from "./classes/ServerMember.js";
import { User } from "./classes/User.js";
import { AccountCollection } from "./collections/AccountCollection.js";
import { BotCollection } from "./collections/BotCollection.js";
import { ChannelCollection } from "./collections/ChannelCollection.js";
import { ChannelUnreadCollection } from "./collections/ChannelUnreadCollection.js";
import { ChannelWebhookCollection } from "./collections/ChannelWebhookCollection.js";
import { EmojiCollection } from "./collections/EmojiCollection.js";
import { MessageCollection } from "./collections/MessageCollection.js";
import { ServerCollection } from "./collections/ServerCollection.js";
import { ServerMemberCollection } from "./collections/ServerMemberCollection.js";
import { SessionCollection } from "./collections/SessionCollection.js";
import { UserCollection } from "./collections/UserCollection.js";
import {
  ConnectionState,
  EventClient,
  EventClientOptions,
} from "./events/EventClient.js";
import { handleEvent } from "./events/v1.js";
import { HydratedChannel } from "./hydration/channel.js";
import { HydratedEmoji } from "./hydration/emoji.js";
import { HydratedMessage } from "./hydration/message.js";
import { HydratedServer } from "./hydration/server.js";
import { HydratedServerMember } from "./hydration/serverMember.js";
import { HydratedUser } from "./hydration/user.js";
import { RE_CHANNELS, RE_MENTIONS, RE_SPOILER } from "./lib/regex.js";

export type Session = { _id: string; token: string; user_id: string } | string;

/**
 * Events provided by the client
 */
export type Events = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error(error: any): void;

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
  serverLeave(server: HydratedServer): void;
  serverRoleUpdate(server: Server, roleId: string, previousRole: Role): void;
  serverRoleDelete(server: Server, roleId: string, role: Role): void;

  serverMemberUpdate(
    member: ServerMember,
    previousMember: HydratedServerMember,
  ): void;
  serverMemberJoin(member: ServerMember): void;
  serverMemberLeave(member: HydratedServerMember): void;

  userUpdate(user: User, previousUser: HydratedUser): void;
  // ^ userRelationshipChanged(user: User, previousRelationship: RelationshipStatus): void;
  // ^ userPresenceChanged(user: User, previousPresence: boolean): void;
  userSettingsUpdate(
    id: string,
    update: Record<string, [number, string]>,
  ): void;

  emojiCreate(emoji: Emoji): void;
  emojiDelete(emoji: HydratedEmoji): void;
};

/**
 * Client options object
 */
export type ClientOptions = Partial<EventClientOptions> & {
  /**
   * Base URL of the API server
   */
  baseURL: string;

  /**
   * Whether to allow partial objects to emit from events
   * @default false
   */
  partials: boolean;

  /**
   * Whether to eagerly fetch users and members for incoming events
   * @default true
   * @deprecated
   */
  eagerFetching: boolean;

  /**
   * Whether to automatically sync unreads information
   * @default false
   */
  syncUnreads: boolean;

  /**
   * Whether to reconnect when disconnected
   * @default true
   */
  autoReconnect: boolean;

  /**
   * Whether to rewrite sent messages that include identifiers such as @silent
   * @default true
   */
  messageRewrites: boolean;

  /**
   * Retry delay function
   * @param retryCount Count
   * @returns Delay in seconds
   * @default (2^x-1) ±20%
   */
  retryDelayFunction(retryCount: number): number;

  /**
   * Check whether a channel is muted
   * @param channel Channel
   * @return Whether it is muted
   * @default false
   */
  channelIsMuted(channel: Channel): boolean;
};

/**
 * Revolt.js Clients
 */
export class Client extends EventEmitter<Events> {
  readonly account = new AccountCollection(this);
  readonly bots = new BotCollection(this);
  readonly channels = new ChannelCollection(this);
  readonly channelUnreads = new ChannelUnreadCollection(this);
  readonly channelWebhooks = new ChannelWebhookCollection(this);
  readonly emojis = new EmojiCollection(this);
  readonly messages = new MessageCollection(this);
  readonly servers = new ServerCollection(this);
  readonly serverMembers = new ServerMemberCollection(this);
  readonly sessions = new SessionCollection(this);
  readonly users = new UserCollection(this);

  readonly api: API;
  readonly options: ClientOptions;
  readonly events: EventClient<1>;

  public configuration: RevoltConfig | undefined;
  #session: Session | undefined;
  user: User | undefined;

  #ready = false;
  connectionFailureCount = 0;

  #reconnectTimeout: number | undefined;

  /**
   * Create Revolt.js Client
   */
  constructor(options?: Partial<ClientOptions>, configuration?: RevoltConfig) {
    super();

    this.options = {
      baseURL: "https://api.revolt.chat",
      partials: false,
      eagerFetching: true,
      syncUnreads: false,
      autoReconnect: true,
      messageRewrites: true,
      /**
       * Retry delay function
       * @param retryCount Count
       * @returns Delay in seconds
       */
      retryDelayFunction(retryCount) {
        return (Math.pow(2, retryCount) - 1) * (0.8 + Math.random() * 0.4);
      },
      /**
       * Check whether a channel is muted
       * @param channel Channel
       * @return Whether it is muted
       */
      channelIsMuted() {
        return false;
      },
      ...options,
    };

    this.configuration = configuration;

    this.api = new API({
      baseURL: this.options.baseURL,
    });

    this.events = new EventClient(1, "json", this.options);
    this.events.on("error", (error) => this.emit("error", error));
    this.events.on("state", (state) => {
      switch (state) {
        case ConnectionState.Connected:
          this.servers.forEach((server) => server.resetSyncStatus());
          this.connectionFailureCount = 0;
          this.emit("connected");
          break;
        case ConnectionState.Connecting:
          this.emit("connecting");
          break;
        case ConnectionState.Disconnected:
          this.emit("disconnected");
          if (this.options.autoReconnect) {
            this.#reconnectTimeout = setTimeout(
              () => this.connect(),
              this.options.retryDelayFunction(this.connectionFailureCount) *
                1e3,
            ) as never;

            this.connectionFailureCount = this.connectionFailureCount + 1;
          }
          break;
      }
    });

    this.events.on("event", (event) =>
      handleEvent(this, event, this.#setReady.bind(this)),
    );
  }

  /**
   * Whether the client is ready
   */
  get ready() {
    return this.#ready;
  }

  /**
   * Set whether the client is ready
   */
  #setReady(value: boolean) {
    this.#ready = value;
  }

  /**
   * Current session id
   */
  get sessionId() {
    return typeof this.#session === "string" ? undefined : this.#session?._id;
  }

  /**
   * Get authentication header
   */
  get authenticationHeader() {
    return typeof this.#session === "string"
      ? ["X-Bot-Token", this.#session]
      : ["X-Session-Token", this.#session?.token as string];
  }

  /**
   * Connect to Revolt
   */
  connect() {
    clearTimeout(this.#reconnectTimeout);
    this.events.disconnect();
    this.#setReady(false);
    this.events.connect(
      this.configuration?.ws ?? "wss://ws.revolt.chat",
      typeof this.#session === "string" ? this.#session : this.#session!.token,
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
        revolt: this.#session,
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
      this.#session = data;
      // TODO: return await this.connect();
    } else {
      throw "MFA not implemented!";
    }
  }

  /**
   * Use an existing session
   */
  async useExistingSession(session: Session) {
    this.#session = session;
    this.#updateHeaders();
  }

  /**
   * Log in as a bot
   * @param token Bot token
   */
  async loginBot(token: string) {
    await this.#fetchConfiguration();
    this.#session = token;
    this.#updateHeaders();
    this.connect();
  }

  /**
   * Prepare a markdown-based message to be displayed to the user as plain text.
   * @param source Source markdown text
   * @returns Modified plain text
   */
  markdownToText(source: string) {
    return source
      .replace(RE_MENTIONS, (sub: string, id: string) => {
        const user = this.users.get(id as string);

        if (user) {
          return `@${user.username}`;
        }

        return sub;
      })
      .replace(RE_CHANNELS, (sub: string, id: string) => {
        const channel = this.channels.get(id as string);

        if (channel) {
          return `#${channel.displayName}`;
        }

        return sub;
      })
      .replace(RE_SPOILER, "<spoiler>");
  }

  /**
   * Proxy a file through January.
   * @param url URL to proxy
   * @returns Proxied media URL
   */
  proxyFile(url: string): string | undefined {
    if (this.configuration?.features.january.enabled) {
      return `${this.configuration.features.january.url}/proxy?url=${encodeURIComponent(
        url,
      )}`;
    } else {
      return url;
    }
  }
}
