import type { Member as MemberI, MemberCompositeKey } from 'revolt-api/types/Servers';
import type { RemoveMemberField, Route } from '../api/routes';
import type { Attachment } from 'revolt-api/types/Autumn';

import { makeAutoObservable, runInAction, action, computed } from 'mobx';
import isEqual from 'lodash.isequal';

import { Nullable, toNullable } from '../util/null';
import Collection from './Collection';
import { Client, FileArgs } from '..';

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
            if (typeof data[key] !== 'undefined' && !isEqual(this[key], data[key])) {
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

    @computed generateAvatarURL(...args: FileArgs) {
        return this.client.generateFileURL(this.avatar ?? undefined, ...args);
    }
}

export default class Members extends Collection<string, Member> {
    constructor(client: Client) {
        super(client);
        this.createObj = this.createObj.bind(this);
    }

    static toKey(id: MemberCompositeKey) {
        return JSON.stringify(id, Object.keys(id).sort())
    }

    hasKey(id: MemberCompositeKey) {
        return super.has(Members.toKey(id));
    }

    getKey(id: MemberCompositeKey) {
        return super.get(Members.toKey(id));
    }

    setKey(id: MemberCompositeKey, member: Member) {
        return super.set(Members.toKey(id), member);
    }

    deleteKey(id: MemberCompositeKey) {
        return super.delete(Members.toKey(id));
    }

    @action $get(id: MemberCompositeKey, data?: MemberI) {
        let member = this.getKey(id)!;
        if (data) member.update(data);
        return member;
    }

    /**
     * Create a member object.
     * This is meant for internal use only.
     * @param data: Member Data
     * @returns Member
     */
    createObj(data: MemberI) {
        if (this.hasKey(data._id)) return this.$get(data._id, data);

        let message = new Member(this.client, data);

        runInAction(() => {
            this.setKey(data._id, message);
        });

        return message;
    }
}
