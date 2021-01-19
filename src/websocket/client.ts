import WebSocket from 'isomorphic-ws';
import { backOff } from 'exponential-backoff';

import { Channel, Client } from '..';
import { Auth } from '../api/auth';
import { ServerboundNotification, ClientboundNotification } from './notifications';

import User from '../objects/User';
import { Relationship } from '../api/users';

export class WebSocketClient {
    client: Client;
    ws?: WebSocket;

    constructor(client: Client) {
        this.client = client;
    }

    disconnect() {
        if (typeof this.ws !== 'undefined' && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
        }
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
            const send = (notification: ServerboundNotification) => {
                let data = JSON.stringify(notification);
                if (this.client.options.debug) console.debug('[<] PACKET', data);
                ws.send(data)
            };

            ws.onopen = () => {
                send({ type: 'Authenticate', ...this.client.session as Auth.Session });
            };

            ws.onmessage = async (msg) => {
                let data = msg.data;
                if (typeof data !== 'string') return;

                if (this.client.options.debug) console.debug('[>] PACKET', data);
                let packet = JSON.parse(data) as ClientboundNotification;
                switch (packet.type) {
                    case 'Error': {
                        reject(packet.error);
                        break;
                    }
                    case 'Authenticated': {
                        disallowReconnect = false;
                        this.client.emit('connected');
                        break;
                    }
                    case 'Ready': {
                        for (let user of packet.users) {
                            await User.fetch(this.client, user._id, user);
                        }

                        // INFO:
                        // Our user object should be included in this
                        // payload so we can just take it out of the map.
                        let user = this.client.users.get(this.client.session?.user_id as string) as User;
                        user.relationship = Relationship.User;
                        this.client.user = user;

                        for (let channel of packet.channels) {
                            await Channel.fetch(this.client, channel._id, channel);
                        }

                        this.client.emit('ready');
                        resolve();
                        break;
                    }
                    case 'UserRelationship': {
                        if (packet.status !== Relationship.None || this.client.users.has(packet.user)) {
                            let user = await User.fetch(this.client, packet.user);
                            let relationship = packet.status;
                            user.relationship = relationship;
                            this.client.emit('user/relationship_changed', user);
                            this.client.emit('mutation/user', user, { relationship });
                        }
                        break;
                    }
                    case 'UserPresence': {
                        if (this.client.users.has(packet.id)) {
                            let user = await User.fetch(this.client, packet.id);
                            let online = packet.online;
                            user.online = online;
                            this.client.emit('user/status_changed', user);
                            this.client.emit('mutation/user', user, { online });
                        }
                        break;
                    }
                }
            };

            ws.onerror = (err) => {
                reject(err);
            }

            ws.onclose = () => {
                this.client.emit('dropped');
                if (!disallowReconnect && this.client.options.autoReconnect) {
                    backOff(() => this.connect(true)).catch(reject);
                }
            };
        });
    }
}
