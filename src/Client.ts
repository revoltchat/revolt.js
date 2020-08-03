import axios, { AxiosRequestConfig } from 'axios';
import WebSocket from 'isomorphic-ws';
import { defaultsDeep } from 'lodash';
import { EventEmitter } from 'events';

import { Account, Users, Guild as GuildAPI, WebsocketPackets, Relationship, ChannelType, RawMessage, RawChannel, Channels } from './api';
import { User, Message, GroupChannel, Guild, Channel, DMChannel } from './objects';

export interface ClientOptions {
    apiURL?: string,
    wsURL?: string
}

export declare interface Client {
	// ready: only fired once when it first connects
	on(event: 'ready', listener: () => void): this;

	// websocket: connection status
	on(event: 'connected', listener: () => void): this;
    on(event: 'dropped', listener: () => void): this;

    // object creation
    on(event: 'create/user', listener: (id: string, user: User) => void): this;
    on(event: 'create/guild', listener: (id: string, guild: Guild) => void): this;

    // object patches
    on(event: 'patch/user', listener: (id: string, partial: Partial<Users.UserResponse>) => void): this;
    on(event: 'patch/guild', listener: (id: string, partial: Partial<GuildAPI.GuildResponse>) => void): this; // ! TODO
    on(event: 'patch/channel', listener: (id: string, partial: Partial<RawChannel>) => void): this; // ! TOOD
    on(event: 'patch/message', listener: (id: string, partial: Partial<RawMessage>) => void): this; // ! TODO FIXME

    // message events
    on(event: 'message', listener: (message: Message) => void): this;
    on(event: 'message/edit', listener: (message: Message) => void): this;
    on(event: 'message/delete', listener: (id: string, message?: Message) => void): this;

    // group events
    on(event: 'group/user_join', listener: (channel: GroupChannel, user: User) => void): this;
    on(event: 'group/user_leave', listener: (channel: GroupChannel, id: string, user?: User) => void): this;

    // guild events
    on(event: 'guild/user_join', listener: (guild: Guild, user: User) => void): this;
    on(event: 'guild/user_leave', listener: (guild: Guild, id: string, user?: User) => void): this;
    on(event: 'guild/channel_create', listener: (guild: Guild, channel: Channel) => void): this;
    on(event: 'guild/channel_delete', listener: (guild: Guild, id: string, channel?: Channel) => void): this;
    on(event: 'guild/delete', listener: (id: string, guild?: Guild) => void): this;

    // user events
    on(event: 'user/friend_status', listener: (user: User, relationship: Relationship) => void): this;
}

export class Client extends EventEmitter {
    apiURL: string;
    wsURL: string;

    token?: string;
    userId?: string;
    user?: User;

    users: Map<string, User>;
    channels: Map<string, Channel>;
    messages: Map<string, Message>;
    guilds: Map<string, Guild>;

    constructor(options?: ClientOptions) {
        super();

        let opt = defaultsDeep(
            options ?? { },
            {
                apiURL: 'https://revolt.insrt.uk/api',
                wsURL:  'wss://revolt.insrt.uk/ws'
            }
        );

        this.apiURL = opt.apiURL;
        this.wsURL  = opt.wsURL;

        this.users = new Map();
        this.channels = new Map();
        this.messages = new Map();
        this.guilds = new Map();
    }

	ws?: WebSocket;
	socketOpen?: boolean;
	socketAuthenticated?: boolean;
	previouslyConnected?: boolean;

