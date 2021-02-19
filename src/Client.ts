import Axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { EventEmitter } from 'eventemitter3';
import { defaultsDeep } from 'lodash';

import { defaultConfig } from '.';
import { WebSocketClient } from './websocket/client';
import { Core, Auth, Users, Channels } from './api/objects';

import { Route, RoutePath, RouteMethod } from './api/routes';

import Channel from './objects/Channel';
import Message from './objects/Message';
import User, { SystemUser } from './objects/User';
import { ClientboundNotification } from './websocket/notifications';

export interface ClientOptions {
    apiURL: string,
    autoReconnect: boolean,
    debug: boolean
}

export declare interface Client {
	// WebSocket related events.
	on(event: 'connected', listener: () => void): this;
	on(event: 'connecting', listener: () => void): this;
    on(event: 'dropped', listener: () => void): this;
    on(event: 'ready', listener: () => void): this;
    on(event: 'packet', listener: (packet: ClientboundNotification) => void): this;

    // Object creation.
    on(event: 'create/user', listener: (user: User) => void): this;
    on(event: 'create/channel', listener: (channel: Channel) => void): this;
    on(event: 'create/message', listener: (message: Message) => void): this;

    // Object mutations.
    on(event: 'mutation/user', listener: (user: User, partial: Partial<Users.User>) => void): this;
    on(event: 'mutation/channel', listener: (channel: Channel, partial: Partial<Channels.Channel>) => void): this;
    on(event: 'mutation/message', listener: (message: Message, partial: Partial<Channels.Message>) => void): this;

    // Object destruction.
    on(event: 'delete/user', listener: (user: User, id: string) => void): this;
    on(event: 'delete/channel', listener: (user: User, id: string) => void): this;
    on(event: 'delete/message', listener: (user: User, id: string) => void): this;
    
    // Contextual notifications bound for the client.
    on(event: 'user/relationship_changed', listener: (user: User) => void): this;
    on(event: 'user/status_changed', listener: (user: User) => void): this;
    on(event: 'channel/create', listener: (channel: Channel) => void): this;
    on(event: 'channel/group/join', listener: (channel: Channel, member: User) => void): this;
    on(event: 'channel/group/leave', listener: (channel: Channel, id: string, member?: User) => void): this;
    on(event: 'message', listener: (message: Message) => void): this;
    on(event: 'message/create', listener: (message: Message) => void): this;
    on(event: 'message/edit', listener: (message: Message) => void): this;
}

export class Client extends EventEmitter {
    user?: User;
    session?: Auth.Session;
    websocket: WebSocketClient;
    private Axios: AxiosInstance;
    private options: ClientOptions;
    configuration?: Core.RevoltNodeConfiguration;

    users: Map<string, User>;
    channels: Map<string, Channel>;
    messages: Map<string, Message>;

    constructor(options: Partial<ClientOptions> = {}) {
        super();

        this.options = defaultsDeep(options, defaultConfig);
        this.Axios = Axios.create({ baseURL: this.apiURL });
        this.websocket = new WebSocketClient(this);

        this.users = new Map();
        this.channels = new Map();
        this.messages = new Map();

        this.users.set("00000000000000000000000000", new SystemUser(this));

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
        this.on('message', message => {
            let channel = message.channel;
            channel.patch({
                active: true,
                last_message: {
                    _id: message.id,
                    author: message.author.id,
                    short: message.content.substr(0, 32)
                }
            }, true);
        });
    }

    /**
     * Configuration.
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
     * Axios request wrapper.
     */
    req<M extends RouteMethod, T extends RoutePath>(method: M, url: T): Promise<Route<M, T>["response"]>;
    req<M extends RouteMethod, T extends RoutePath>(method: M, url: T, data: Route<M, T>["data"]): Promise<Route<M, T>["response"]>;

    async req<M extends RouteMethod, T extends RoutePath>(method: M, url: T, data?: Route<M, T>["data"]): Promise<Route<M, T>["response"]> {
        let res = await this.Axios.request({
            method,
            data,
            url
        });

        return res.data;
    }

    async request<M extends RouteMethod, T extends RoutePath>(method: M, url: T, data: AxiosRequestConfig): Promise<Route<M, T>["response"]> {
        let res = await this.Axios.request({
            ...data,
            method,
            url,
        });

        return res.data;
    }

    /**
     * Authentication and connection.
     */
    
    // Stage 1: Connect to Revolt.
    async connect() {
        this.configuration = await this.req('GET', '/');
    }

    async fetchConfiguration() {
        if (!this.configuration)
            await this.connect();
    }

    private $checkConfiguration() {
        if (typeof this.configuration === 'undefined')
            throw new Error("No configuration synced from Revolt node yet. Use client.connect();");
    }

    private $generateHeaders(session: Auth.Session | undefined = this.session) {
        return {
            'x-user-id': session?.user_id,
            'x-session-token': session?.session_token
        }
    }

    // Login to Revolt.
    async login(details: Route<'POST', '/auth/login'>["data"]) {
        this.fetchConfiguration();
        this.session = await this.req('POST', '/auth/login', details);
        
        return await this.$connect();
    }

    // Use an existing session to log into Revolt.
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

    // Complete onboarding if required.
    async completeOnboarding(data: Route<'POST', '/onboard/complete'>["data"], loginAfterSuccess?: boolean) {
        await this.req('POST', '/onboard/complete', data);
        if (loginAfterSuccess) {
            await this.$connect();
        }
    }

    /**
     * Utility functions.
     */
    async logout() {
        this.reset();
        await this.req('GET', '/auth/logout');
    }

    reset() {
        this.websocket.disconnect();
        delete this.user;
        delete this.session;
        this.users = new Map();
        this.channels = new Map();
        this.messages = new Map();
    }

    register(apiURL: string, data: Route<'POST', '/auth/create'>["data"]) {
        return this.request('POST', '/auth/create', { data, baseURL: apiURL });
    }

    async addFriend(username: string) {
        await this.req<'PUT', '/users/:id/friend'>('PUT', `/users/${username}/friend` as any);
    }

    async createGroup(data: Route<'POST', '/channels/create'>["data"]) {
        let obj = await this.req('POST', '/channels/create', data);
        return await Channel.fetch(this, obj._id, obj);
    }

    fetchUser(id: string): Promise<User> {
        return User.fetch(this, id)
    }

    fetchChannel(id: string): Promise<Channel> {
        return Channel.fetch(this, id)
    }
}