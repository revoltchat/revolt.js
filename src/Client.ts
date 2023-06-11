import EventEmitter from "eventemitter3";
import defaultsDeep from "lodash.defaultsdeep";
import { action, makeObservable, observable } from "mobx";
import type {
    DataCreateAccount,
    DataLogin,
    DataOnboard,
    InviteResponse,
} from "revolt-api";
import type { RevoltConfig, Metadata } from "revolt-api";
import { API, MemberCompositeKey, Role } from "revolt-api";

import Bots from "./maps/Bots";
import Channels, { Channel } from "./maps/Channels";
import Members, { Member } from "./maps/Members";
import Messages, { Message } from "./maps/Messages";
import Servers, { Server } from "./maps/Servers";
import Users, { User } from "./maps/Users";
import Emojis, { Emoji } from "./maps/Emojis";

import { WebSocketClient } from "./websocket/client";
import { ClientboundNotification } from "./websocket/notifications";

import { defaultConfig } from "./config";
import { Nullable } from "./util/null";
import Unreads from "./util/Unreads";

/**
 * Client options object
 */
export interface ClientOptions {
    apiURL: string;
    debug: boolean;

    cache: boolean;
    unreads: boolean;

    heartbeat: number;
    autoReconnect: boolean;

    /**
     * Automatically reconnect the client if no
     * `pong` is received after X seconds of sending a `ping`.
     * This is a temporary fix for an issue where the client
     * would randomly stop receiving websocket messages.
     */
    pongTimeout?: number;

    /**
     * If `pongTimeout` is set, this decides what to do when
     * the timeout is triggered. Default is `RECONNECT`.
     */
    onPongTimeout?: "EXIT" | "RECONNECT";

    ackRateLimiter: boolean;
}

export declare interface Client {
    on(event: "connected", listener: () => void): this;
    on(event: "connecting", listener: () => void): this;
    on(event: "dropped", listener: () => void): this;
    on(event: "ready", listener: () => void): this;
    on(event: "logout", listener: () => void): this;
    on(
        event: "packet",
        listener: (packet: ClientboundNotification) => void,
    ): this;

    on(event: "message", listener: (message: Message) => void): this;
    on(event: "message/update", listener: (message: Message) => void): this;
    on(
        event: "message/delete",
        listener: (id: string, message?: Message) => void,
    ): this;

    // General purpose event
    on(
        event: "message/updated",
        listener: (message: Message, packet: ClientboundNotification) => void,
    ): this;

    on(event: "channel/create", listener: (channel: Channel) => void): this;
    on(event: "channel/update", listener: (channel: Channel) => void): this;
    on(
        event: "channel/delete",
        listener: (id: string, channel?: Channel) => void,
    ): this;

    on(event: "server/update", listener: (server: Server) => void): this;
    on(
        event: "server/delete",
        listener: (id: string, server?: Server) => void,
    ): this;

    on(
        event: "role/update",
        listener: (roleId: string, role: Role, serverId: string) => void,
    ): this;
    on(
        event: "role/delete",
        listener: (id: string, serverId: string) => void,
    ): this;

    on(event: "member/join", listener: (member: Member) => void): this;
    on(event: "member/update", listener: (member: Member) => void): this;
    on(event: "member/leave", listener: (id: MemberCompositeKey) => void): this;

    on(event: "user/relationship", listener: (user: User) => void): this;

    on(event: "emoji/create", listener: (emoji: Emoji) => void): this;
    on(
        event: "emoji/delete",
        listener: (id: string, emoji?: Emoji) => void,
    ): this;
}

/**
 * Regular expression for mentions.
 */
export const RE_MENTIONS = /<@([A-z0-9]{26})>/g;

/**
 * Regular expression for spoilers.
 */
export const RE_SPOILER = /!!.+!!/g;

export type FileArgs = [
    options?: {
        max_side?: number;
        size?: number;
        width?: number;
        height?: number;
    },
    allowAnimation?: boolean,
    fallback?: string,
];

export type Session = { token: string };

export class Client extends EventEmitter {
    heartbeat: number;

    api: API;
    session?: Session | string;
    user: Nullable<User> = null;

