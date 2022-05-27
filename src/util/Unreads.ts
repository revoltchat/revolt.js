import { Client } from "../Client";
import {
    action,
    computed,
    makeAutoObservable,
    ObservableMap,
    runInAction,
} from "mobx";
import type { ChannelUnread } from "revolt-api";
import { ulid } from "ulid";
import { Channel } from "../maps/Channels";
import { Server } from "../maps/Servers";

export interface INotificationChecker {
    isMuted(target?: Channel | Server): boolean;
}

/**
 * Handles channel unreads.
 */
export default class Unreads {
    private client: Client;
    private loaded: boolean;
    private channels: ObservableMap<string, Omit<ChannelUnread, "_id">>;

    /**
     * Construct new Unreads store.
     */
    constructor(client: Client) {
        this.channels = new ObservableMap();
        this.loaded = false;
        makeAutoObservable(this);
        this.client = client;
    }

    /**
     * Sync unread data from the server.
     */
    async sync() {
        const unreads = await this.client.syncFetchUnreads();
        runInAction(() => {
            this.loaded = true;
            for (const unread of unreads) {
                const { _id, ...data } = unread;
                this.channels.set(_id.channel, data);
            }
        });
    }

    /**
     * Get channel unread object for a given channel.
     * @param channel_id Target channel ID
     * @returns Partial channel unread object
     */
    @computed getUnread(channel_id: string) {
        if (!this.loaded)
            return {
                last_id: "40000000000000000000000000",
            };

        return this.channels.get(channel_id);
    }

    /**
     * Mark a channel as unread by setting a custom last_id.
     * @param channel_id Target channel ID
     * @param last_id New last ID
     */
    @action markUnread(channel_id: string, last_id: string) {
        this.channels.set(channel_id, {
            ...this.getUnread(channel_id),
            last_id,
        });
    }

    /**
     * Add a mention to a channel unread.
     * @param channel_id Target channel ID
     * @param message_id Target message ID
     */
    @action markMention(channel_id: string, message_id: string) {
        const unread = this.getUnread(channel_id);
        this.channels.set(channel_id, {
            last_id: "0",
            ...unread,
            mentions: [...(unread?.mentions ?? []), message_id],
        });
    }

    /**
     * Mark a channel as read.
     * @param channel_id Target channel ID
     * @param message_id Target message ID (last sent in channel)
     * @param emit Whether to emit to server
     * @param skipRateLimiter Whether to skip the rate limiter
     */
    @action markRead(
        channel_id: string,
        message_id?: string,
        emit = false,
        skipRateLimiter = false,
    ) {
        const last_id = message_id ?? ulid();
        this.channels.set(channel_id, { last_id });

        if (emit) {
            this.client.channels.get(channel_id)?.ack(last_id, skipRateLimiter);
        }
    }

    /**
     * Mark multiple channels as read.
     * @param channel_ids Target channel IDs
     */
    @action markMultipleRead(channel_ids: string[]) {
        const last_id = ulid();
        for (const channel_id of channel_ids) {
            this.channels.set(channel_id, { last_id });
        }
    }
}
