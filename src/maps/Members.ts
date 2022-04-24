import type {
    DataMemberEdit,
    FieldsMember,
    Member as MemberI,
    MemberCompositeKey,
    Role,
} from "revolt-api";
import type { File } from "revolt-api";

import { makeAutoObservable, runInAction, action, computed } from "mobx";
import isEqual from "lodash.isequal";

import { Nullable, toNullable } from "../util/null";
import Collection from "./Collection";
import { Client, FileArgs } from "..";

export class Member {
    client: Client;

    _id: MemberCompositeKey;

    nickname: Nullable<string> = null;
    avatar: Nullable<File> = null;
    roles: Nullable<string[]> = null;

    /**
     * Associated user.
     */
    get user() {
        return this.client.users.get(this._id.user);
    }

    /**
     * Associated server.
     */
    get server() {
        return this.client.servers.get(this._id.server);
    }

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

    @action update(data: Partial<MemberI>, clear: FieldsMember[] = []) {
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
            }
        };

        for (const field of clear) {
            switch (field) {
                case "Nickname":
                    this.nickname = null;
                    break;
                case "Avatar":
                    this.avatar = null;
                    break;
            }
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
    async edit(data: DataMemberEdit) {
        return await this.client.api.patch(
            `/servers/${this._id.server as ''}/members/${this._id.user as ''}`,
            data,
        );
    }

    /**
     * Kick server member
     * @param user_id User ID
     */
    async kick() {
        return await this.client.api.delete(
            `/servers/${this._id.server as ''}/members/${this._id.user as ''}`,
        );
    }

    @computed get orderedRoles() {
        const member_roles = new Set(this.roles);
        const server = this.server!;

        return Object.keys(server.roles ?? {})
            .filter(x => member_roles.has(x))
            .map(role_id => [role_id, server.roles![role_id]] as [ string, Role ])
            .sort(([, a], [, b]) => (b.rank || 0) - (a.rank || 0));
    }

    @computed get hoistedRole() {
        const roles = this.orderedRoles;
        if (roles.length > 0) {
            return roles[roles.length - 1];
        } else {
            return null;
        }
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
        return JSON.stringify(id, Object.keys(id).sort());
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
        const member = this.getKey(id)!;
        if (data) member.update(data);
        return member;
    }

    /**
     * Create a member object.
     * This is meant for internal use only.
     * @param data: Member Data
     * @param emit Whether to emit creation event
     * @returns Member
     */
    createObj(data: MemberI, emit?: boolean | number) {
        if (this.hasKey(data._id)) return this.$get(data._id, data);

        const member = new Member(this.client, data);

        runInAction(() => {
            this.setKey(data._id, member);
        });

        if (emit === true) this.client.emit("member/join", member);
        return member;
    }
}
