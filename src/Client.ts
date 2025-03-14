import { AsyncEventEmitter } from "@vladfrangu/async_event_emitter";
import type { DataLogin, RevoltConfig } from "revolt-api";
import { API, type Role } from "revolt-api";

import type { Channel } from "./classes/Channel.js";
import type { Emoji } from "./classes/Emoji.js";
import type { Message } from "./classes/Message.js";
import type { Server } from "./classes/Server.js";
import type { ServerMember } from "./classes/ServerMember.js";
import type { User } from "./classes/User.js";
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
  type EventClientOptions,
} from "./events/EventClient.js";
import { handleEvent } from "./events/v1.js";
import type { HydratedChannel } from "./hydration/channel.js";
import type { HydratedEmoji } from "./hydration/emoji.js";
import type { HydratedMessage } from "./hydration/message.js";
import type { HydratedServer } from "./hydration/server.js";
import type { HydratedServerMember } from "./hydration/serverMember.js";
import type { HydratedUser } from "./hydration/user.js";
import { RE_CHANNELS, RE_MENTIONS, RE_SPOILER } from "./lib/regex.js";

export type Session = { _id: string; token: string; user_id: string } | string;

/**
 * Events provided by the client
 */
export type Events = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: [any];

  connected: [];
  connecting: [];
  disconnected: [];
  ready: [];
  logout: [];

  messageCreate: [Message];
  messageUpdate: [Message, HydratedMessage];
  messageDelete: [HydratedMessage];
  messageDeleteBulk: [HydratedMessage[], Channel?];
  messageReactionAdd: [Message, string, string];
  messageReactionRemove: [Message, string, string];
  messageReactionRemoveEmoji: [Message, string];

  channelCreate: [Channel];
  channelUpdate: [Channel, HydratedChannel];
  channelDelete: [HydratedChannel];
  channelGroupJoin: [Channel, User];
  channelGroupLeave: [Channel, User?];
  channelStartTyping: [Channel, User?];
  channelStopTyping: [Channel, User?];
  channelAcknowledged: [Channel, string];

  serverCreate: [Server];
  serverUpdate: [Server, HydratedServer];
  serverDelete: [HydratedServer];
  serverLeave: [HydratedServer];
  serverRoleUpdate: [Server, string, Role];
  serverRoleDelete: [Server, string, Role];

  serverMemberUpdate: [ServerMember, HydratedServerMember];
  serverMemberJoin: [ServerMember];
  serverMemberLeave: [HydratedServerMember];

  userUpdate: [User, HydratedUser];
  // ^ userRelationshipChanged(user: User, previousRelationship: RelationshipStatus): void;
  // ^ userPresenceChanged(user: User, previousPresence: boolean): void;
  userSettingsUpdate: [string, Record<string, [number, string]>];

  emojiCreate: [Emoji];
  emojiDelete: [HydratedEmoji];
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
export class Client extends AsyncEventEmitter<Events> {
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
  get ready(): boolean {
    return this.#ready;
  }

  /**
   * Set whether the client is ready
   */
  #setReady(value: boolean): void {
    this.#ready = value;
  }

  /**
   * Current session id
   */
  get sessionId(): string | undefined {
    return typeof this.#session === "string" ? undefined : this.#session?._id;
  }

  /**
   * Get authentication header
   */
  get authenticationHeader(): string[] {
    return typeof this.#session === "string"
      ? ["X-Bot-Token", this.#session]
      : ["X-Session-Token", this.#session?.token as string];
  }

  /**
   * Connect to Revolt
   */
  connect(): void {
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
  async #fetchConfiguration(): Promise<void> {
    if (!this.configuration) {
      this.configuration = await this.api.get("/");
    }
  }

  /**
   * Update API object to use authentication.
   */
  #updateHeaders(): void {
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
  async login(details: DataLogin): Promise<void> {
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
  async useExistingSession(session: Session): Promise<void> {
    this.#session = session;
    this.#updateHeaders();
  }

  /**
   * Log in as a bot
   * @param token Bot token
   */
  async loginBot(token: string): Promise<void> {
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
  markdownToText(source: string): string {
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
