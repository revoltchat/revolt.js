import type {
    DataEditMessage,
    DataMessageSend,
    Embed,
    Interactions,
    Masquerade,
    Message as MessageI,
    SystemMessage,
} from "revolt-api";
import type { File } from "revolt-api";

import {
    makeAutoObservable,
    runInAction,
    action,
    computed,
    ObservableMap,
    ObservableSet,
} from "mobx";
import isEqual from "lodash.isequal";

import { Nullable, toNullable, toNullableDate } from "../util/null";
import Collection from "./Collection";
import { Client } from "..";
import { decodeTime } from "ulid";

export class Message {
    client: Client;

    _id: string;
    nonce?: string;
    channel_id: string;
    author_id: string;
    webhook?: { name: string; avatar?: string };

    content: Nullable<string>;
    system: Nullable<SystemMessage>;
    attachments: Nullable<File[]>;
    edited: Nullable<Date>;
    embeds: Nullable<Embed[]>;
    mention_ids: Nullable<string[]>;
    reply_ids: Nullable<string[]>;
    masquerade: Nullable<Masquerade>;
    reactions: ObservableMap<string, ObservableSet<string>>;
    interactions: Nullable<Interactions>;

    get channel() {
        return this.client.channels.get(this.channel_id);
    }

    get author() {
        return this.client.users.get(this.author_id);
    }

    get member() {
        const channel = this.channel;
        if (channel?.channel_type === "TextChannel") {
            return this.client.members.getKey({
                server: channel.server_id!,
                user: this.author_id,
            });
        }
    }

    get mentions() {
        return this.mention_ids?.map((id) => this.client.users.get(id));
    }

    /**
     * Get timestamp when this message was created.
     */
    get createdAt() {
        return decodeTime(this._id);
    }

    /**
     * Absolute pathname to this message in the client.
     */
    get path() {
        return this.channel?.path + "/" + this._id;
    }

    /**
     * Get URL to this message.
     */
    get url() {
        return this.client.configuration?.app + this.path;
    }

    /**
     * Get the username for this message.
     */
    get username() {
        return (
            this.masquerade?.name ??
            this.webhook?.name ??
            this.member?.nickname ??
            this.author?.username
        );
    }

    /**
     * Get the role colour for this message.
     */
    get roleColour() {
        return this.masquerade?.colour ?? this.member?.roleColour;
    }

    /**
     * Get the avatar URL for this message.
     */
    get avatarURL() {
        return this.generateMasqAvatarURL() ?? this.webhook?.avatar
            ? `https://autumn.revolt.chat/avatars/${this.webhook?.avatar}`
            : this.member
            ? this.member?.avatarURL
            : this.author?.avatarURL;
    }

    /**
     * Get the animated avatar URL for this message.
     */
    get animatedAvatarURL() {
        return this.generateMasqAvatarURL() ?? this.webhook?.avatar
            ? `https://autumn.revolt.chat/avatars/${this.webhook?.avatar}`
            : this.member
            ? this.member?.animatedAvatarURL
            : this.author?.animatedAvatarURL;
    }

    @computed generateMasqAvatarURL() {
        const avatar = this.masquerade?.avatar;
        return avatar ? this.client.proxyFile(avatar) : undefined;
    }

    @computed
    get asSystemMessage() {
        const system = this.system;
        if (!system) return { type: "none" };

        const { type } = system;
        const get = (id: string) => this.client.users.get(id);
        switch (system.type) {
            case "text":
                return system;
            case "user_added":
                return { type, user: get(system.id), by: get(system.by) };
            case "user_remove":
                return { type, user: get(system.id), by: get(system.by) };
            case "user_joined":
                return { type, user: get(system.id) };
            case "user_left":
                return { type, user: get(system.id) };
            case "user_kicked":
                return { type, user: get(system.id) };
            case "user_banned":
                return { type, user: get(system.id) };
            case "channel_renamed":
                return { type, name: system.name, by: get(system.by) };
            case "channel_description_changed":
                return { type, by: get(system.by) };
            case "channel_icon_changed":
                return { type, by: get(system.by) };
            case "channel_ownership_changed":
                return { type, from: get(system.from), to: get(system.to) };
        }
    }