    options: ClientOptions;
    websocket: WebSocketClient;
    configuration?: RevoltConfig;

    users: Users;
    channels: Channels;
    servers: Servers;
    members: Members;
    messages: Messages;
    bots: Bots;
    emojis: Emojis;

    unreads?: Unreads;

    constructor(options: Partial<ClientOptions> = {}) {
        super();

        this.users = new Users(this);
        this.channels = new Channels(this);
        this.servers = new Servers(this);
        this.members = new Members(this);
        this.messages = new Messages(this);
        this.bots = new Bots(this);
        this.emojis = new Emojis(this);

        makeObservable(
            this,
            {
                user: observable,
                users: observable,
                channels: observable,
                servers: observable,
                members: observable,
                messages: observable,
                emojis: observable,
                reset: action,
            },
            {
                proxy: false,
            },
        );

        this.options = defaultsDeep(options, defaultConfig);
        if (this.options.cache) throw "Cache is not supported yet.";

        if (this.options.unreads) {
            this.unreads = new Unreads(this);
        }

        this.api = new API({ baseURL: this.apiURL });
        this.websocket = new WebSocketClient(this);
        this.heartbeat = this.options.heartbeat;

        this.proxyFile = this.proxyFile.bind(this);
    }

    /**
     * ? Configuration.
     */

    /**
     * Get the current API base URL.
     */
    get apiURL() {
        return this.options.apiURL;
    }

    /**
     * Whether debug mode is turned on.
     */
    get debug() {
        return this.options.debug;
    }

    /**
     * Whether revolt.js should auto-reconnect
     */
    get autoReconnect() {
        return this.options.autoReconnect;
    }

    /**
     * ? Authentication and connection.
     */

    /**
     * Fetches the configuration of the server.
     *
     * @remarks
     * Unlike `fetchConfiguration`, this function also fetches the
     * configuration if it has already been fetched before.
     */
    async connect() {
        this.configuration = await this.api.get("/");
    }

    /**
     * Fetches the configuration of the server if it has not been already fetched.
     */
    async fetchConfiguration() {
        if (!this.configuration) await this.connect();
    }

    /**
     * Update API object to use authentication.
     */
    private $updateHeaders() {
        this.api = new API({
            baseURL: this.apiURL,
            authentication: {
                revolt: this.session,
            },
        });
    }

    /**
     * Log in with auth data, creating a new session in the process.
     * @param details Login data object
     * @returns An onboarding function if onboarding is required, undefined otherwise
     */
    async login(details: DataLogin) {
        await this.fetchConfiguration();
        const data = await this.api.post("/auth/session/login", details);
        if (data.result === "Success") {
            this.session = data;
            return await this.$connect();
        } else {
            throw "MFA not implemented!";
        }
    }

    /**
     * Use an existing session to log into Revolt.
     * @param session Session data object
     * @returns An onboarding function if onboarding is required, undefined otherwise
     */
    async useExistingSession(session: Session) {
        await this.fetchConfiguration();
        this.session = session;
        return await this.$connect();
    }

    /**
     * Log in as a bot.
     * @param token Bot token
     */
    async loginBot(token: string) {
        await this.fetchConfiguration();
        this.session = token;
        this.$updateHeaders();
        return await this.websocket.connect();
    }

    /**
     * Check onboarding status and connect to notifications service.
     * @returns
     */
    private async $connect() {
        this.$updateHeaders();
        const { onboarding } = await this.api.get("/onboard/hello");
        if (onboarding) {
            return (username: string, loginAfterSuccess?: boolean) =>
                this.completeOnboarding({ username }, loginAfterSuccess);
        }

        await this.websocket.connect();
    }

    /**
     * Finish onboarding for a user, for example by providing a username.
     * @param data Onboarding data object
     * @param loginAfterSuccess Defines whether to automatically log in and connect after onboarding finishes
     */
    async completeOnboarding(data: DataOnboard, loginAfterSuccess?: boolean) {
        await this.api.post("/onboard/complete", data);
        if (loginAfterSuccess) {
            await this.websocket.connect();
        }
    }