	$connect() {
        return new Promise((resolve, reject) => {
            if (typeof this.ws !== 'undefined'
                && this.ws.readyState === WebSocket.OPEN)
                this.ws.close();
            
            let ws = new WebSocket(this.wsURL);

            ws.onopen = () => {
                this.socketOpen = true;
                ws.send(JSON.stringify({
                    "type": "authenticate",
                    "token": this.token
                }));
            }

            ws.onmessage = async (raw: any) => {
                let packet = JSON.parse(raw.data.toString());

                switch (packet.type) {
                    // pre-auth
                    case 'authenticate':
                        {
                            if (packet.success) {
                                this.socketAuthenticated = true;
                                resolve();

                                this.emit('connected');
                                if (!this.previouslyConnected) {
                                    this.emit('ready');
                                    this.previouslyConnected = true;
                                }
                            } else {
                                reject(packet.error ?? 'Failed to auth with websocket, unknown error.');
                            }
                        }
                        break;
                    // post-auth
                    case 'message_create':
                        {
                            let data = packet as WebsocketPackets.message_create & { edited: number | null };
                            data.edited = null;

                            if (data.nonce) {
                                this.messages.get(data.nonce)?._delete();
                            }

                            let channel = await Channel.fetch(this, data.channel);
                            let message = await Message.fetch(this, channel, data.id, data);

                            if (channel instanceof DMChannel ||
                                channel instanceof GroupChannel) {
                                channel._lastMessage = {
                                    id: data.id,
                                    user_id: data.author,
                                    short_content: message.author.username + ': ' + data.content.substring(0, 24)
                                }
                            }

                            this.emit('message', message);
                        }
                        break;
                    case 'message_edit':
                        {
                            let data = packet as WebsocketPackets.message_edit;
                            let message = this.messages.get(data.id);

                            let channel = message?.channel;
                            if (message) {
                                message.content = data.content;
                                this.emit('message/edit', message);
                            } else {
                                channel = await Channel.fetch(this, data.channel);
                                message = await Message.fetch(
                                    this,
                                    channel,
                                    data.id,
                                    {
                                        id: data.id,
                                        author: data.author,
                                        content: data.content,
                                        edited: + new Date()
                                    }
                                );

                                this.emit('message/edit', message);
                            }

                            if (channel instanceof DMChannel ||
                                channel instanceof GroupChannel) {
                                if (!channel._lastMessage || data.id >= channel._lastMessage.id) {
                                    channel._lastMessage = {
                                        id: data.id,
                                        user_id: data.author,
                                        short_content: message.author.username + ': ' + data.content.substring(0, 24)
                                    }
                                }
                            }
                        }
                        break;
                    case 'message_delete':
                        {
                            let data = packet as WebsocketPackets.message_delete;
                            let message = this.messages.get(data.id);
                            message?._delete();

                            this.emit('message/delete', data.id, message);

                            let channel = message?.channel;
                            if (channel instanceof DMChannel ||
                                channel instanceof GroupChannel) {
                                if (channel._lastMessage && data.id === channel._lastMessage.id) {
                                    delete channel._lastMessage;
                                }
                            }
                        }
                        break;
                    case 'group_user_join':
                        {
                            let data = packet as WebsocketPackets.group_user_join;
                            let channel = await Channel.fetch(this, data.id) as GroupChannel;
                            let user = await User.fetch(this, data.user);

                            channel.recipients.set(user.id, user);

                            this.emit('group/user_join', channel, user);
                        }
                        break;
                    case 'group_user_leave':
                        {
                            let data = packet as WebsocketPackets.group_user_leave;
                            let channel = await Channel.fetch(this, data.id) as GroupChannel;

                            let user;
                            try {
                                user = await User.fetch(this, data.user);
                            } catch (err) { }

                            channel.recipients.delete(data.user);

                            this.emit('group/user_leave', channel, data.user, user);                            
                        }
                        break;
                    case 'guild_user_join':
                        {
                            let data = packet as WebsocketPackets.guild_user_join;
                            let guild = await Guild.fetch(this, data.id);
                            let user = await User.fetch(this, data.user);

                            guild.members.set(user.id, user);

                            this.emit('guild/user_join', guild, user);
                        }
                        break;
                    case 'guild_user_leave':
                        {
                            let data = packet as WebsocketPackets.guild_user_leave;
                            let guild = await Guild.fetch(this, data.id);

                            let user;
                            try {
                                user = await User.fetch(this, data.user);
                            } catch (err) { }

                            guild.members.delete(data.user);

                            this.emit('guild/user_leave', guild, data.id, user);
                        }
                        break;
                    case 'guild_channel_create':
                        {
                            let data = packet as WebsocketPackets.guild_channel_create;
                            let guild = await Guild.fetch(this, data.id);
                            let channel = await Channel.fetch(this, data.channel, {
                                id: data.channel,
                                type: ChannelType.GUILDCHANNEL,
                                name: data.name,
                                description: data.description,
                                guild: guild.id
                            });

                            this.emit('guild/channel_create', guild, channel);
                        }
                        break;
                    case 'guild_channel_delete':
                        {
                            let data = packet as WebsocketPackets.guild_channel_delete;
                            let guild = await Guild.fetch(this, data.id);
                            
                            let channel = this.channels.get(data.channel);
                            channel?._delete();

                            this.emit('guild/channel_create', guild, data.channel, channel);
                        }
                        break;
                    case 'guild_delete':
                        {
                            let data = packet as WebsocketPackets.guild_delete;
                            let guild = this.guilds.get(data.id);

                            guild?._delete();

                            this.emit('guild/delete', data.id, guild);
                        }
                        break;
                    case 'user_friend_status':
                        {
                            let data = packet as WebsocketPackets.user_friend_status;
                            let user = await User.fetch(this, data.id);
                            user.relationship = data.status;

                            this.emit('user/friend_status', user, data.status);
                        }
                        break;
                }
            }

            ws.onclose = () => {
                this.socketOpen = false;
                this.socketAuthenticated = false;
                this.emit('dropped');
                this.$connect().catch(err => this.emit('error', err));
            }
        });
	}

