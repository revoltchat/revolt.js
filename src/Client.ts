import { API } from "revolt-api";
import type { DataLogin, RevoltConfig } from "revolt-api";

import channelClassFactory from "./classes/Channel";
import emojiClassFactory from "./classes/Emoji";
import serverClassFactory from "./classes/Server";
import serverMemberClassFactory from "./classes/ServerMember";
import userClassFactory from "./classes/User";
import { EventClient, createEventClient } from "./events/client";

// eslint-disable-next-line
type Obj<T extends (...args: any) => any> = InstanceType<ReturnType<T>>;

export type Emoji = Obj<typeof emojiClassFactory>;
export type Channel = Obj<typeof channelClassFactory>;
export type Server = Obj<typeof serverClassFactory>;
export type ServerMember = Obj<typeof serverMemberClassFactory>;
export type User = Obj<typeof userClassFactory>;
export type Session = { token: string } | string;

/**
 * Revolt.js Client
 */
export class Client {
  #Emoji = emojiClassFactory(this);
  #Channel = channelClassFactory(this);
  #User = userClassFactory(this);
  #Server = serverClassFactory(this);
  #ServerMember = serverMemberClassFactory(this);

  readonly emojis = this.#Emoji;
  readonly channels = this.#Channel;
  readonly users = this.#User;
  readonly servers = this.#Server;
  readonly serverMembers = this.#ServerMember;

  readonly api: API;
  readonly baseURL: string;
  readonly events: EventClient<1>;

  configuration: RevoltConfig | undefined;
  session: Session | undefined;

  /**
   * Create Revolt.js Client
   */
  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.api = new API({
      baseURL,
    });

    this.events = createEventClient(1);
  }

  /**
   * Connect
   */
  connect() {
    this.events.on("event", (event) => {
      console.info("[EVENT]", JSON.stringify(event).substring(0, 32));
      if (event.type === "Ready") {
        console.time("load users");
        for (const user of event.users) {
          new this.#User(user._id, user);
        }
        console.timeEnd("load users");
        console.time("load servers");
        for (const server of event.servers) {
          new this.#Server(server._id, server);
        }
        console.timeEnd("load servers");
        console.time("load memberships");
        for (const member of event.members) {
          new this.#ServerMember(member._id, member);
        }
        console.timeEnd("load memberships");
        console.time("load channels");
        for (const channel of event.channels) {
          new this.#Channel(channel._id, channel);
        }
        console.timeEnd("load channels");
        console.time("load emojis");
        for (const emoji of event.emojis) {
          new this.#Emoji(emoji._id, emoji);
        }
        console.timeEnd("load emojis");

        const lounge = this.servers.get("01F7ZSBSFHQ8TA81725KQCSDDP")!;
        console.info(
          `The owner of ${lounge.name} is ${lounge.owner!.username}!`
        );
        console.log(lounge.owner);
        console.log(
          "It has the channels:",
          lounge.channels.map((channel) => channel.name)
        );
        console.log(
          "They joined at:",
          this.serverMembers.get({ server: lounge.id, user: lounge.owner!.id })
            ?.joinedAt
        );
      }
    });

    this.events.on("state", (state) => console.info("STATE =", state));
    this.events.on("error", (error) => console.error("ERROR =", error));

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
      baseURL: this.baseURL,
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
}
