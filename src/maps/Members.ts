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

import { Nullable, toNullable, toNullableDate } from "../util/null";
import Collection from "./Collection";
import { Channel, Client, FileArgs, Server } from "..";
import { bitwiseAndEq, calculatePermission } from "../permissions/calculator";
import { Permission } from "../permissions/definitions";

export class Member {
    client: Client;

    _id: MemberCompositeKey;
    joined_at: Date;

    nickname: Nullable<string> = null;
    avatar: Nullable<File> = null;
    roles: Nullable<string[]> = null;
    timeout: Nullable<Date> = null;

    private _timeout: number | undefined;

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

    /**
     * Whether the client has a higher rank than this member.
     */
    get inferior() {
        return (this.server?.member?.ranking ?? Infinity) < this.ranking;
    }

    /**
     * Whether the client can kick this user.
     */
    get kickable() {
        return this.server?.havePermission("KickMembers") && this.inferior;
    }

    /**
     * Whether the client can ban this user.
     */
    get bannable() {
        return this.server?.havePermission("BanMembers") && this.inferior;
    }

    constructor(client: Client, data: MemberI) {
        this.client = client;
        this._id = data._id;
        this.joined_at = new Date(data.joined_at);

        this.nickname = toNullable(data.nickname);
        this.avatar = toNullable(data.avatar);
        this.roles = toNullable(data.roles);
        this.timeout = toNullableDate(data.timeout);

        this.scheduleTimeout();

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
                this[key] =
                    // @ts-expect-error TODO: clean up types here
                    key === "timeout" ? toNullableDate(data[key]) : data[key];
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
                case "Roles":
                    this.roles = [];
                    break;
                case "Timeout":
                    this.timeout = null;
                    break;
            }
        }

        apply("nickname");
        apply("avatar");
        apply("roles");
        apply("timeout");

        this.scheduleTimeout();
    }

    /**
     * Schedule timeout revocation
     */
    private scheduleTimeout() {
        delete this._timeout;
        clearTimeout(this._timeout);

        if (this.timeout) {
            const offset = +this.timeout - +new Date();
            if (offset > 0) {
                this._timeout = setTimeout(() => {
                    runInAction(() => {
                        this.timeout = null;
                        delete this._timeout;
                    });
                }, offset) as unknown as number;
            } else {
                runInAction(() => {
                    this.timeout = null;
                });
            }
        }
    }

    /**
     * Edit a server member
     * @param data Member editing route data
     * @returns Server member object
     */
    async edit(data: DataMemberEdit) {
        return await this.client.api.patch(
            `/servers/${this._id.server as ""}/members/${this._id.user as ""}`,
            data,
        );
    }

    /**
     * Kick server member
     * @param user_id User ID
     */
    async kick() {
        return await this.client.api.delete(
            `/servers/${this._id.server as ""}/members/${this._id.user as ""}`,
        );
    }

    /**
     * Get an ordered list of roles for this member, from lowest to highest priority.
     */
    @computed get orderedRoles() {
        const member_roles = new Set(this.roles);
        const server = this.server!;

        return Object.keys(server.roles ?? {})
            .filter((x) => member_roles.has(x))
            .map(
                (role_id) =>
                    [role_id, server.roles![role_id]] as [string, Role],
            )
            .sort(([, a], [, b]) => b.rank! - a.rank!);
    }

    /**
     * Get this member's currently hoisted role.
     */
    @computed get hoistedRole() {
        const roles = this.orderedRoles.filter((x) => x[1].hoist);
        if (roles.length > 0) {
            const [id, role] = roles[roles.length - 1];
            return {
                id,
                ...role
            }
        } else {
            return null;
        }
    }

    /**
     * Get this member's current role colour.
     */
    @computed get roleColour() {
        const roles = this.orderedRoles.filter((x) => x[1].colour);
        if (roles.length > 0) {
            return roles[roles.length - 1][1].colour;
        } else {
            return null;
        }
    }

    /**
     * Get this member's ranking.
     * Smaller values are ranked as higher priotity.
     */
    @computed get ranking() {
        if (this._id.user === this.server?.owner) {
            return -Infinity;
        }

        const roles = this.orderedRoles;
        if (roles.length > 0) {
            return roles[roles.length - 1][1].rank!;
        } else {
            return Infinity;
        }
    }

    /**
     * Get a pre-configured avatar URL of a member
     */
    get avatarURL() {
        return this.generateAvatarURL({ max_side: 256 }) ?? this.user?.avatarURL;
    }

    /**
     * Get a pre-configured animated avatar URL of a member
     */
    get animatedAvatarURL() {
        return this.generateAvatarURL({ max_side: 256 }, true) ?? this.user?.animatedAvatarURL;
    }

    /**
     * Generate URL to this member's avatar
     * @param args File parameters
     * @returns File URL
     */
    @computed generateAvatarURL(...args: FileArgs) {
        return this.client.generateFileURL(this.avatar ?? undefined, ...args);
    }

    /**
     * Get the permissions that this member has against a certain object
     * @param target Target object to check permissions against
     * @returns Permissions that this member has
     */
    @computed getPermissions(target: Server | Channel) {
        return calculatePermission(target, { member: this });
    }

    /**
     * Check whether a member has a certain permission against a certain object
     * @param target Target object to check permissions against
     * @param permission Permission names to check for
     * @returns Whether the member has this permission
     */
    @computed hasPermission(
        target: Server | Channel,
        ...permission: (keyof typeof Permission)[]
    ) {
        return bitwiseAndEq(
            this.getPermissions(target),
            ...permission.map((x) => Permission[x]),
        );
    }

    /**
     * Checks whether the target member has a higher rank than this member.
     * @param target The member to compare against
     * @returns Whether this member is inferior to the target
     */
    @computed inferiorTo(target: Member) {
        return target.ranking < this.ranking;
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