	async $request<T>(method: AxiosRequestConfig['method'], path: string, data?: T, config?: AxiosRequestConfig) {
        let headers = {} as any;
        if (this.token) headers['x-auth-token'] = this.token;

		return await
			axios(
				defaultsDeep(
					config ?? {},
					{
						method,
						url: this.apiURL + path,
						data,
						headers
					} as AxiosRequestConfig
				)
			)
	}

	async $req<T, R>(method: AxiosRequestConfig['method'], url: string, data?: T, config?: AxiosRequestConfig): Promise<R> {
		return (await this.$request(method, url, data, config)).data;
    }
    
    async $sync() {
        this.user = await User.fetch(this, this.userId as string);

        let dms = await this.$req<any, Users.DMsResponse>('GET', '/users/@me/dms');
        for (let dm of dms) {
            await Channel.fetch(this, dm.id, dm);
        }

        let friends = await this.$req<any, Users.FriendsResponse>('GET', '/users/@me/friend');
        for (let friend of friends) {
            await User.fetch(this, friend.id);
            // ? future optimisation; return user objects from this route.
        }

        let guilds = await this.$req<any, GuildAPI.GuildsResponse>('GET', '/guild/@me');
        for (let guild of guilds) {
            await Guild.fetch(this, guild.id);
        }
    }

    async login(token: string): Promise<void>;
	async login(email: string, password: string): Promise<void>;

	async login(token: string, password?: string) {
        if (typeof password === 'string') {
            let data = await this.$req<Account.LoginRequest, Account.LoginResponse>('POST', '/account/login', { email: token, password });
            this.token = data.access_token;
            this.userId = data.id;
        } else {
            let data = await this.$req<Account.TokenRequest, Account.TokenResponse>('POST', '/account/token', { token });
            this.token = token;
            this.userId = data.id;
        }

        await this.$sync();
        await this.$connect();
    }

    async register(info: Account.CreateRequest) {
        let data = await this.$req<Account.CreateRequest, Account.CreateResponse>('POST', '/account/create', info);
        return data;
    }

    async findUser(username: string) {
        let data = await this.$req<Users.QueryRequest, Users.QueryResponse>('POST', '/users/query', { username });
        return await User.fetch(this, data.id, data);
    }

    async createGuild(info: GuildAPI.CreateGuildRequest) {
        // ! FIXME: return guild data in response
        let data = await this.$req<any, GuildAPI.CreateGuildResponse>('POST', '/guild/create', info);
        return await Guild.fetch(this, data.id);
    }

    async createGroup(info: Channels.CreateGroupRequest) {
        // ! FIXME: return group data in response
        let data = await this.$req<any, GuildAPI.CreateGuildResponse>('POST', '/channels/create', info);
        return await Guild.fetch(this, data.id);
    }

    async fetchUser(id: string) {
        return await User.fetch(this, id);
    }

    async fetchChannel(id: string) {
        return await Channel.fetch(this, id);
    }

    async fetchGuild(id: string) {
        return await Guild.fetch(this, id);
    }
}