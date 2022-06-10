import type {
    BotInformation,
    UserStatus,
    User as UserI,
    RelationshipStatus,
    FieldsUser,
    DataEditUser,
} from "revolt-api";
import type { File } from "revolt-api";

import { makeAutoObservable, action, runInAction, computed } from "mobx";
import isEqual from "lodash.isequal";

import { U32_MAX, UserPermission } from "../permissions/definitions";
import { toNullable, Nullable } from "../util/null";
import Collection from "./Collection";
import { Client, FileArgs } from "..";
import _ from "lodash";
import { decodeTime } from "ulid";

export class User {
    client: Client;

    _id: string;
    username: string;

    avatar: Nullable<File>;
    badges: Nullable<number>;
    status: Nullable<UserStatus>;
    relationship: Nullable<RelationshipStatus>;
    online: boolean;
    privileged: boolean;
    flags: Nullable<number>;
    bot: Nullable<BotInformation>;

    /**
     * Get timestamp when this user was created.
     */
    get createdAt() {
        return decodeTime(this._id);
    }

    constructor(client: Client, data: UserI) {
        this.client = client;

        this._id = data._id;
        this.username = data.username;

        this.avatar = toNullable(data.avatar);
        this.badges = toNullable(data.badges);
        this.status = toNullable(data.status);
        this.relationship = toNullable(data.relationship);
        this.online = data.online ?? false;
        this.privileged = data.privileged ?? false;
        this.flags = toNullable(data.flags);
        this.bot = toNullable(data.bot);

        makeAutoObservable(this, {
            _id: false,
            client: false,
        });
    }

    @action update(data: Partial<UserI>, clear: FieldsUser[] = []) {
        const apply = (key: string) => {
            // This code has been tested.
            if (
                // @ts-expect-error TODO: clean up types here
                typeof data[key] !== "undefined" &&
                // @ts-expect-error TODO: clean up types here
                !isEqual(this[key], data[key])
            ) {
                // @ts-expect-error TODO: clean up types here
                this[key] = data[key];

                if (key === "relationship") {
                    this.client.emit("user/relationship", this);
                }
            }
        };

        for (const entry of clear) {
            switch (entry) {
                case "Avatar":
                    this.avatar = null;
                    break;
                case "StatusText": {
                    if (this.status) {
                        this.status.text = undefined;
                    }
                }
            }
        }

        apply("username");
        apply("avatar");
        apply("badges");
        apply("status");
        apply("relationship");
        apply("online");
        apply("privileged");
        apply("flags");
        apply("bot");
    }

    /**
     * Open a DM with a user
     * @returns DM Channel
     */
    async openDM() {
        let dm = [...this.client.channels.values()].find(
            (x) => x.channel_type === "DirectMessage" && x.recipient == this,
        );

        if (!dm) {
            const data = await this.client.api.get(
                `/users/${this._id as ""}/dm`,
            );
            dm = await this.client.channels.fetch(data._id, data)!;
        }

        runInAction(() => {
            dm!.active = true;
        });

        return dm;
    }

    /**
     * Send a friend request to a user
     */
    async addFriend() {
        return await this.client.api.post(`/users/friend`, {
            username: this.username,
        });
    }

    /**
     * Remove a user from the friend list
     */
    async removeFriend() {
        return await this.client.api.delete(`/users/${this._id as ""}/friend`);
    }

    /**
     * Block a user
     */
    async blockUser() {
        return await this.client.api.put(`/users/${this._id as ""}/block`);
    }

    /**
     * Unblock a user
     */
    async unblockUser() {
        return await this.client.api.delete(`/users/${this._id as ""}/block`);
    }

    /**
     * Fetch the profile of a user
     * @returns The profile of the user
     */
    async fetchProfile() {
        return await this.client.api.get(`/users/${this._id as ""}/profile`);
    }

    /**
     * Fetch the mutual connections of the current user and a target user
     * @returns The mutual connections of the current user and a target user
     */
    async fetchMutual() {
        return await this.client.api.get(`/users/${this._id as ""}/mutual`);
    }

    /**
     * Get the default avatar URL of a user
     */
    get defaultAvatarURL() {
        return `${this.client.apiURL}/users/${this._id}/default_avatar`;
    }

    @computed generateAvatarURL(...args: FileArgs) {
        return (
            this.client.generateFileURL(this.avatar ?? undefined, ...args) ??
            this.defaultAvatarURL
        );
    }

    @computed get permission() {
        let permissions = 0;
        switch (this.relationship) {
            case "Friend":
            case "User":
                return U32_MAX;
            case "Blocked":
            case "BlockedOther":
                return UserPermission.Access;
            case "Incoming":
            case "Outgoing":
                permissions = UserPermission.Access;
        }

        if (
            [...this.client.channels.values()].find(
                (channel) =>
                    (channel.channel_type === "Group" ||
                        channel.channel_type === "DirectMessage") &&
                    channel.recipient_ids?.includes(this.client.user!._id),
            ) ||
            [...this.client.members.values()].find(
                (member) => member._id.user === this.client.user!._id,
            )
        ) {
            if (this.client.user?.bot || this.bot) {
                permissions |= UserPermission.SendMessage;
            }

            permissions |= UserPermission.Access | UserPermission.ViewProfile;
        }

        return permissions;
    }
}

export default class Users extends Collection<string, User> {
    constructor(client: Client) {
        super(client);
        this.createObj = this.createObj.bind(this);
        this.set(
            "00000000000000000000000000",
            new User(client, {
                _id: "00000000000000000000000000",
                username: "Revolt",
            }),
        );
    }

    @action $get(id: string, data?: UserI) {
        const user = this.get(id)!;
        if (data) user.update(data);
        return user;
    }

    /**
     * Fetch a user
     * @param id User ID
     * @returns User
     */
    async fetch(id: string, data?: UserI) {
        if (this.has(id)) return this.$get(id, data);
        const res = data ?? (await this.client.api.get(`/users/${id as ""}`));

        return this.createObj(res);
    }

    /**
     * Create a user object.
     * This is meant for internal use only.
     * @param data: User Data
     * @returns User
     */
    createObj(data: UserI) {
        if (this.has(data._id)) return this.$get(data._id, data);
        const user = new User(this.client, data);

        runInAction(() => {
            this.set(data._id, user);
        });

        this.client.emit("user/relationship", user);
        return user;
    }

    /**
     * Edit the current user
     * @param data User edit data object
     */
    async edit(data: DataEditUser) {
        await this.client.api.patch("/users/@me", data);
    }

    /**
     * Change the username of the current user
     * @param username New username
     * @param password Current password
     */
    async changeUsername(username: string, password: string) {
        return await this.client.api.patch("/users/@me/username", {
            username,
            password,
        });
    }
}
