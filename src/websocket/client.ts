import WebSocket from 'isomorphic-ws';
import { backOff } from 'exponential-backoff';

import { Client, SYSTEM_USER_ID } from '..';
import { Auth, Channels, User } from '../api/objects';
import { ServerboundNotification, ClientboundNotification } from './notifications';

export class WebSocketClient {
    client: Client;
    ws?: WebSocket;

    heartbeat?: number;
    connected: boolean;
    ready: boolean;

    constructor(client: Client) {
        this.client = client;

        this.connected = false;
        this.ready = false;
    }

    disconnect() {
        clearInterval(this.heartbeat);
        this.connected = false;
        this.ready = false;

        if (typeof this.ws !== 'undefined' && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
        }
    }

    send(notification: ServerboundNotification) {
        if (typeof this.ws === 'undefined' || this.ws.readyState !== WebSocket.OPEN) return;

        let data = JSON.stringify(notification);
        if (this.client.debug) console.debug('[<] PACKET', data);
        this.ws.send(data);
    }

    connect(disallowReconnect?: boolean): Promise<void> {
        this.client.emit('connecting');

        return new Promise((resolve, $reject) => {
            let thrown = false;
            const reject = (err: any) => {
                if (!thrown) {
                    thrown = true;
                    $reject(err);
                }
            };

            this.disconnect();

            if (typeof this.client.configuration === 'undefined') {
                throw new Error("Attempted to open WebSocket without syncing configuration from server.");
            }

            if (typeof this.client.session === 'undefined') {
                throw new Error("Attempted to open WebSocket without valid session.");
            }

            let ws = new WebSocket(this.client.configuration.ws);
            this.ws = ws;

            ws.onopen = () => {
                this.send({ type: 'Authenticate', ...this.client.session as Auth.Session });
            };

            let handle = async (msg: WebSocket.MessageEvent) => {
                let data = msg.data;
                if (typeof data !== 'string') return;

                if (this.client.debug) console.debug('[>] PACKET', data);
                let packet = JSON.parse(data) as ClientboundNotification;
                this.client.emit('packet', packet);
                switch (packet.type) {
                    case 'Error': {
                        reject(packet.error);
                        break;
                    }
                    case 'Authenticated': {
                        disallowReconnect = false;
                        this.client.emit('connected');
                        this.connected = true;
                        break;
                    }
                    case 'Ready': {
                        for (let user of packet.users) {
                            this.client.users.set(user);
                        }

                        // INFO:
                        // Our user object should be included in this
                        // payload so we can just take it out of the map.
                        this.client.user = this.client.users.get(this.client.session?.user_id as string) as User;

                        this.client.channels.clear();
                        for (let channel of packet.channels) {
                            this.client.channels.set(channel);
                        }

                        this.client.emit('ready');
                        this.ready = true;
                        resolve();

                        if (this.client.heartbeat > 0) {
                            this.heartbeat = setInterval(
                                () => this.send({ type: 'Ping', time: + new Date() }),
                                this.client.heartbeat * 1e3
                            ) as any;
                        }
                        
                        break;
                    }

                    case 'Message': {
                        if (!this.client.messages.includes(packet._id)) {
                            this.client.messages.push(packet._id);

                            if (packet.author === SYSTEM_USER_ID) {
                                if (typeof packet.content === 'object') {
                                    switch (packet.content.type) {
                                        case 'user_added':
                                        case 'user_remove':
                                            await this.client.users.fetch(packet.content.by);
                                        case 'user_left':
                                            await this.client.users.fetch(packet.content.id);
                                    }
                                }
                            } else {
                                await this.client.users.fetch(packet.author);
                            }

                            this.client.emit('message', packet);
                        }
                        break;
                    }
                    case 'MessageUpdate': this.client.emit('message/update', packet.id, packet.data); break;
                    case 'MessageDelete': this.client.emit('message/delete', packet.id); break;

                    case 'ChannelCreate': this.client.channels.set(packet); break;
                    case 'ChannelUpdate': this.client.channels.patch(packet.id, packet.data); break;
                    case 'ChannelGroupJoin': {
                        let channel = await this.client.channels.fetchMutable(packet.id);
                        if (channel.channel_type !== 'Group') throw "Not a group channel.";
                        let user_id = packet.user;
                        await this.client.users.fetch(user_id);

                        channel.recipients = [
                            ...channel.recipients.filter(user => user !== user_id),
                            user_id
                        ];
                        break;
                    }
                    case 'ChannelGroupLeave': {
                        let channel = await this.client.channels.fetchMutable(packet.id);
                        if (channel.channel_type !== 'Group') throw "Not a group channel.";
                        let user_id = packet.user;
                        channel.recipients = channel.recipients.filter(user => user !== user_id);
                        break;
                    }
                    case 'ChannelDelete': this.client.channels.delete(packet.id, true); break;

                    case 'UserRelationship': {
                        let user = await this.client.users.fetchMutable(packet.user);
                        user.relationship = packet.status;
                        break;
                    }
                    case 'UserPresence': {
                        let user = await this.client.users.fetchMutable(packet.id);
                        user.online = packet.online;
                        break;
                    }
                }
            }
            
            let processing = false;
            let queue: WebSocket.MessageEvent[] = [];
            ws.onmessage = async (data) => {
                queue.push(data);

                if (!processing) {
                    processing = true;
                    while (queue.length > 0) {
                        await handle(queue.shift() as any);
                    }
                    processing = false;
                }
            }

            ws.onerror = (err) => {
                reject(err);
            }

            ws.onclose = () => {
                this.client.emit('dropped');
                this.connected = false;
                this.ready = false;

                this.client.users.toMutableArray()
                    .forEach(user => user.online = false);

                if (!disallowReconnect && this.client.autoReconnect) {
                    backOff(() => this.connect(true)).catch(reject);
                }
            };
        });
    }
}
