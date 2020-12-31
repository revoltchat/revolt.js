import WebSocket from 'isomorphic-ws';
import { backOff } from 'exponential-backoff';

import { Client } from '..';
import { Auth } from '../api/auth';
import { ServerboundNotification, ClientboundNotification } from './notifications';

import User from '../objects/User';

export class WebSocketClient {
    client: Client;
    ws?: WebSocket;

    constructor(client: Client) {
        this.client = client;
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

            if (typeof this.ws !== 'undefined' && this.ws.readyState === WebSocket.OPEN) {
                this.ws.close();
            }

            if (typeof this.client.session === 'undefined') {
                throw new Error("Attempted to open WebSocket without valid session.");
            }

            let ws = new WebSocket(this.client.options.wsURL);
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
                        this.client.user = await User.fetch(this.client, packet.user._id, packet.user);
                        this.client.emit('ready');
                        resolve();
                        break;
                    }
                    case 'UserRelationship': {
                        if (packet.status !== 'None' || this.client.users.has(packet.user)) {
                            let user = await User.fetch(this.client, packet.user);
                            user.relationship = packet.status;
                            this.client.emit('user/relationship_changed', user);
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
