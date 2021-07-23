import Axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import defaultsDeep from 'lodash.defaultsdeep';
import { EventEmitter } from 'eventemitter3';
import { IDBPDatabase } from 'idb';

import { defaultConfig } from '.';
import { WebSocketClient } from './websocket/client';
import { Route, RoutePath, RouteMethod } from './api/routes';
import { Core, Auth, User, Message, Autumn } from './api/objects';
import { ClientboundNotification } from './websocket/notifications';

import Users from './maps/Users';
import Servers from './maps/Servers';
import Channels from './maps/Channels';

/**
 * Client options object
 */
export interface ClientOptions {
    apiURL: string
    autoReconnect: boolean
    heartbeat: number
    debug: boolean
    db: IDBPDatabase
}

export declare interface Client {
	// WebSocket related events.

    // Event that gets fired on a successful WebSocket connection.
	on(event: 'connected', listener: () => void): this;
    // Event that gets fired when the WebSocket connection is pending connection.
	on(event: 'connecting', listener: () => void): this;
    // Event that gets fired when the WebSocket connection is dropped.
    on(event: 'dropped', listener: () => void): this;
    // Event that gets fired when the WebSocket connection is ready.
    on(event: 'ready', listener: () => void): this;
    // Event that gets fired on a new clientbound packet.
    on(event: 'packet', listener: (packet: ClientboundNotification) => void): this;

    // Message events.

    // Event that gets fired on a new message.
    on(event: 'message', listener: (message: Message) => void): this;
    // Event that gets fired on an update (for example, edit) of a message.
    on(event: 'message/update', listener: (id: string, patch: Partial<Message>) => void): this;
    // Event that gets fired on the deletion of a message.
    on(event: 'message/delete', listener: (id: string) => void): this;
}

/**
 * The user ID for system users.
 */
export const SYSTEM_USER_ID = '00000000000000000000000000';

/**
 * Regular expression for mentions.
 */
export const RE_MENTIONS = /<@([A-z0-9]{26})>/g;

/**
 * Regular expression for spoilers.
 */
export const RE_SPOILER = /!!.+!!/g;

export class Client extends EventEmitter {
    db?: IDBPDatabase;
    heartbeat: number;
    user?: Readonly<User>;
    session?: Auth.Session;
    websocket: WebSocketClient;
    private Axios: AxiosInstance;
    private options: ClientOptions;
    configuration?: Core.RevoltNodeConfiguration;

    users: Users;
    servers: Servers;
    channels: Channels;
    messages: string[];

    constructor(options: Partial<ClientOptions> = {}) {
        super();

        this.options = defaultsDeep(options, defaultConfig);
        this.Axios = Axios.create({ baseURL: this.apiURL });
        this.websocket = new WebSocketClient(this);
        this.heartbeat = this.options.heartbeat;

        if (options.db) {
            this.db = options.db;
        }

        this.users = new Users(this);
        this.servers = new Servers(this);
        this.channels = new Channels(this);
        this.messages = [];

        if (options.debug) {
            this.Axios.interceptors.request.use(request => {
                console.debug('[<]', request.method?.toUpperCase(), request.url);
                return request
            })
                
            this.Axios.interceptors.response.use(response => {
                console.debug('[>] (' + response.status + ':', response.statusText + ')', JSON.stringify(response.data));
                return response
            })
        }

        // Internal loopback.
        this.on('message', async message => {
            let channel = await this.channels.fetchMutable(message.channel);
            if (channel.channel_type === 'DirectMessage') {
                channel.active = true;
            }

            if (channel.channel_type === 'DirectMessage' ||
                channel.channel_type === 'Group') {
                if (typeof message.content === 'string') {
                    channel.last_message = {
                        _id: message._id,
                        author: message.author,
                        short: this.markdownToText(message.content).substr(0, 128)
                    }
                }
            } else if (channel.channel_type === 'TextChannel') {
                channel.last_message = message._id;
            }
        });
    }

