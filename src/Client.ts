import WebSocket from 'isomorphic-ws';
import axios, { AxiosRequestConfig } from 'axios';
import { defaultsDeep } from 'lodash';

import { EventEmitter } from 'events';
import { User } from './objects';
import { Request, Account, Users } from './api';

const API_URL = "http://86.11.153.158:5500/api";
const WS_URI = "ws://86.11.153.158:9999"

export declare interface Client {
	// ready: only fired once when it first connects
	on(event: 'ready', listener: () => void): this;

	// error: fires on authentication error
	on(event: 'error', listener: (error: Error) => void): this;

	// websocket: connection status
	on(event: 'connected', listener: () => void): this;
    on(event: 'dropped', listener: () => void): this;
	
	// events: messages
	on(event: 'message', listener: () => void): this;
	on(event: 'message_update', listener: () => void): this;
	on(event: 'message_delete', listener: () => void): this;
	
	on(event: string, listener: Function): this;
}

export class Client extends EventEmitter {
	ws?: WebSocket;
	token?: string;

	userId?: string;
	user?: User;

	users: Map<string, User>;
	channels: Map<string, undefined>;

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
		
		let ws = new WebSocket(WS_URI);

		ws.onopen = () => {
			this.socketOpen = true;
			ws.send(JSON.stringify({
				"type": "authenticate",
				"token": this.token
			}));
		}

		ws.onmessage = raw => {
			let data = JSON.parse(raw.data.toString());

			switch (data.type) {
				// pre-auth
				case 'authenticate':
					{
						if (data.success) {
							this.socketAuthenticated = true;

							this.emit('connected');
							if (!this.previouslyConnected) {
								this.emit('ready');
								this.previouslyConnected = true;
							}
						} else {
							this.emit('error', data.error ?? 'Failed to auth with websocket, unknown error.');
						}
					}
					break;
				// post-auth
				case 'message':
					{
						//
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

	async $request<T>(method: 'GET' | 'POST', url: string, data?: T, config?: AxiosRequestConfig) {
		return await
			axios(
				defaultsDeep(
					config ?? {},
					{
						method,
						url: API_URL + url,
						data,
						headers: {
							'x-auth-token': this.token ?? ''
						}
					} as AxiosRequestConfig
				)
			)
	}

	async $req<T, R>(method: 'GET' | 'POST', url: string, data?: T, config?: AxiosRequestConfig): Promise<R> {
		return (await this.$request(method, url, data, config)).data;
	}

	async $sync() {
		this.user = await User.from(this.userId as string, this);
	}

	async login(email: string, password: string) {
		try {
			let data = await this.$req<Account.LoginRequest, Account.LoginResponse>('POST', '/account/login', { email, password });
			
			if (data.success) {
				this.token = data.access_token;
				this.userId = data.id;
				await this.$sync();
				this.$connect();
			} else {
				this.emit('error', data.error ?? 'Failed to login, unknown error.');
			}
		} catch (err) {
			this.emit('error', err);
		}
	}
}
