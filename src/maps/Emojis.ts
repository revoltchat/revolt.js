import type { Emoji as EmojiI, EmojiParent } from "revolt-api";

import { makeAutoObservable, runInAction } from "mobx";

import Collection from "./Collection";
import { Client } from "..";
import { decodeTime } from "ulid";

export class Emoji {
    client: Client;

    _id: string;
    name: string;
    creator_id: string;
    parent: EmojiParent;
    animated: boolean;
    nsfw: boolean;

    /**
     * Get timestamp when this message was created.
     */
    get createdAt() {
        return decodeTime(this._id);
    }

    /**
     * Get creator of this emoji.
     */
    get creator() {
        return this.client.users.get(this.creator_id);
    }

    constructor(client: Client, data: EmojiI) {
        this.client = client;
        this._id = data._id;

        this.name = data.name;
        this.creator_id = data.creator_id;
        this.parent = data.parent;
        this.animated = data.animated ?? false;
        this.nsfw = data.nsfw ?? false;

        makeAutoObservable(this, {
            _id: false,
            client: false,
        });
    }

    /**
     * Delete a message
     */
    async delete() {
        return await this.client.api.delete(`/custom/emoji/${this._id as ""}`);
    }

    /**
     * Generate emoji URL
     */
    get imageURL() {
        return `${this.client.configuration?.features.autumn.url}/emojis/${
            this._id
        }${this.animated ? "" : "?max_side=128"}`;
    }
}

export default class Emojis extends Collection<string, Emoji> {
    constructor(client: Client) {
        super(client);
        this.createObj = this.createObj.bind(this);
    }

    /**
     * Create an emoji object.
     * This is meant for internal use only.
     * @param data Emoji Data
     * @param emit Whether to emit creation event
     * @returns Emoji
     */
    createObj(data: EmojiI, emit?: boolean | number) {
        if (this.has(data._id)) return this.get(data._id)!;
        const emoji = new Emoji(this.client, data);

        runInAction(() => {
            this.set(data._id, emoji);
        });

        if (emit === true) this.client.emit("emoji/create", emoji);
        return emoji;
    }
}
