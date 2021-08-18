import WebSocket from 'isomorphic-ws';
import { backOff } from 'exponential-backoff';

import { Client } from '..';
import { ServerboundNotification, ClientboundNotification } from './notifications';

import { runInAction } from 'mobx';

import { Role } from 'revolt-api/types/Servers';

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

    /**
     * Disconnect the WebSocket and disable heartbeats.
     */
    disconnect() {
        clearInterval(this.heartbeat);
        this.connected = false;
        this.ready = false;

        if (typeof this.ws !== 'undefined' && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
        }
    }

    /**
     * Send a notification
     * @param notification Serverbound notification
     */
    send(notification: ServerboundNotification) {
        if (typeof this.ws === 'undefined' || this.ws.readyState !== WebSocket.OPEN) return;

        let data = JSON.stringify(notification);
        if (this.client.debug) console.debug('[<] PACKET', data);
        this.ws.send(data);
    }

    /**
     * Connect the WebSocket
     * @param disallowReconnect Whether to disallow reconnection
     */
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
                if (typeof this.client.session === 'string') {
                    this.send({ type: 'Authenticate', token: this.client.session! });
                } else {
                    this.send({ type: 'Authenticate', ...this.client.session! });
                }
            };

            let timeouts: Record<string, any> = {};
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
                        runInAction(() => {
                            if (packet.type !== 'Ready') throw 0;

                            for (let user of packet.users) {
                                this.client.users.createObj(user);
                            }

                            for (let channel of packet.channels) {
                                this.client.channels.createObj(channel);
                            }

                            for (let server of packet.servers) {
                                this.client.servers.createObj(server);
                            }

                            for (let member of packet.members) {
                                this.client.members.createObj(member);
                            }
                        });

                        this.client.user = this.client.users.get(
                            packet.users.find(x => x.relationship === 'User')!._id
                        )!;

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

                    case "Message": {
                        if (!this.client.messages.has(packet._id)) {
                            if (packet.author === '00000000000000000000000000') {
                                if (typeof packet.content === 'object') {
                                    switch (packet.content.type) {
                                        case 'user_added':
                                        case 'user_remove':
                                            await this.client.users.fetch(packet.content.by);
                                        case 'user_left':
                                            await this.client.users.fetch(packet.content.id);
                                            break;
                                        case 'user_joined':
                                        case 'user_left':
                                        case 'user_banned':
                                        case 'user_kicked':
                                            await this.client.users.fetch(packet.content.id);
                                            break;
                                        case 'channel_description_changed':
                                        case 'channel_icon_changed':
                                        case 'channel_renamed':
                                            await this.client.users.fetch(packet.content.by);
                                            break;
                                    }
                                }
                            } else {
                                await this.client.users.fetch(packet.author);
                            }

                            let channel = await this.client.channels.fetch(packet.channel);
                            if (channel.channel_type === 'TextChannel') {
                                let server = await this.client.servers.fetch(channel.server_id!);
                                if (packet.author !== '00000000000000000000000000') await server.fetchMember(packet.author);
                            }

                            this.client.messages.createObj(packet, true);
                        }
                        break;
                    }

                    case "MessageUpdate": {
                        let message = this.client.messages.get(packet.id);
                        if (message) {
                            message.update(packet.data);
                            this.client.emit('message/update', message);
                        }
                        break;
                    }

                    case "MessageDelete": {
                        this.client.messages.delete(packet.id);
                        this.client.emit('message/delete', packet.id);
                        break;
                    }

                    case "ChannelCreate": {
                        runInAction(async () => {
                            if (packet.type !== 'ChannelCreate') throw 0;

                            if (packet.channel_type === 'TextChannel' || packet.channel_type === 'VoiceChannel') {
                                let server = await this.client.servers.fetch(packet.server);
                                server.channel_ids.push(packet._id);
                            }

                            this.client.channels.createObj(packet);
                        });
                        break;
                    }

                    case "ChannelUpdate": {
                        this.client.channels.get(packet.id)?.update(packet.data, packet.clear);
                        break;
                    }

                    case "ChannelDelete": {
                        this.client.channels.get(packet.id)?.delete(true);
                        break;
                    }

                    case "ChannelGroupJoin": {
                        this.client.channels.get(packet.id)?.updateGroupJoin(packet.user);
                        break;
                    }

                    case "ChannelGroupLeave": {
                        this.client.channels.get(packet.id)?.updateGroupLeave(packet.user);
                        break;
                    }

                    case "ServerUpdate": {
                        this.client.servers.get(packet.id)?.update(packet.data, packet.clear);
                        break;
                    }

                    case "ServerDelete": {
                        this.client.servers.get(packet.id)?.delete(true);
                        break;
                    }

                    case "ServerMemberUpdate": {
                        this.client.members.getKey(packet.id)?.update(packet.data, packet.clear);
                        break;
                    }

                    case "ServerMemberJoin": {
                        runInAction(async () => {
                            if (packet.type !== 'ServerMemberJoin') return 0;

                            await this.client.servers.fetch(packet.id);
                            await this.client.users.fetch(packet.user);

                            this.client.members.createObj({
                                _id: {
                                    server: packet.id,
                                    user: packet.user
                                }
                            });
                        });

                        break;
                    }

                    case "ServerMemberLeave": {
                        if (packet.user === this.client.user!._id) {
                            const server_id = packet.id
                            runInAction(() => {
                                this.client.servers.get(server_id)?.delete(true);
                                [...this.client.members.keys()]
                                    .forEach(key => {
                                        if (JSON.parse(key).server === server_id) {
                                            this.client.members.delete(key);
                                        }
                                    });
                            });
                        } else {
                            this.client.members.deleteKey({
                                server: packet.id,
                                user: packet.user
                            });
                        }

                        break;
                    }

                    case "ServerRoleUpdate": {
                        let server = this.client.servers.get(packet.id);
                        if (server) {
                            server.roles = {
                                ...server.roles,
                                [packet.role_id]: {
                                    ...server.roles?.[packet.role_id],
                                    ...packet.data
                                } as Role
                            }
                        }
                        break;
                    }

                    case "ServerRoleDelete": {
                        let server = this.client.servers.get(packet.id);
                        if (server) {
                            let { [packet.role_id]: _, ...roles } = server.roles ?? {};
                            server.roles = roles;
                        }
                        break;
                    }

                    case "UserUpdate": {
                        this.client.users.get(packet.id)?.update(packet.data, packet.clear);
                        break;
                    }

                    case "UserRelationship": {
                        let user = this.client.users.get(packet.user._id)
                        if (user) {
                            user.update({ relationship: packet.status });
                        } else {
                            this.client.users.createObj(packet.user);
                        }

                        break;
                    }

                    case "ChannelStartTyping": {
                        let channel = this.client.channels.get(packet.id);
                        let user = packet.user;

                        if (channel) {
                            channel.updateStartTyping(user);

                            clearInterval(timeouts[packet.id+user]);
                            timeouts[packet.id+user] = setTimeout(() => {
                                channel!.updateStopTyping(user);
                            }, 3000);
                        }

                        break;
                    }

                    case "ChannelStopTyping": {
                        this.client.channels.get(packet.id)?.updateStopTyping(packet.user);
                        clearInterval(timeouts[packet.id+packet.user]);
                        break;
                    }

                    case "ChannelAck": break;

                    default: console.warn(`Warning: Unhandled packet! ${packet.type}`);
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

                Object.keys(timeouts).map(k => timeouts[k]).forEach(clearTimeout);

                runInAction(() => {
                    [...this.client.users.values()].forEach(user => user.online = false);
                    [...this.client.channels.values()].forEach(channel => channel.typing_ids.clear());
                });

                if (!disallowReconnect && this.client.autoReconnect) {
                    backOff(() => this.connect(true)).catch(reject);
                }
            };
        });
    }
}