    /**
     * ? Miscellaneous API routes.
     */

    /**
     * Fetch information about a given invite code.
     * @param code The invite code.
     * @returns Invite information.
     */
    async fetchInvite(code: string) {
        return await this.api.get(`/invites/${code as ""}`);
    }

    async joinInvite(code: string): Promise<Server>;
    async joinInvite(invite: InviteResponse): Promise<Server>;

    /**
     * Use an invite.
     * @param invite Invite
     * @returns Data provided by invite.
     */
    async joinInvite(invite: string | InviteResponse) {
        const code = typeof invite === "string" ? invite : invite.code;

        if (typeof invite === "object") {
            switch (invite.type) {
                case "Group": {
                    const group = this.channels.get(invite.channel_id);
                    if (group) return group;
                    break;
                }
                case "Server": {
                    const server = this.servers.get(invite.server_id);
                    if (server) return server;
                }
            }
        }

        const response = await this.api.post(`/invites/${code}`);
        if (response.type === "Server") {
            return await this.servers.fetch(
                response.server._id,
                response.server,
                response.channels,
            );
        } else {
            throw "Unsupported invite type.";
        }
    }

    /**
     * Delete an invite.
     * @param code The invite code.
     */
    async deleteInvite(code: string) {
        await this.api.delete(`/invites/${code as ""}`);
    }

    /**
     * Fetch user settings for current user.
     * @param keys Settings keys to fetch, leave blank to fetch full object.
     * @returns Key-value object of settings.
     */
    async syncFetchSettings(keys: string[]) {
        return await this.api.post("/sync/settings/fetch", { keys });
    }

    /**
     * Set user settings for current user.
     * @param data Data to set as an object. Any non-string values will be automatically serialised.
     * @param timestamp Timestamp to use for the current revision.
     */
    async syncSetSettings(
        data: { [key: string]: object | string },
        timestamp?: number,
    ) {
        const requestData: { [key: string]: string } = {};
        for (const key of Object.keys(data)) {
            const value = data[key];
            requestData[key] =
                typeof value === "string" ? value : JSON.stringify(value);
        }

        await this.api.post(`/sync/settings/set`, {
            ...requestData,
            timestamp,
        });
    }

    /**
     * Fetch user unreads for current user.
     * @returns Array of channel unreads.
     */
    async syncFetchUnreads() {
        return await this.api.get("/sync/unreads");
    }

    /**
     * ? Utility functions.
     */

    /**
     * Log out of Revolt. Disconnect the WebSocket, request a session invalidation and reset the client.
     */
    async logout(avoidRequest?: boolean) {
        this.user = null;
        this.emit("logout");
        !avoidRequest && (await this.api.post("/auth/session/logout"));
        this.reset();
    }

    /**
     * Reset the client by setting properties to their original value or deleting them entirely.
     * Disconnects the current WebSocket.
     */
    reset() {
        this.user = null;
        this.websocket.disconnect();
        delete this.session;

        this.users = new Users(this);
        this.channels = new Channels(this);
        this.servers = new Servers(this);
        this.members = new Members(this);
        this.messages = new Messages(this);
        this.emojis = new Emojis(this);
    }

    /**
     * Register for a new account.
     * @param data Registration data object
     * @returns A promise containing a registration response object
     */
    register(data: DataCreateAccount) {
        return this.api.post("/auth/account/create", data);
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
                    return `${user.display_name ?? user.username}`;
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
            return `${
                this.configuration.features.january.url
            }/proxy?url=${encodeURIComponent(url)}`;
        }
    }

    /**
     * Generates a URL to a given file with given options.
     * @param attachment Partial of attachment object
     * @param options Optional query parameters to modify object
     * @param allowAnimation Returns GIF if applicable, no operations occur on image
     * @param fallback Fallback URL
     * @returns Generated URL or nothing
     */
    generateFileURL(
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

        // ! FIXME: These limits should be done on Autumn.
        if (metadata?.type === "Image") {
            if (
                Math.min(metadata.width, metadata.height) <= 0 ||
                (content_type === "image/gif" &&
                    Math.max(metadata.width, metadata.height) >= 1024)
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
}