    constructor(client: Client, data: MessageI) {
        this.client = client;
        this._id = data._id;
        this.nonce = data.nonce ?? undefined;
        this.channel_id = data.channel;
        this.author_id = data.author;
        this.webhook = toNullable((data as any).webhook);

        this.content = toNullable(data.content);
        this.system = toNullable(data.system);
        this.attachments = toNullable(data.attachments);
        this.edited = toNullableDate(data.edited);
        this.embeds = toNullable(data.embeds);
        this.mention_ids = toNullable(data.mentions);
        this.reply_ids = toNullable(data.replies);
        this.masquerade = toNullable(data.masquerade);
        this.interactions = toNullable(data.interactions);

        this.reactions = new ObservableMap();
        for (const reaction of Object.keys(data.reactions ?? {})) {
            this.reactions.set(
                reaction,
                new ObservableSet(data.reactions![reaction]),
            );
        }

        makeAutoObservable(this, {
            _id: false,
            client: false,
        });
    }

    @action update(data: Partial<MessageI>) {
        const apply = (
            key: string,
            target?: string,
            transform?: (obj: unknown) => unknown,
        ) => {
            // This code has been tested.
            if (
                // @ts-expect-error TODO: clean up types here
                typeof data[key] !== "undefined" &&
                // @ts-expect-error TODO: clean up types here
                !isEqual(this[target ?? key], data[key])
            ) {
                // @ts-expect-error TODO: clean up types here
                this[target ?? key] = transform
                    ? // @ts-expect-error TODO: clean up types here
                      transform(data[key])
                    : // @ts-expect-error TODO: clean up types here
                      data[key];
            }
        };

        apply("webhook");
        apply("content");
        apply("attachments");
        apply("edited", undefined, toNullableDate as (obj: unknown) => unknown);
        apply("embeds");
        apply("mentions", "mention_ids");
        apply("masquerade");
        apply("reactions", undefined, (reactions) => {
            const v = reactions as Record<string, string[]>;
            const newMap = new ObservableMap();
            for (const reaction of Object.keys(v)) {
                this.reactions.set(
                    reaction,
                    new ObservableSet(data.reactions![reaction]),
                );
            }

            return newMap;
        });
        apply("interactions");
    }

    @action append({ embeds }: Pick<Partial<MessageI>, "embeds">) {
        if (embeds) {
            this.embeds = [...(this.embeds ?? []), ...embeds];
        }
    }

    /**
     * Edit a message
     * @param data Message edit route data
     */
    async edit(data: DataEditMessage) {
        return await this.client.api.patch(
            `/channels/${this.channel_id as ""}/messages/${this._id as ""}`,
            data,
        );
    }

    /**
     * Delete a message
     */
    async delete() {
        return await this.client.api.delete(
            `/channels/${this.channel_id as ""}/messages/${this._id as ""}`,
        );
    }

    /**
     * Acknowledge this message as read
     */
    ack() {
        this.channel?.ack(this);
    }

    /**
     * Reply to Message
     */
    reply(
        data:
            | string
            | (Omit<DataMessageSend, "nonce"> & {
                  nonce?: string;
              }),
        mention = true,
    ) {
        const obj = typeof data === "string" ? { content: data } : data;
        return this.channel?.sendMessage({
            ...obj,
            replies: [{ id: this._id, mention }],
        });
    }

    /**
     * Clear all reactions from this message
     */
    async clearReactions() {
        return await this.client.api.delete(
            `/channels/${this.channel_id as ""}/messages/${
                this._id as ""
            }/reactions`,
        );
    }

    /**
     * React to a message
     * @param emoji Unicode or emoji ID
     */
    async react(emoji: string) {
        return await this.client.api.put(
            `/channels/${this.channel_id as ""}/messages/${
                this._id as ""
            }/reactions/${emoji as ""}`,
        );
    }

    /**
     * Unreact from a message
     * @param emoji Unicode or emoji ID
     */
    async unreact(emoji: string) {
        return await this.client.api.delete(
            `/channels/${this.channel_id as ""}/messages/${
                this._id as ""
            }/reactions/${emoji as ""}`,
        );
    }
}

export default class Messages extends Collection<string, Message> {
    constructor(client: Client) {
        super(client);
        this.createObj = this.createObj.bind(this);
    }

    @action $get(id: string, data?: MessageI) {
        const msg = this.get(id)!;
        if (data) msg.update(data);
        return msg;
    }

    /**
     * Create a message object.
     * This is meant for internal use only.
     * @param data Message Data
     * @param emit Whether to emit creation event
     * @returns Message
     */
    createObj(data: MessageI, emit?: boolean | number) {
        if (this.has(data._id)) return this.$get(data._id);
        const message = new Message(this.client, data);

        runInAction(() => {
            this.set(data._id, message);
        });

        if (emit === true) this.client.emit("message", message);
        return message;
    }
}
