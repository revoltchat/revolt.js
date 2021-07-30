import WebSocket from 'isomorphic-ws';
import { backOff } from 'exponential-backoff';

import { Client, SYSTEM_USER_ID } from '..';
import { ServerboundNotification, ClientboundNotification } from './notifications';
import { Session } from 'revolt-api/types/Auth';

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
                this.send({ type: 'Authenticate', ...this.client.session as Session });
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
                        this.client.user_id = this.client.session!.user_id;
                        this.client.emit('ready', packet);
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

                if (!disallowReconnect && this.client.autoReconnect) {
                    backOff(() => this.connect(true)).catch(reject);
                }
            };
        });
    }
}