    /**
     * Restore users, channels, set the system user and specify the current user.
     * @param user_id Current user ID
     */
    async restore(user_id?: string) {
        await this.users.restore(user => { return { ...user, online: false } });
        await this.channels.restore();
        await this.servers.restore();
        await this.servers.members.restore();
        this.users.set({
            _id: SYSTEM_USER_ID,
            username: 'REVOLT'
        });
        if (user_id) this.user = this.users.get(user_id);
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
    
    req<M extends RouteMethod, T extends RoutePath>(method: M, url: T): Promise<Route<M, T>["response"]>;
    req<M extends RouteMethod, T extends RoutePath>(method: M, url: T, data: Route<M, T>["data"]): Promise<Route<M, T>["response"]>;

    /**
     * Perform an HTTP request using Axios, specifying a route data object.
     * @param method HTTP method
     * @param url Target route
     * @param data Route data object
     * @returns The response body
     */
    async req<M extends RouteMethod, T extends RoutePath>(method: M, url: T, data?: Route<M, T>["data"]): Promise<Route<M, T>["response"]> {
        let res = await this.Axios.request({
            method,
            data,
            url
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
    async request<M extends RouteMethod, T extends RoutePath>(method: M, url: T, data: AxiosRequestConfig): Promise<Route<M, T>["response"]> {
        let res = await this.Axios.request({
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
        this.configuration = await this.req('GET', '/');
    }

    /**
     * Fetches the configuration of the server if it has not been already fetched.
     */
    async fetchConfiguration() {
        if (!this.configuration)
            await this.connect();
    }

    private $generateHeaders(session: Auth.Session | undefined = this.session) {
        return {
            'x-user-id': session?.user_id,
            'x-session-token': session?.session_token
        }
    }

    /**
     * Log in with auth data, creating a new session in the process.
     * @param details Login data object
     * @returns An onboarding function if onboarding is required, undefined otherwise
     */
    async login(details: Route<'POST', '/auth/login'>["data"]) {
        this.fetchConfiguration();
        this.session = await this.req('POST', '/auth/login', details);
        
        return await this.$connect();
    }

    /**
     * Use an existing session to log into REVOLT.
     * @param session Session data object
     * @returns An onboarding function if onboarding is required, undefined otherwise
     */
    async useExistingSession(session: Auth.Session) {
        this.fetchConfiguration();
        await this.request('GET', '/auth/check', { headers: this.$generateHeaders(session) });
        this.session = session;
        return await this.$connect();
    }

    // Check onboarding status and connect to notifications service.
    private async $connect() {
        this.Axios.defaults.headers = this.$generateHeaders();
        let { onboarding } = await this.req('GET', '/onboard/hello');
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
    async completeOnboarding(data: Route<'POST', '/onboard/complete'>["data"], loginAfterSuccess?: boolean) {
        await this.req('POST', '/onboard/complete', data);
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
        return await this.req('GET', `/invites/${code}` as '/invites/id');
    }

    /**
     * Use an invite.
     * @param code The invite code.
     * @returns Data provided by invite.
     */
    async joinInvite(code: string) {
        let res = await this.req('POST', `/invites/${code}` as '/invites/id');

        switch (res.type) {
            case 'Server': {
                await this.channels.fetch(res.channel._id, res.channel);
                await this.servers.fetch(res.server._id, res.server);
                break;
            }
        }

        return res;
    }

    /**
     * Delete an invite.
     * @param code The invite code.
     */
    async deleteInvite(code: string) {
        await this.req('DELETE', `/invites/${code}` as '/invites/id');
    }

    /**
     * Fetch user settings for current user.
     * @param keys Settings keys to fetch, leave blank to fetch full object.
     * @returns Key-value object of settings.
     */
    async syncFetchSettings(keys: string[]) {
        return await this.req('POST', '/sync/settings/fetch', { keys });
    }

    /**
     * Set user settings for current user.
     * @param data Data to set as an object. Any non-string values will be automatically serialised.
     * @param timestamp Timestamp to use for the current revision.
     */
    async syncSetSettings(data: { [key: string]: object | string }, timestamp?: number) {
        let requestData: { [key: string]: string } = {};
        for (let key of Object.keys(data)) {
            let value = data[key];
            requestData[key] = typeof value === 'string' ? value : JSON.stringify(value);
        }

        let query = timestamp ? `?timestamp=${timestamp}` : '';
        await this.req('POST', `/sync/settings/set${query}` as '/sync/settings/set', requestData);
    }

    /**
     * Fetch user unreads for current user.
     * @returns Array of channel unreads.
     */
    async syncFetchUnreads() {
        return await this.req('GET', '/sync/unreads');
    }

    /**
     * ? Utility functions.
     */

    /**
     * Log out of REVOLT. Disconnect the WebSocket, request a session invalidation and reset the client.
     */
    async logout() {
        this.websocket.disconnect();
        await this.req('GET', '/auth/logout');
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

        this.users.clear();
        this.channels.clear();
        this.servers.clear();
        this.servers.members.clear();

        this.users = new Users(this);
        this.channels = new Channels(this);
        this.servers = new Servers(this);
    }

    /**
     * Register for a new account.
     * @param apiURL Base URL for the API of the server, such as https://api.revolt.example
     * @param data Registration data object
     * @returns A promise containing a registration response object
     */
    register(apiURL: string, data: Route<'POST', '/auth/create'>["data"]) {
        return this.request('POST', '/auth/create', { data, baseURL: apiURL });
    }

    /**
     * Prepare a markdown-based message to be displayed to the user as plain text.
     * @param source Source markdown text
     * @returns Modified plain text
     */
    markdownToText(source: string) {
        return source
        .replace(
            RE_MENTIONS,
            (sub: string, ...args: any[]) => {
                const id = args[0],
                    user = this.users.get(id);
                
                if (user) {
                    return `@${user.username}`;
                }

                return sub;
            }
        )
        .replace(
            RE_SPOILER,
            '<spoiler>'
        );
    }

    /**
     * Proxy a file through January.
     * @param url URL to proxy
     * @returns Proxied media URL
     */
    proxyFile(url: string): string | undefined {
        if (this.configuration?.features.january.enabled) {
            return `${this.configuration.features.january.url}/proxy?url=${encodeURIComponent(url)}`;
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
    generateFileURL(attachment?: { tag: string, _id: string, content_type?: string }, options?: Autumn.SizeOptions, allowAnimation?: boolean, fallback?: string) {
        let autumn = this.configuration?.features.autumn;
        if (!autumn?.enabled) return fallback;
        if (!attachment) return fallback;

        let { tag, _id, content_type } = attachment;

        let query = '';
        if (options) {
            if (!allowAnimation || content_type !== 'image/gif') {
                query = '?' + Object.keys(options).map(k => `${k}=${(options as any)[k]}`).join('&');
            }
        }

        return `${autumn.url}/${tag}/${_id}${query}`;
    }
}