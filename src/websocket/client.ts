import WebSocket from 'isomorphic-ws';

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

    connect(): Promise<void> {
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
            const send = (notification: ServerboundNotification) => ws.send(JSON.stringify(notification));

            ws.onopen = () => {
                send({ type: 'Authenticate', ...this.client.session as Auth.Session });
            };

            ws.onmessage = async (msg) => {
                let data = msg.data;
                if (typeof data !== 'string') return;

                let packet = JSON.parse(data) as ClientboundNotification;
                switch (packet.type) {
                    case 'Error': reject(packet.error); break;
                    case 'Authenticated': this.client.emit('connected'); break;
                    case 'Ready': {
                        this.client.user = await User.fetch(this.client, packet.user._id, packet.user);

                        this.client.emit('ready');
                        resolve();
                        break;
                    }
                }
            };

            ws.onerror = (err) => {
                reject(err);
            }

            ws.onclose = () => {
                this.client.emit('dropped');
            };
        });
    }
}
