import Axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { EventEmitter } from "eventemitter3";
import defaultsDeep from "lodash.defaultsdeep";
import { makeObservable, observable } from "mobx";
import type { Session } from "revolt-api/types/Auth";
import type { SizeOptions } from "revolt-api/types/Autumn";
import type { RevoltConfiguration } from "revolt-api/types/Core";
import { MemberCompositeKey, Role } from "revolt-api/types/Servers";

import { Route, RoutePath, RouteMethod } from "./api/routes";

import Bots from "./maps/Bots";
import Channels, { Channel } from "./maps/Channels";
import Members, { Member } from "./maps/Members";
import Messages, { Message } from "./maps/Messages";
import Servers, { Server } from "./maps/Servers";
import Users, { User } from "./maps/Users";

import { WebSocketClient } from "./websocket/client";
import { ClientboundNotification } from "./websocket/notifications";

import { defaultConfig } from "./config";

/**
 * Client options object
 */
export interface ClientOptions {
    apiURL: string;
    debug: boolean;
    cache: boolean;

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
    on(
        event: "packet",
        listener: (packet: ClientboundNotification) => void,
    ): this;

    on(event: "message", listener: (message: Message) => void): this;
    on(event: "message/update", listener: (message: Message) => void): this;
    on(event: "message/delete", listener: (id: string) => void): this;

    on(event: "channel/create", listener: (channel: Channel) => void): this;
    on(event: "channel/update", listener: (channel: Channel) => void): this;
    on(event: "channel/delete", listener: (id: string) => void): this;

    on(event: "server/update", listener: (server: Server) => void): this;
    on(event: "server/delete", listener: (id: string) => void): this;

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
    options?: SizeOptions,
    allowAnimation?: boolean,
    fallback?: string,
];

export class Client extends EventEmitter {
    heartbeat: number;

    session?: Session | string;
    user?: User;

    options: ClientOptions;
    websocket: WebSocketClient;
    private Axios: AxiosInstance;
    configuration?: RevoltConfiguration;

    users: Users;
    channels: Channels;
    servers: Servers;
    members: Members;
    messages: Messages;
    bots: Bots;

    constructor(options: Partial<ClientOptions> = {}) {
        super();

        this.users = new Users(this);
        this.channels = new Channels(this);
        this.servers = new Servers(this);
        this.members = new Members(this);
        this.messages = new Messages(this);
        this.bots = new Bots(this);

        makeObservable(
            this,
            {
                users: observable,
                channels: observable,
                servers: observable,
                members: observable,
                messages: observable,
            },
            {
                proxy: false,
            },
        );

        this.options = defaultsDeep(options, defaultConfig);
        if (this.options.cache) throw "Cache is not supported yet.";

        this.Axios = Axios.create({ baseURL: this.apiURL });
        this.websocket = new WebSocketClient(this);
        this.heartbeat = this.options.heartbeat;

        if (options.debug) {
            this.Axios.interceptors.request.use((request) => {
                console.debug(
                    "[<]",
                    request.method?.toUpperCase(),
                    request.url,
                );
                return request;
            });

            this.Axios.interceptors.response.use((response) => {
                console.debug(
                    "[>] (" + response.status + ":",
                    response.statusText + ")",
                    JSON.stringify(response.data),
                );
                return response;
            });
        }

        this.on("message", async (message) => {
            const channel = message.channel;
            if (!channel) return;
            if (channel.channel_type === "DirectMessage") {
                channel.active = true;
            }

            channel.last_message_id = message._id;
        });
    }

    /**
     * ? Configuration.
     */

    get apiURL() {
        return this.options.apiURL;
    }

    get debug() {
        return this.options.debug;
    }

    get autoReconnect() {
        return this.options.autoReconnect;
    }

    /**
     * ? Axios request wrapper.
     */

    req<M extends RouteMethod, T extends RoutePath>(
        method: M,
        url: T,
    ): Promise<Route<M, T>["response"]>;
    req<M extends RouteMethod, T extends RoutePath>(
        method: M,
        url: T,
        data: Route<M, T>["data"],
    ): Promise<Route<M, T>["response"]>;

    /**
     * Perform an HTTP request using Axios, specifying a route data object.
     * @param method HTTP method
     * @param url Target route
     * @param data Route data object
     * @returns The response body
     */
    async req<M extends RouteMethod, T extends RoutePath>(
        method: M,
        url: T,
        data?: Route<M, T>["data"],
    ): Promise<Route<M, T>["response"]> {
        const res = await this.Axios.request({
            method,
            data,
            url,
        });

        return res.data;
    }

