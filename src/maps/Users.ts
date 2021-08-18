import type { BotInformation, Status, User as UserI } from 'revolt-api/types/Users';
import type { RemoveUserField, Route } from '../api/routes';
import type { Attachment } from 'revolt-api/types/Autumn';

import { makeAutoObservable, action, runInAction, computed } from 'mobx';
import isEqual from 'lodash.isequal';

import { U32_MAX, UserPermission } from '../api/permissions';
import { toNullable, Nullable } from '../util/null';
import Collection from './Collection';
import { Client, FileArgs } from '..';
import _ from 'lodash';

enum RelationshipStatus {
    None = "None",
    User = "User",
    Friend = "Friend",
    Outgoing = "Outgoing",
    Incoming = "Incoming",
    Blocked = "Blocked",
    BlockedOther = "BlockedOther"
}

export class User {
    client: Client;

    _id: string;
    username: string;

    avatar: Nullable<Attachment>;
    badges: Nullable<number>;
    status: Nullable<Status>;
    relationship: Nullable<RelationshipStatus>;
    online: Nullable<boolean>;
    flags: Nullable<number>;
    bot: Nullable<BotInformation>;

    constructor(client: Client, data: UserI) {
        this.client = client;

        this._id = data._id;
        this.username = data.username;

        this.avatar = toNullable(data.avatar);
        this.badges = toNullable(data.badges);
        this.status = toNullable(data.status);
        this.relationship = toNullable(data.relationship);
        this.online = toNullable(data.online);
        this.flags = toNullable(data.flags);
        this.bot = toNullable(data.bot);

        makeAutoObservable(this, {
            _id: false,
            client: false,
        });
    }

    @action update(data: Partial<UserI>, clear?: RemoveUserField) {
        const apply = (key: string) => {
            // This code has been tested.
            // @ts-expect-error
            if (typeof data[key] !== 'undefined' && !isEqual(this[key], data[key])) {
                // @ts-expect-error
                this[key] = data[key];

                if (key === 'relationship') {
                    this.client.emit('user/relationship', this);
                }
            }
        };

        switch (clear) {
            case "Avatar":
                this.avatar = null;
                break;
            case "StatusText": {
                if (this.status) {
                    this.status.text = undefined;
                }
            }
        }

        apply("username");
        apply("avatar");
        apply("badges");
        apply("status");
        apply("relationship");
        apply("online");
        apply("flags");
        apply("bot");
    }

    /**
     * Open a DM with a user
     * @returns DM Channel
     */
    async openDM() {
        const dm = await this.client.req('GET', `/users/${this._id}/dm` as '/users/id/dm');
        return (await this.client.channels.fetch(dm._id, dm))!;
    }

    /**
     * Send a friend request to a user
     */
    async addFriend() {
        await this.client.req('PUT', `/users/${this.username}/friend` as '/users/id/friend');
    }

    /**
     * Remove a user from the friend list
     */
    async removeFriend() {
        await this.client.req('DELETE', `/users/${this._id}/friend` as '/users/id/friend');
    }

    /**
     * Block a user
     */
    async blockUser() {
        await this.client.req('PUT', `/users/${this._id}/block` as '/users/id/block');
    }

    /**
     * Unblock a user
     */
    async unblockUser() {
        await this.client.req('DELETE', `/users/${this._id}/block` as '/users/id/block');
    }

    /**
     * Fetch the profile of a user
     * @returns The profile of the user
     */
    async fetchProfile() {
        return await this.client.req('GET', `/users/${this._id}/profile` as '/users/id/profile');
    }

    /**
     * Fetch the mutual connections of the current user and a target user
     * @returns The mutual connections of the current user and a target user
     */
    async fetchMutual() {
        return await this.client.req('GET', `/users/${this._id}/mutual` as '/users/id/mutual');
    }

    /**
     * Get the default avatar URL of a user
     */
    get defaultAvatarURL() {
        return `${this.client.apiURL}/users/${this._id}/default_avatar`;
    }

    @computed generateAvatarURL(...args: FileArgs) {
        return this.client.generateFileURL(this.avatar ?? undefined, ...args) ?? this.defaultAvatarURL;
    }

    @computed get permission() {
        let permissions = 0;
        switch (this.relationship) {
            case RelationshipStatus.Friend:
            case RelationshipStatus.User:
                return U32_MAX;
            case RelationshipStatus.Blocked:
            case RelationshipStatus.BlockedOther:
                return UserPermission.Access;
            case RelationshipStatus.Incoming:
            case RelationshipStatus.Outgoing:
                permissions = UserPermission.Access;
        }

        if ([...this.client.channels.values()].find(channel =>
            (channel.channel_type === 'Group' || channel.channel_type === 'DirectMessage')
                && channel.recipient_ids?.includes(this.client.user!._id)
        ) || [...this.client.members.values()].find(member =>
             member._id.user === this.client.user!._id
        )) {
            permissions |= UserPermission.Access | UserPermission.ViewProfile;
        }

        return permissions;
    }
}

export default class Users extends Collection<string, User> {
    constructor(client: Client) {
        super(client);
        this.createObj = this.createObj.bind(this);
        this.set('00000000000000000000000000', new User(client, {
            _id: '00000000000000000000000000',
            username: 'Revolt'
        }));
    }

    @action $get(id: string, data?: UserI) {
        let user = this.get(id)!;
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
        let res = data ?? await this.client.req('GET', `/users/${id}` as '/users/id');
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
        let user = new User(this.client, data);

        runInAction(() => {
            this.set(data._id, user);
        });

        this.client.emit('user/relationship', user);
        return user;
    }

    /**
     * Edit the current user
     * @param data User edit data object
     */
    async edit(data: Route<'PATCH', '/users/id'>["data"]) {
        await this.client.req('PATCH', '/users/id', data);
    }

    /**
     * Change the username of the current user
     * @param username New username
     * @param password Current password
     */
    async changeUsername(username: string, password: string) {
        return await this.client.req('PATCH', '/users/id/username', { username, password });
    }
}
