import type { Member as MemberI, MemberCompositeKey } from 'revolt-api/types/Servers';
import type { RemoveMemberField, Route } from '../api/routes';
import type { Attachment } from 'revolt-api/types/Autumn';

import { makeAutoObservable, runInAction, action } from 'mobx';
import isEqual from 'lodash.isequal';

import { Nullable, toNullable } from '../util/null';
import Collection from './Collection';
import { Client } from '..';

export class Member {
    client: Client;

    _id: MemberCompositeKey;

    nickname: Nullable<string> = null;
    avatar: Nullable<Attachment> = null;
    roles: Nullable<string[]> = null;

    constructor(client: Client, data: MemberI) {
        this.client = client;
        this._id = data._id;

        this.nickname = toNullable(data.nickname);
        this.avatar = toNullable(data.avatar);
        this.roles = toNullable(data.roles);

        makeAutoObservable(this, {
            _id: false,
            client: false,
        });
    }

    @action update(data: Partial<MemberI>, clear?: RemoveMemberField) {
        const apply = (key: string) => {
            // This code has been tested.
            // @ts-expect-error
            if (data[key] && !isEqual(this[key], data[key])) {
                // @ts-expect-error
                this[key] = data[key];
            }
        };

        switch (clear) {
            case "Nickname":
                this.nickname = null;
                break;
            case "Avatar":
                this.avatar = null;
                break;
        }

        apply("nickname");
        apply("avatar");
        apply("roles");
    }

    /**
     * Edit a server member
     * @param data Member editing route data
     * @returns Server member object
     */
    async edit(data: Route<'PATCH', '/servers/id/members/id'>["data"]) {
        return await this.client.req('PATCH', `/servers/${this._id.server}/members/${this._id.user}` as '/servers/id/members/id', data);
    }

    /**
     * Kick server member
     * @param user_id User ID
     */
    async kick() {
        return await this.client.req('DELETE', `/servers/${this._id.server}/members/${this._id.user}` as '/servers/id/members/id');
    }
}

export default class Members extends Collection<MemberCompositeKey, Member> {
    constructor(client: Client) {
        super(client);
        this.createObj = this.createObj.bind(this);
    }

    /**
     * Create a member object.
     * This is meant for internal use only.
     * @param data: Member Data
     * @returns Member
     */
    createObj(data: MemberI) {
        if (this.has(data._id)) return this.get(data._id)!;
        let message = new Member(this.client, data);

        runInAction(() => {
            this.set(data._id, message);
        });

        return message;
    }
}