    /**
     * Perform an HTTP request using Axios, specifying a request config.
     * @param method HTTP method
     * @param url Target route
     * @param data Axios request config object
     * @returns The response body
     */
    async request<M extends RouteMethod, T extends RoutePath>(
        method: M,
        url: T,
        data: AxiosRequestConfig,
    ): Promise<Route<M, T>["response"]> {
        const res = await this.Axios.request({
            ...data,
            method,
            url,
        });

        return res.data;
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
        this.configuration = await this.req("GET", "/");
    }

    /**
     * Fetches the configuration of the server if it has not been already fetched.
     */
    async fetchConfiguration() {
        if (!this.configuration) await this.connect();
    }

    private $generateHeaders(
        session: Session | string | undefined = this.session,
    ) {
        if (typeof session === "string") {
            return {
                "x-bot-token": session,
            };
        } else {
            return {
                "x-session-token": session?.token,
            };
        }
    }

    /**
     * Log in with auth data, creating a new session in the process.
     * @param details Login data object
     * @returns An onboarding function if onboarding is required, undefined otherwise
     */
    async login(details: Route<"POST", "/auth/session/login">["data"]) {
        await this.fetchConfiguration();
        this.session = await this.req("POST", "/auth/session/login", details);

        return await this.$connect();
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
        this.Axios.defaults.headers = this.$generateHeaders();
        return await this.websocket.connect();
    }

    // Check onboarding status and connect to notifications service.
    private async $connect() {
        this.Axios.defaults.headers = this.$generateHeaders();
        const { onboarding } = await this.req("GET", "/onboard/hello");
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
    async completeOnboarding(
        data: Route<"POST", "/onboard/complete">["data"],
        loginAfterSuccess?: boolean,
    ) {
        await this.req("POST", "/onboard/complete", data);
        if (loginAfterSuccess) {
            await this.$connect();
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
        return await this.req("GET", `/invites/${code}` as "/invites/id");
    }

    /**
     * Use an invite.
     * @param code The invite code.
     * @returns Data provided by invite.
     */
    async joinInvite(code: string) {
        return await this.req("POST", `/invites/${code}` as "/invites/id");
    }

    /**
     * Delete an invite.
     * @param code The invite code.
     */
    async deleteInvite(code: string) {
        await this.req("DELETE", `/invites/${code}` as "/invites/id");
    }

    /**
     * Fetch user settings for current user.
     * @param keys Settings keys to fetch, leave blank to fetch full object.
     * @returns Key-value object of settings.
     */
    async syncFetchSettings(keys: string[]) {
        return await this.req("POST", "/sync/settings/fetch", { keys });
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

        const query = timestamp ? `?timestamp=${timestamp}` : "";
        await this.req(
            "POST",
            `/sync/settings/set${query}` as "/sync/settings/set",
            requestData,
        );
    }

    /**
     * Fetch user unreads for current user.
     * @returns Array of channel unreads.
     */
    async syncFetchUnreads() {
        return await this.req("GET", "/sync/unreads");
    }

    /**
     * ? Utility functions.
     */

    /**
     * Log out of REVOLT. Disconnect the WebSocket, request a session invalidation and reset the client.
     */
    async logout() {
        this.websocket.disconnect();
        await this.req("POST", "/auth/session/logout");
        this.reset();
    }

    /**
     * Reset the client by setting properties to their original value or deleting them entirely.
     * Disconnects the current WebSocket.
     */
    reset() {
        this.websocket.disconnect();
        delete this.user;
        delete this.session;

        this.users = new Users(this);
        this.channels = new Channels(this);
        this.servers = new Servers(this);
        this.members = new Members(this);
        this.messages = new Messages(this);
    }

    /**
     * Register for a new account.
     * @param data Registration data object
     * @returns A promise containing a registration response object
     */
    register(data: Route<"POST", "/auth/account/create">["data"]) {
        return this.request("POST", "/auth/account/create", { data });
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
        attachment?: { tag: string; _id: string; content_type?: string },
        ...args: FileArgs
    ) {
        const [options, allowAnimation, fallback] = args;

        const autumn = this.configuration?.features.autumn;
        if (!autumn?.enabled) return fallback;
        if (!attachment) return fallback;

        const { tag, _id, content_type } = attachment;

        let query = "";
        if (options) {
            if (!allowAnimation || content_type !== "image/gif") {
                query =
                    "?" +
                    Object.keys(options)
                        .map((k) => `${k}=${options[k as keyof SizeOptions]}`)
                        .join("&");
            }
        }

        return `${autumn.url}/${tag}/${_id}${query}`;
    }
}
