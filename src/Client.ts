import Axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'eventemitter3';
import { defaultsDeep } from 'lodash';

import { defaultConfig } from '.';
import { Core } from './api/core';
import { Auth } from './api/auth';
import { Users } from './api/users';
import { Channels } from './api/channels';
import { Onboarding } from './api/onboarding';
import { WebSocketClient } from './websocket/client';

import User, { SystemUser } from './objects/User';
import Channel from './objects/Channel';
import Message from './objects/Message';

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
    Axios: AxiosInstance;
    options: ClientOptions;
    websocket: WebSocketClient;
    configuration?: Core.RevoltNodeConfiguration;
    session?: Auth.Session;
    user?: User;

    users: Map<string, User>;
    channels: Map<string, Channel>;
    messages: Map<string, Message>;

    constructor(options: Partial<ClientOptions> = {}) {
        super();

        this.options = defaultsDeep(options, defaultConfig);
        this.Axios = Axios.create({ baseURL: this.options.apiURL });
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
    }

    /**
     * Authentication and connection.
     */
    
    // Stage 1: Connect to Revolt.
    async connect() {
        this.configuration = (await this.Axios.get('/')).data;
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
    async login(details: Auth.LoginRequest) {
        this.$checkConfiguration();
        this.session = (await this.Axios.post('/auth/login', details)).data;
        return await this.$connect();
    }

    // Use an existing session to log into Revolt.
    async useExistingSession(session: Auth.Session) {
        this.$checkConfiguration();
        await this.Axios.get('/auth/check', { headers: this.$generateHeaders(session) });
        this.session = session;
        return await this.$connect();
    }

    // Check onboarding status and connect to notifications service.
    private async $connect() {
        this.Axios.defaults.headers = this.$generateHeaders();
        let { onboarding } = (await this.Axios.get('/onboard/hello')).data;
        if (onboarding) {
            return (username: string, loginAfterSuccess?: boolean) =>
                this.completeOnboarding({ username }, loginAfterSuccess);
        }

        await this.websocket.connect();
    }

    // Complete onboarding if required.
    async completeOnboarding(data: Onboarding.OnboardRequest, loginAfterSuccess?: boolean) {
        await this.Axios.post('/onboard/complete', data);
        if (loginAfterSuccess) {
            await this.$connect();
        }
    }

    /**
     * Utility functions.
     */
    async logout() {
        this.websocket.disconnect();
        await Axios.get('/auth/logout');
    }

    async register(apiURL: string, data: Auth.CreateRequest): Promise<Auth.CreateResponse> {
        return (await Axios.post('/auth/create', data, { baseURL: apiURL })).data;
    }

    async addFriend(username: string) {
        await this.Axios.put(`/users/${username}/friend`);
    }

    async createGroup(data: Channels.CreateGroupRequest) {
        let res = await this.Axios.post('/channels/create', data);
        return await Channel.fetch(this, res.data.id, res.data);
    }

    fetchUser(id: string): Promise<User> {
        return User.fetch(this, id)
    }

    fetchChannel(id: string): Promise<Channel> {
        return Channel.fetch(this, id)
    }
}