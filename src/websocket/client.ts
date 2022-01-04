import { backOff } from "@insertish/exponential-backoff";
import WebSocket from "@insertish/isomorphic-ws";
import { runInAction } from "mobx";
import { Role } from "revolt-api/types/Servers";

import { Client } from "..";
import {
    ServerboundNotification,
    ClientboundNotification,
} from "./notifications";

export class WebSocketClient {
    client: Client;
    ws?: WebSocket;

    heartbeat?: number;
    connected: boolean;
    ready: boolean;

    ping?: number;

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

        if (
            typeof this.ws !== "undefined" &&
            this.ws.readyState === WebSocket.OPEN
        ) {
            this.ws.close();
        }
    }

    /**
     * Send a notification
     * @param notification Serverbound notification
     */
    send(notification: ServerboundNotification) {
        if (
            typeof this.ws === "undefined" ||
            this.ws.readyState !== WebSocket.OPEN
        )
            return;

        const data = JSON.stringify(notification);
        if (this.client.debug) console.debug("[<] PACKET", data);
        this.ws.send(data);
    }

    /**
     * Connect the WebSocket
     * @param disallowReconnect Whether to disallow reconnection
     */
    connect(disallowReconnect?: boolean): Promise<void> {
        this.client.emit("connecting");

        return new Promise((resolve, $reject) => {
            let thrown = false;
            const reject = (err: unknown) => {
                if (!thrown) {
                    thrown = true;
                    $reject(err);
                }
            };

            this.disconnect();

            if (typeof this.client.configuration === "undefined") {
                throw new Error(
                    "Attempted to open WebSocket without syncing configuration from server.",
                );
            }

            if (typeof this.client.session === "undefined") {
                throw new Error(
                    "Attempted to open WebSocket without valid session.",
                );
            }

            const ws = new WebSocket(this.client.configuration.ws);
            this.ws = ws;

            ws.onopen = () => {
                if (typeof this.client.session === "string") {
                    this.send({
                        type: "Authenticate",
                        token: this.client.session!,
                    });
                } else {
                    this.send({
                        type: "Authenticate",
                        ...this.client.session!,
                    });
                }
            };

            const timeouts: Record<string, number> = {};
            const handle = async (msg: WebSocket.MessageEvent) => {
                const data = msg.data;
                if (typeof data !== "string") return;

                if (this.client.debug) console.debug("[>] PACKET", data);
                const packet = JSON.parse(data) as ClientboundNotification;
                this.client.emit("packet", packet);
                try {
                    switch (packet.type) {
                        case "Error": {
                            reject(packet.error);
                            break;
                        }

                        case "Authenticated": {
                            disallowReconnect = false;
                            this.client.emit("connected");
                            this.connected = true;
                            break;
                        }

                        case "Ready": {
                            runInAction(() => {
                                if (packet.type !== "Ready") throw 0;

                                for (const user of packet.users) {
                                    this.client.users.createObj(user);
                                }

                                for (const channel of packet.channels) {
                                    this.client.channels.createObj(channel);
                                }

                                for (const server of packet.servers) {
                                    this.client.servers.createObj(server);
                                }

                                for (const member of packet.members) {
                                    this.client.members.createObj(member);
                                }
                            });

                            this.client.user = this.client.users.get(
                                packet.users.find((x) => x.relationship === "User")!
                                    ._id,
                            )!;

                            this.client.emit("ready");
                            this.ready = true;
                            resolve();

                            // Sync unreads.
                            this.client.unreads?.sync();

                            // Setup heartbeat.
                            if (this.client.heartbeat > 0) {
                                this.send({ type: "Ping", data: +new Date() });
                                this.heartbeat = setInterval(() => {
                                    this.send({
                                        type: "Ping",
                                        data: +new Date(),
                                    });

                                    if (this.client.options.pongTimeout) {
                                        let pongReceived = false;

                                        this.client.once("packet", (p) => {
                                            if (p.type == "Pong")
                                                pongReceived = true;
                                        });

                                        setTimeout(() => {
                                            if (!pongReceived) {
                                                if (
                                                    this.client.options
                                                        .onPongTimeout == "EXIT"
                                                ) {
                                                    throw "Client did not receive a pong in time";
                                                } else {
                                                    console.warn(
                                                        "Warning: Client did not receive a pong in time; Reconnecting.",
                                                    );

                                                    this.disconnect();
                                                    this.connect(disallowReconnect);
                                                }
                                            }
                                        }, this.client.options.pongTimeout * 1000);
                                    }
                                }, this.client.heartbeat * 1e3) as unknown as number;
                            }

                            break;
                        }

                        case "Message": {
                            if (!this.client.messages.has(packet._id)) {
                                if (
                                    packet.author ===
                                    "00000000000000000000000000"
                                ) {
                                    if (typeof packet.content === "object") {
                                        switch (packet.content.type) {
                                            case "user_added":
                                            case "user_remove":
                                                await this.client.users.fetch(
                                                    packet.content.by,
                                                );
                                                break;
                                            case "user_joined":
                                                await this.client.users.fetch(
                                                    packet.content.id,
                                                );
                                                break;
                                            case "channel_description_changed":
                                            case "channel_icon_changed":
                                            case "channel_renamed":
                                                await this.client.users.fetch(
                                                    packet.content.by,
                                                );
                                                break;
                                        }
                                    }
                                } else {
                                    await this.client.users.fetch(packet.author);
                                }

                                const channel = await this.client.channels.fetch(
                                    packet.channel,
                                );

                                if (channel.channel_type === "TextChannel") {
                                    const server = await this.client.servers.fetch(
                                        channel.server_id!,
                                    );
                                    if (
                                        packet.author !==
                                        "00000000000000000000000000"
                                    )
                                        await server.fetchMember(packet.author);
                                }

                                const message = this.client.messages.createObj(packet, true);

                                runInAction(() => {
                                    if (channel.channel_type === "DirectMessage") {
                                        channel.active = true;
                                    }

                                    channel.last_message_id = message._id;

                                    if (this.client.unreads &&
                                        message.mention_ids?.includes(this.client.user!._id)) {
                                        this.client.unreads.markMention(message.channel_id, message._id);
                                    }
                                });
                            }
                            break;
                        }

                        case "MessageUpdate": {
                            const message = this.client.messages.get(packet.id);
                            if (message) {
                                message.update(packet.data);
                                this.client.emit("message/update", message);
                            }
                            break;
                        }

                        case "MessageDelete": {
                            this.client.messages.delete(packet.id);
                            this.client.emit("message/delete", packet.id);
                            break;
                        }

                        case "ChannelCreate": {
                            runInAction(async () => {
                                if (packet.type !== "ChannelCreate") throw 0;

                                if (
                                    packet.channel_type === "TextChannel" ||
                                    packet.channel_type === "VoiceChannel"
                                ) {
                                    const server = await this.client.servers.fetch(
                                        packet.server,
                                    );
                                    server.channel_ids.push(packet._id);
                                }

                                this.client.channels.createObj(packet, true);
                            });
                            break;
                        }

                        case "ChannelUpdate": {
                            const channel = this.client.channels.get(packet.id);
                            if (channel) {
                                channel.update(packet.data, packet.clear);
                                this.client.emit("channel/update", channel);
                            }
                            break;
                        }

                        case "ChannelDelete": {
                            this.client.channels.get(packet.id)?.delete(true);
                            this.client.emit("channel/delete", packet.id);
                            break;
                        }

                        case "ChannelGroupJoin": {
                            this.client.channels
                                .get(packet.id)
                                ?.updateGroupJoin(packet.user);
                            break;
                        }

                        case "ChannelGroupLeave": {
                            this.client.channels
                                .get(packet.id)
                                ?.updateGroupLeave(packet.user);
                            break;
                        }

                        case "ServerUpdate": {
                            const server = this.client.servers.get(packet.id);
                            if (server) {
                                server.update(packet.data, packet.clear);
                                this.client.emit("server/update", server);
                            }
                            break;
                        }

                        case "ServerDelete": {
                            this.client.servers.get(packet.id)?.delete(true);
                            this.client.emit("server/delete", packet.id);
                            break;
                        }

                        case "ServerMemberUpdate": {
                            const member = this.client.members.getKey(packet.id);
                            if (member) {
                                member.update(packet.data, packet.clear);
                                this.client.emit("member/update", member);
                            }
                            break;
                        }

                        case "ServerMemberJoin": {
                            runInAction(async () => {
                                if (packet.type !== "ServerMemberJoin") return 0;

                                await this.client.servers.fetch(packet.id);
                                await this.client.users.fetch(packet.user);

                                this.client.members.createObj(
                                    {
                                        _id: {
                                            server: packet.id,
                                            user: packet.user,
                                        },
                                    },
                                    true,
                                );
                            });

                            break;
                        }

                        case "ServerMemberLeave": {
                            if (packet.user === this.client.user!._id) {
                                const server_id = packet.id;
                                runInAction(() => {
                                    this.client.servers
                                        .get(server_id)
                                        ?.delete(true);
                                    [...this.client.members.keys()].forEach(
                                        (key) => {
                                            if (
                                                JSON.parse(key).server === server_id
                                            ) {
                                                this.client.members.delete(key);
                                            }
                                        },
                                    );
                                });
                            } else {
                                this.client.members.deleteKey({
                                    server: packet.id,
                                    user: packet.user,
                                });
                                this.client.emit("member/leave", {
                                    server: packet.id,
                                    user: packet.user,
                                });
                            }

                            break;
                        }

                        case "ServerRoleUpdate": {
                            const server = this.client.servers.get(packet.id);
                            if (server) {
                                const role = {
                                    ...server.roles?.[packet.role_id],
                                    ...packet.data,
                                } as Role;
                                server.roles = {
                                    ...server.roles,
                                    [packet.role_id]: role,
                                };
                                this.client.emit(
                                    "role/update",
                                    packet.role_id,
                                    role,
                                    packet.id,
                                );
                            }
                            break;
                        }

                        case "ServerRoleDelete": {
                            const server = this.client.servers.get(packet.id);
                            if (server) {
                                const { [packet.role_id]: _, ...roles } =
                                    server.roles ?? {};
                                server.roles = roles;
                                this.client.emit(
                                    "role/delete",
                                    packet.role_id,
                                    packet.id,
                                );
                            }
                            break;
                        }

                        case "UserUpdate": {
                            this.client.users
                                .get(packet.id)
                                ?.update(packet.data, packet.clear);
                            break;
                        }

                        case "UserRelationship": {
                            const user = this.client.users.get(packet.user._id);
                            if (user) {
                                user.update({ relationship: packet.status });
                            } else {
                                this.client.users.createObj(packet.user);
                            }

                            break;
                        }

                        case "ChannelStartTyping": {
                            const channel = this.client.channels.get(packet.id);
                            const user = packet.user;

                            if (channel) {
                                channel.updateStartTyping(user);

                                clearInterval(timeouts[packet.id + user]);
                                timeouts[packet.id + user] = setTimeout(() => {
                                    channel!.updateStopTyping(user);
                                }, 3000) as unknown as number;
                            }

                            break;
                        }

                        case "ChannelStopTyping": {
                            this.client.channels
                                .get(packet.id)
                                ?.updateStopTyping(packet.user);
                            clearInterval(timeouts[packet.id + packet.user]);
                            break;
                        }

                        case "ChannelAck": {
                            this.client.unreads?.markRead(
                                packet.id,
                                packet.message_id,
                            );
                            break;
                        }

                        case "Pong": {
                            this.ping = +new Date() - packet.data;
                            break;
                        }

                        default:
                            this.client.debug &&
                                console.warn(
                                    `Warning: Unhandled packet! ${packet.type}`,
                                );
                    }
                } catch(e) {
                    console.error(e);
                }
            };

            let processing = false;
            const queue: WebSocket.MessageEvent[] = [];
            ws.onmessage = async (data) => {
                queue.push(data);

                if (!processing) {
                    processing = true;
                    while (queue.length > 0) {
                        await handle(queue.shift()!);
                    }
                    processing = false;
                }
            };

            ws.onerror = (err) => {
                reject(err);
            };

            ws.onclose = () => {
                this.client.emit("dropped");
                this.connected = false;
                this.ready = false;

                Object.keys(timeouts)
                    .map((k) => timeouts[k])
                    .forEach(clearTimeout);

                runInAction(() => {
                    [...this.client.users.values()].forEach(
                        (user) => (user.online = false),
                    );
                    [...this.client.channels.values()].forEach((channel) =>
                        channel.typing_ids.clear(),
                    );
                });

                if (!disallowReconnect && this.client.autoReconnect) {
                    backOff(() => this.connect(true)).catch(reject);
                }
            };
        });
    }
}
