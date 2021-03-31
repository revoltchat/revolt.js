import Axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import defaultsDeep from 'lodash.defaultsdeep';
import { EventEmitter } from 'eventemitter3';

import { defaultConfig } from '.';
import { WebSocketClient } from './websocket/client';
import { Core, Auth, User, Message } from './api/objects';
import { Route, RoutePath, RouteMethod } from './api/routes';

import Users from './maps/Users';
import Channels from './maps/Channels';
import { Db } from '@insertish/zangodb';
import { ClientboundNotification } from './websocket/notifications';

export interface ClientOptions {
    apiURL: string
    autoReconnect: boolean
    heartbeat: number
    debug: boolean
    db: Db
}

export declare interface Client {
	// WebSocket related events.
	on(event: 'connected', listener: () => void): this;
	on(event: 'connecting', listener: () => void): this;
    on(event: 'dropped', listener: () => void): this;
    on(event: 'ready', listener: () => void): this;
    on(event: 'packet', listener: (packet: ClientboundNotification) => void): this;

    // Message events.
    on(event: 'message', listener: (message: Message) => void): this;
    on(event: 'message/update', listener: (id: string, patch: Partial<Message>) => void): this;
    on(event: 'message/delete', listener: (id: string) => void): this;
}

export const SYSTEM_USER_ID = '00000000000000000000000000';

export class Client extends EventEmitter {
    private db?: Db;
    heartbeat: number;
    user?: Readonly<User>;
    session?: Auth.Session;
    websocket: WebSocketClient;
    private Axios: AxiosInstance;
    private options: ClientOptions;
    configuration?: Core.RevoltNodeConfiguration;

    users: Users;
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
                        short: message.content.substr(0, 32)
                    }
                }
            }
        });
    }

    async restore(user_id?: string) {
        await this.users.restore(user => { return { ...user, online: false } });
        await this.channels.restore();
        this.users.set({
            _id: SYSTEM_USER_ID,
            username: 'REVOLT'
        });
        if (user_id) this.user = this.users.get(user_id);
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

    collection(col: string) {
        if (this.db) {
            return this.db.collection(col);
        }
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
        this.websocket.disconnect();
        await this.req('GET', '/auth/logout');
        this.reset();
    }

    reset() {
        this.websocket.disconnect();
        delete this.user;
        delete this.session;
        this.users.clear();
        this.channels.clear();
        this.users = new Users(this);
        this.channels = new Channels(this);
    }

    register(apiURL: string, data: Route<'POST', '/auth/create'>["data"]) {
        return this.request('POST', '/auth/create', { data, baseURL: apiURL });
    }
}