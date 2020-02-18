import WebSocket from 'isomorphic-ws';
import axios, { AxiosRequestConfig } from 'axios';
import { defaultsDeep } from 'lodash';

import { EventEmitter } from 'events';
import { Channel, User, Message, MessageSnapshot } from './objects';
import { Request, Account, Users, RawMessage } from './api';

export declare interface Client {
	// ready: only fired once when it first connects
	on(event: 'ready', listener: () => void): this;

	// error: fires on authentication error
	on(event: 'error', listener: (error: Error) => void): this;

	// websocket: connection status
	on(event: 'connected', listener: () => void): this;
    on(event: 'dropped', listener: () => void): this;
	
	// events: messages
	on(event: 'message', listener: (message: Message) => void): this;
	on(event: 'message_update', listener: (message: Message, previous?: MessageSnapshot) => void): this;
	on(event: 'message_delete', listener: (id: string, deleted?: MessageSnapshot) => void): this;
	
	on(event: string, listener: Function): this;
}

export class Client extends EventEmitter {
	API_URL = "http://86.11.153.158:5500/api";
	WS_URI = "ws://86.11.153.158:9999" 

	ws?: WebSocket;
	token?: string;

	userId?: string;
	user?: User;

	users: Map<string, User>;
	channels: Map<string, Channel>;

	autoReconnect: boolean;
	constructor(config?: { autoReconnect?: boolean }) {
		super();
		this.users = new Map();
		this.channels = new Map();
		this.autoReconnect = config?.autoReconnect ?? false;
	}

	socketOpen?: boolean;
	socketAuthenticated?: boolean;
	previouslyConnected?: boolean;

	$connect() {
		if (typeof this.ws !== 'undefined'
			&& this.ws.readyState === WebSocket.OPEN)
			this.ws.close();
		
		let ws = new WebSocket(this.WS_URI);

		ws.onopen = () => {
			this.socketOpen = true;
			ws.send(JSON.stringify({
				"type": "authenticate",
				"token": this.token
			}));
		}

		ws.onmessage = async raw => {
			let packet = JSON.parse(raw.data.toString());

			switch (packet.type) {
				// pre-auth
				case 'authenticate':
					{
						if (packet.success) {
							this.socketAuthenticated = true;

							this.emit('connected');
							if (!this.previouslyConnected) {
								this.emit('ready');
								this.previouslyConnected = true;
							}
						} else {
							this.emit('error', packet.error ?? 'Failed to auth with websocket, unknown error.');
						}
					}
					break;
				// post-auth
				case 'message':
					{
						let m = packet.data as RawMessage & { channel: string };
						let channel = await this.findChannel(m.channel);

						this.emit('message', await Message.from(m.id, channel, m));
					}
					break;
				case 'message_update':
					{
						let m = packet.data as RawMessage & { channel: string };
						let channel = await this.findChannel(m.channel);
						let snapshot = channel.messages.get(m.id)?.$snapshot();

						this.emit('message_update', await Message.from(m.id, channel, m), snapshot);
					}
					break;
				case 'message_delete':
					{
						let m = packet.data as { id: string, channel: string };
						let channel = await this.findChannel(m.channel);
						let snapshot = channel.messages.get(m.id)?.$snapshot();

						channel.messages.delete(m.id);
						this.emit('message_delete', m.id, snapshot);
					}
					break;
			}
		}

		ws.onclose = () => {
			this.socketOpen = false;
			this.socketAuthenticated = false;
			this.emit('dropped');
			this.autoReconnect &&
				this.$connect();
		}
	}

	async $request<T extends Request>(method: AxiosRequestConfig['method'], url: string, data?: T, config?: AxiosRequestConfig) {
		return await
			axios(
				defaultsDeep(
					config ?? {},
					{
						method,
						url: this.API_URL + url,
						data,
						headers: {
							'x-auth-token': this.token ?? ''
						}
					} as AxiosRequestConfig
				)
			)
	}

	async $req<T extends Request, R>(method: AxiosRequestConfig['method'], url: string, data?: T, config?: AxiosRequestConfig): Promise<R> {
		return (await this.$request(method, url, data, config)).data;
	}

	async $sync() {
		this.user = await User.from(this.userId as string, this);

		for (let raw of await this.$req<Request, Users.FriendsResponse>('GET', '/users/@me/friend')) {
			await User.from(raw.id, this); // !!WARN: THIS FETCHES ALL USERS INDIVIDUALLY!!
		}

		for (let raw of await this.$req<Request, Users.DMsResponse>('GET', '/users/@me/dms')) {
			await Channel.from(raw.id, this, raw);
		}
	}

	async login(token: string): Promise<void>;
	async login(email: string, password: string): Promise<void>;

	async login(ut: string, password?: string) {
		try {
			if (password) {
				let data = await this.$req<Account.LoginRequest, Account.LoginResponse>('POST', '/account/login', { email: ut, password });
			
				if (data.success) {
					this.token = data.access_token;
					this.userId = data.id;
					await this.$sync();
					this.$connect();
				} else {
					let err = data.error ?? 'Failed to login, unknown error.';
					this.emit('error', err);
					throw err;
				}
			} else {
				let data = await this.$req<Account.TokenRequest, Account.TokenResponse>('POST', '/account/token', { token: ut });
			
				if (data.success) {
					this.token = ut;
					this.userId = data.id;
					await this.$sync();
					this.$connect();
				} else {
					let err = data.error ?? 'Failed to login, unknown error.';
					this.emit('error', err);
					throw err;
				}
			}
		} catch (err) {
			this.emit('error', err);
			throw err;
		}
	}

	async lookup(query: Users.LookupRequest) {
		let users = [];
		for (let x of await this.$req<Users.LookupRequest, Users.LookupResponse>('POST', '/users/lookup', query)) {
			users.push(await User.from(x.id, this, x));
		}

		return users;
	}

	findUser(id: string) {
		return User.from(id, this);
	}

	findChannel(id: string) {
		return Channel.from(id, this);
	}
}
